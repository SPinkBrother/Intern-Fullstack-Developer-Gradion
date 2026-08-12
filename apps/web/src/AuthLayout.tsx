import type { ReactNode } from "react";

export function AuthLayout({ children }: { children: ReactNode }) {
  return <main className="auth-layout">
    <section className="auth-story">
      <span className="eyebrow">Book Illustration Studio</span>
      <h1>Turn beloved pages into a visual world.</h1>
      <p>Define an art direction, meet the characters, and illustrate a memorable scene—one thoughtful step at a time.</p>
      <div className="story-art" aria-hidden><span>✦</span><div className="hill one"/><div className="hill two"/></div>
    </section>
    <section className="auth-panel">{children}</section>
  </main>;
}

export function Logo() { return <div className="logo"><span className="brand-mark">G</span> Gradion</div>; }
