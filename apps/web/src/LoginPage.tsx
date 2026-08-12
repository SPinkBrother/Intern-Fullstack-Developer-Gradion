import { useRef, useState, type FormEvent } from "react";
import { api, ApiError, type User } from "./api";
import { AuthLayout, Logo } from "./AuthLayout";

const fieldClass = "mt-1.5 w-full rounded-lg border border-line bg-white/70 px-3.5 py-3 text-ink transition placeholder:text-muted/65 focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/10";

export function LoginPage({ initialEmail = "", onLogin, onRegister }: { initialEmail?: string; onLogin: (user: User) => void; onRegister: (email: string) => void }) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    if (!email.trim() || !email.includes("@")) { setError("Enter a valid email address."); emailRef.current?.focus(); return; }
    if (!password) { setError("Enter your password."); return; }
    setBusy(true);
    try { onLogin((await api.login(email, password)).user); }
    catch (value) {
      const issue = value as ApiError;
      setError(issue.code === "ACCOUNT_NOT_FOUND" ? "No account uses that email. Create an account to continue." : issue.message);
    } finally { setBusy(false); }
  }

  return (
    <AuthLayout>
      <form className="w-full max-w-[430px] rounded-2xl border border-line/80 bg-surface p-6 shadow-card sm:p-9" onSubmit={submit} noValidate>
        <Logo />
        <span className="mb-2 mt-8 block text-[0.71rem] font-bold uppercase tracking-[0.14em] text-brand">Continue your studio</span>
        <h2 className="font-display text-3xl leading-tight tracking-[-0.02em] text-ink">Welcome back</h2>
        <p className="mt-2 leading-6 text-muted">Sign in to return to your illustration projects.</p>
        <label className="mt-6 block text-xs font-bold text-[#57433a]">Email
          <input className={fieldClass} ref={emailRef} type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="lina@example.com" autoComplete="email" autoFocus />
        </label>
        <label className="mt-4 block text-xs font-bold text-[#57433a]">Password
          <span className="relative block">
            <input className={`${fieldClass} pr-16`} type={show ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="demo1234" autoComplete="current-password" />
            <button className="absolute inset-y-0 right-3 mt-1.5 h-fit translate-y-3 text-xs font-bold text-brand hover:text-brand-hover" type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>{show ? "Hide" : "Show"}</button>
          </span>
        </label>
        {error && <div className="mt-4 rounded-lg border border-danger/25 bg-danger/10 px-3.5 py-3 text-sm text-danger" role="alert">{error}</div>}
        <button className="mt-5 w-full rounded-lg bg-brand px-4 py-3 font-bold text-white shadow-soft transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60" disabled={busy}>{busy ? "Signing in…" : <>Sign in <span>→</span></>}</button>
        <button className="mt-5 w-full text-sm font-bold text-brand underline-offset-4 hover:text-brand-hover hover:underline" type="button" onClick={() => onRegister(email)}>New here? Create an account</button>
      </form>
    </AuthLayout>
  );
}
