import Header from "./Header.jsx";
import TabBar from "./TabBar.jsx";

export default function AppShell({ title, subtitle, onBack, padBottom = "108px", children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--app-gradient)",
        display: "flex",
        flexDirection: "column",
        color: "var(--ink)",
      }}
    >
      <Header title={title} subtitle={subtitle} onBack={onBack} />

      <div
        style={{
          flex: 1,
          width: "100%",
          maxWidth: 1020,
          margin: "0 auto",
          padding: "16px 14px",
          paddingBottom: padBottom,
        }}
      >
        <div className="app-screen">{children}</div>
      </div>

      <TabBar />
    </div>
  );
}
