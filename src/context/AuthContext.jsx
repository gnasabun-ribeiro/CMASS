import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { ROL_POR_DEFECTO, puede } from "../data/permisos.js";

const AuthContext = createContext(null);

// El rol se guarda en el dispositivo para que, sin conexión, la app siga mostrando lo mismo.
const claveRol = (userId) => `cmass:rol:${userId}`;
const leerRolGuardado = (userId) => {
  try {
    return localStorage.getItem(claveRol(userId));
  } catch {
    return null;
  }
};

export function nombreFromEmail(email) {
  const local = (email || "tecnico").split("@")[0];
  const nombre = local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
  return nombre || "Técnico";
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [perfilListo, setPerfilListo] = useState(false);
  const [recuperando, setRecuperando] = useState(false); // entró con el enlace de "Olvidé mi contraseña"

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((evento, nextSession) => {
      setSession(nextSession);
      if (evento === "PASSWORD_RECOVERY") setRecuperando(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) {
      setProfile(null);
      setPerfilListo(false);
      return;
    }
    setPerfilListo(false);
    let cancelled = false;
    // Hasta que llegue el perfil, vale el último rol conocido de este dispositivo.
    const guardado = leerRolGuardado(userId);
    if (guardado) setProfile((p) => p ?? { rol: guardado, activo: true, soloRolGuardado: true });

    const cargar = async () => {
      let { data, error } = await supabase.from("profiles").select("nombre, rol, activo").eq("id", userId).maybeSingle();
      // Antes de ejecutar supabase/roles_y_permisos.sql no existen rol/activo: se sigue sin roles.
      if (error) ({ data } = await supabase.from("profiles").select("nombre").eq("id", userId).maybeSingle());
      if (cancelled) return;
      // Sin conexión no llega nada: se conserva el último rol conocido en vez de borrarlo.
      if (data) setProfile(data);
      setPerfilListo(true);
      if (data?.rol) {
        try {
          localStorage.setItem(claveRol(userId), data.rol);
        } catch {
          /* sin almacenamiento: no pasa nada */
        }
      }
      // Usuario dado de baja: se cierra la sesión.
      if (data?.activo === false) supabase.auth.signOut();
    };
    cargar().catch(() => !cancelled && setPerfilListo(true));
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const value = useMemo(() => {
    const email = session?.user?.email || "";
    const rol = profile?.rol || ROL_POR_DEFECTO;
    return {
      email,
      userId: session?.user?.id || null,
      isAuthenticated: Boolean(session),
      loading,
      nombre: profile?.nombre || nombreFromEmail(email),
      rol,
      // false hasta que se sabe el rol (de la base o del último guardado en el dispositivo)
      rolListo: perfilListo || Boolean(profile?.rol),
      puede: (accion) => puede(rol, accion),
      login: (email, password) => supabase.auth.signInWithPassword({ email, password }),
      logout: () => supabase.auth.signOut(),
      resetPassword: (email) => supabase.auth.resetPasswordForEmail(email),
      // Usuario recién dado de alta con contraseña temporal, o que llegó por el enlace de recuperación.
      debeCambiarClave: recuperando || Boolean(session?.user?.user_metadata?.debe_cambiar_clave),
      cambiarClave: async (nueva) => {
        const { error } = await supabase.auth.updateUser({ password: nueva, data: { debe_cambiar_clave: false } });
        if (!error) setRecuperando(false);
        return { error };
      },
    };
  }, [session, profile, perfilListo, loading, recuperando]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
