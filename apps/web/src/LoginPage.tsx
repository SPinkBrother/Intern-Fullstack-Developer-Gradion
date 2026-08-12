import { useRef, useState, type FormEvent } from "react";
import { api, ApiError, type User } from "./api";
import { AuthLayout, Logo } from "./AuthLayout";

export function LoginPage({ initialEmail = "", onLogin, onRegister }: { initialEmail?: string; onLogin: (user: User) => void; onRegister: (email: string) => void }) {
  const [email, setEmail] = useState(initialEmail); const [password, setPassword] = useState(""); const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const emailRef = useRef<HTMLInputElement>(null);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    if (!email.trim() || !email.includes("@")) { setError("Enter a valid email address."); emailRef.current?.focus(); return; }
    if (!password) { setError("Enter your password."); return; }
    setBusy(true);
    try { onLogin((await api.login(email, password)).user); }
    catch (value) {
      const issue = value as ApiError;
      if (issue.code === "ACCOUNT_NOT_FOUND") { setError("No account uses that email. Create an account to continue."); }
      else setError(issue.message);
    } finally { setBusy(false); }
  }
  return <AuthLayout><form className="auth-card" onSubmit={submit} noValidate><Logo/><span className="eyebrow">Continue your studio</span><h2>Welcome back</h2><p className="muted">Sign in to return to your illustration projects.</p>
    <label>Email<input ref={emailRef} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="lina@example.com" autoComplete="email" autoFocus /></label>
    <label>Password<div className="password-field"><input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="demo1234" autoComplete="current-password"/><button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>{show ? "Hide" : "Show"}</button></div></label>
    {error && <div className="alert" role="alert">{error}</div>}
    <button className="primary" disabled={busy}>{busy ? "Signing in…" : <>Sign in <span>→</span></>}</button>
    <button className="text-button" type="button" onClick={() => onRegister(email)}>New here? Create an account</button>
  </form></AuthLayout>;
}
