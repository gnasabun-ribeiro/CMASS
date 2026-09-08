:root {
  --violet-900: #4e0f6b;
  --violet-800: #701c93;
  --violet-700: #7e28a3;
  --violet-600: #8b2fae;
  --violet-500: #9a3fbf;
  --violet-400: #b45fd8;
  --violet-300: #d9a8ee;
  --violet-150: #f1ddf9;
  --violet-100: #f4e2fa;
  --violet-75: #f8ecfc;
  --violet-50: #f7e9fc;
  --violet-25: #fbf2fd;
  --violet-tint-2: #fcf6fd;

  --border: #e7d2f0;
  --ink: #1b1626;
  --muted: #665e7a;
  --muted-2: #6e6880;
  --muted-3: #4b4459;
  --muted-4: #635b72;

  --success-bg: #e3f6ea;
  --success-fg: #15803d;
  --warn-bg: #fff2dc;
  --warn-fg: #8a3d08;
  --neutral-bg: #eeeaf4;
  --neutral-fg: #4e4762;
  --danger-bg: #fce7f1;
  --danger-fg: #be185d;
  --danger-border: #f5c3d9;
  --warn-border: #ffdfa8;
  --neutral-border: #e7d2f0;
  --success-border: #a9e2bb;

  --shadow-card: 0 14px 30px -20px rgba(36, 18, 70, 0.5);
  --shadow-card-hover: 0 26px 44px -22px rgba(36, 18, 70, 0.55);
  --shadow-panel: 0 12px 26px -22px rgba(36, 18, 70, 0.5);
  --shadow-float: 0 14px 30px -18px rgba(36, 18, 70, 0.6);
  --shadow-cta: 0 16px 30px -16px rgba(91, 33, 182, 0.85);

  --app-gradient: linear-gradient(
    165deg,
    #a64dc4 0%,
    #8b2fae 26%,
    #701c93 58%,
    #4e0f6b 100%
  );
  --brand-gradient: linear-gradient(160deg, var(--violet-500), var(--violet-800));

  color-scheme: light;
}

* {
  box-sizing: border-box;
}

html,
body,
#root {
  min-height: 100%;
}

body {
  margin: 0;
  background: #6f1f92;
  font-family: "IBM Plex Sans", system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  color: var(--ink);
}

a {
  color: var(--violet-800);
  text-decoration: none;
}

button,
input,
select,
textarea {
  font-family: inherit;
}

button {
  font-family: inherit;
}

.heading {
  font-family: "Plus Jakarta Sans", sans-serif;
}

::-webkit-scrollbar {
  width: 9px;
  height: 9px;
}
::-webkit-scrollbar-thumb {
  background: var(--violet-300);
  border-radius: 8px;
}

@keyframes enterFade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes pop {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.965);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes pulseRing {
  0% {
    box-shadow: 0 0 0 0 rgba(167, 139, 250, 0.55);
  }
  70% {
    box-shadow: 0 0 0 12px rgba(167, 139, 250, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(167, 139, 250, 0);
  }
}

.app-screen {
  animation: enterFade 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

.pop-in {
  animation: pop 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

@media print {
  .no-print {
    display: none !important;
  }
}
