export function NextCheckpointPage({ onBack }: { onBack: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-page p-5">
      <section className="w-full max-w-xl rounded-2xl border border-line bg-surface p-8 text-center shadow-card">
        <span className="mb-2 block text-[0.71rem] font-bold uppercase tracking-[0.14em] text-brand">Next checkpoint</span>
        <h1 className="font-display text-4xl text-ink">New project</h1>
        <p className="mx-auto mt-3 max-w-md leading-7 text-muted">The navigation and route are ready. The upload and paste form will be implemented only after you approve the project-list checkpoint.</p>
        <button className="mt-6 rounded-lg bg-brand px-5 py-3 font-bold text-white shadow-soft transition hover:bg-brand-hover" onClick={onBack}>← Back to projects</button>
      </section>
    </main>
  );
}
