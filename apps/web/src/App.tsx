import { useEffect, useState } from "react";
import { api, type User } from "./api";
import { LoginPage } from "./LoginPage";
import { RegisterPage } from "./RegisterPage";
import "./styles.css";

function route() { return location.hash === "#/register" ? "register" : "login"; }

export default function App() {
  const [screen, setScreen] = useState<"login" | "register">(route());
  const [email, setEmail] = useState(""); const [user, setUser] = useState<User | null>(null); const [loading, setLoading] = useState(true);
  useEffect(() => { const changed = () => setScreen(route()); addEventListener("hashchange", changed); return () => removeEventListener("hashchange", changed); }, []);
  useEffect(() => { api.session().then(({ user }) => setUser(user)).catch(() => undefined).finally(() => setLoading(false)); }, []);
  function navigate(next: "login" | "register", retainedEmail = "") { setEmail(retainedEmail); location.hash = `#/${next}`; setScreen(next); }
  if (loading) return <main className="loading"><div className="spinner" aria-label="Restoring session"/></main>;
  if (user) return <main className="signed-in"><section><span className="brand-mark">G</span><span className="eyebrow">Authentication checkpoint</span><h1>Welcome, {user.name}.</h1><p>Your login and cookie session are working. The next application step has intentionally not been built yet.</p><dl><div><dt>Email</dt><dd>{user.email}</dd></div><div><dt>Session</dt><dd>Active</dd></div></dl><button className="primary" onClick={async () => { await api.logout(); setUser(null); navigate("login"); }}>Sign out</button></section></main>;
  return screen === "register" ? <RegisterPage initialEmail={email} onRegister={setUser} onLogin={(value) => navigate("login", value)} /> : <LoginPage initialEmail={email} onLogin={setUser} onRegister={(value) => navigate("register", value)} />;
}
