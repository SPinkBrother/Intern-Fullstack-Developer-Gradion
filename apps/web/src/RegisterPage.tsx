import { useRef, useState, type FormEvent } from "react";
import { api, type User } from "./api";
import { AuthLayout, Logo } from "./AuthLayout";

export function RegisterPage({ initialEmail = "", onRegister, onLogin }: { initialEmail?: string; onRegister: (user: User) => void; onLogin: (email: string) => void }) {
  const [name, setName] = useState(""); const [email, setEmail] = useState(initialEmail); const [password, setPassword] = useState(""); const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const nameRef = useRef<HTMLInputElement>(null);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    if (!name.trim()) { setError("Enter your full name."); nameRef.current?.focus(); return; }
    if (!email.trim() || !email.includes("@")) { setError("Enter a valid email address."); return; }
    if (!password) { setError("Choose a password."); return; }
    setBusy(true);
    try { onRegister((await api.register(name, email, password)).user); }
    catch (value) { setError((value as Error).message); }
    finally { setBusy(false); }
  }
  return <AuthLayout><form className="auth-card" onSubmit={submit} noValidate><Logo/><span className="eyebrow">Begin a new story</span><h2>Create your account</h2><p className="muted">A simple local account keeps your work private and ready to resume.</p>
    <label>Full name<input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} placeholder="Lina Hart" autoComplete="name" autoFocus /></label>
    <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="lina@example.com" autoComplete="email" /></label>
    <label>Password<div className="password-field"><input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="demo1234" autoComplete="new-password"/><button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>{show ? "Hide" : "Show"}</button></div></label>
    {error && <div className="alert" role="alert">{error}</div>}
    <button className="primary" disabled={busy}>{busy ? "Creating account…" : <>Create account <span>→</span></>}</button>
    <button className="text-button" type="button" onClick={() => onLogin(email)}>Already have an account? Sign in</button>
  </form></AuthLayout>;
}
