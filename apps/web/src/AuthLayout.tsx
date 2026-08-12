import type { ReactNode } from "react";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative flex min-h-[310px] flex-col justify-center overflow-hidden bg-[#e7d4c0] px-6 py-12 sm:px-10 lg:min-h-screen lg:px-[clamp(3rem,7vw,7rem)]">
        <span className="mb-3 text-[0.71rem] font-bold uppercase tracking-[0.14em] text-brand">Book Illustration Studio</span>
        <h1 className="relative z-10 max-w-[650px] font-display text-[2.55rem] leading-[1.02] tracking-[-0.025em] text-[#4b352b] sm:text-5xl lg:text-[clamp(3rem,6vw,5.8rem)]">
          Turn beloved pages into a visual world.
        </h1>
        <p className="relative z-10 mt-5 max-w-[560px] text-base leading-7 text-[#654c40] sm:text-lg">
          Define an art direction, meet the characters, and illustrate a memorable scene—one thoughtful step at a time.
        </p>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-[38%] lg:block" aria-hidden="true">
          <span className="absolute right-[18%] top-0 text-3xl text-brand/55">✦</span>
          <div className="absolute -bottom-[55%] -left-[8%] h-[160%] w-[72%] rounded-[50%] bg-accent/45" />
          <div className="absolute -bottom-[70%] right-[-12%] h-[180%] w-[78%] rounded-[50%] bg-brand/20" />
        </div>
      </section>
      <section className="flex items-center justify-center bg-page px-5 py-10 sm:px-8">{children}</section>
    </main>
  );
}

export function Logo() {
  return (
    <div className="flex items-center gap-2.5 font-display text-xl font-bold text-ink">
      <span className="grid size-9 place-items-center rounded-[0.65rem] bg-brand font-sans text-base font-bold text-white shadow-soft">G</span>
      Gradion
    </div>
  );
}
