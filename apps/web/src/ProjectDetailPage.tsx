import type { Project } from "./api";

const STEPS = ["Style", "Characters", "Portraits", "Chapters", "Illustrations"] as const;

type Props = {
  project: Project | null;
  loading: boolean;
  error: string;
  authorName: string;
  onBack: () => void;
  onRunStep?: (step: number) => void;
};

export function ProjectDetailPage({ project, loading, error, authorName, onBack, onRunStep }: Props) {
  return (
    <main className="min-h-screen bg-page bg-[radial-gradient(circle_at_12%_0,#fffaf5_0,transparent_28%)] px-4 py-8 sm:px-8 sm:py-12">
      <section className="mx-auto w-full max-w-6xl">
        <button className="mb-8 text-sm font-bold text-brand transition hover:-translate-x-0.5 hover:text-brand-hover motion-reduce:hover:translate-x-0" onClick={onBack}>← Back to projects</button>
        {loading ? <div className="h-72 animate-pulse rounded-2xl bg-soft motion-reduce:animate-none" aria-label="Loading project" /> : error ? <div className="rounded-xl border border-danger/25 bg-danger/10 p-5 text-danger" role="alert">{error}</div> : project ? <Workspace project={project} authorName={authorName} onRunStep={onRunStep} /> : null}
      </section>
    </main>
  );
}

function Workspace({ project, authorName, onRunStep }: { project: Project; authorName: string; onRunStep?: (step: number) => void }) {
  const currentStep = Math.min(5, Math.max(1, project.current_step || 1));
  const currentName = STEPS[currentStep - 1];
  const isCompleted = project.status === "completed";

  return (
    <>
      <header>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl leading-tight text-ink sm:text-5xl">{project.title}</h1>
            <p className="mt-2 text-sm text-muted">Created {formatDate(project.createdAt)} by {authorName}</p>
          </div>
          <StatusPill status={project.status} />
        </div>
      </header>

      <nav className="mt-9 overflow-x-auto pb-3" aria-label="Illustration pipeline">
        <ol className="flex min-w-[760px] items-center">
          {STEPS.map((step, index) => {
            const number = index + 1;
            const state = isCompleted || number < currentStep ? "complete" : number === currentStep ? "current step" : "not started";
            const complete = state === "complete";
            const current = state === "current step";
            return (
              <li className="flex min-w-0 flex-1 items-center last:flex-none" key={step}>
                <span className="flex items-center gap-2.5 whitespace-nowrap" aria-label={`${step} ${state}`}>
                  <i className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold not-italic ${complete ? "bg-success text-white" : current ? "bg-brand text-white shadow-[0_0_0_5px_rgb(138_90_68_/_0.1)]" : "bg-line text-muted"}`}>{complete ? "✓" : number}</i>
                  <span className={`text-sm font-bold ${complete || current ? "text-ink" : "text-muted/70"}`}>{step}</span>
                </span>
                {index < STEPS.length - 1 && <i className={`mx-4 h-px min-w-8 flex-1 ${number < currentStep || isCompleted ? "bg-success/60" : "bg-line"}`} aria-hidden="true" />}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-2xl border border-line bg-surface p-6 shadow-soft sm:p-8">
          {isCompleted ? (
            <><p className="text-lg font-bold text-ink">Your illustration project is complete.</p><p className="mt-3 leading-7 text-muted">All generated work remains available in this workspace.</p></>
          ) : (
            <>
              <p className="text-lg text-ink">{currentStep === 1 ? "Ready to begin:" : "Ready for the next step:"} <strong>{currentName}</strong></p>
              <p className="mt-4 leading-7 text-muted">This page stays open throughout the pipeline. When a step finishes, the project data and status update here without navigating to another page.</p>
              <button className="mt-6 rounded-lg bg-brand px-6 py-3 font-bold text-white shadow-soft transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-55" type="button" disabled={!onRunStep} onClick={() => onRunStep?.(currentStep)}>Generate {currentName} →</button>
              {!onRunStep && <p className="mt-3 text-xs text-muted">Generation will be connected in the next pipeline checkpoint.</p>}
            </>
          )}
        </section>

        <aside className="rounded-2xl bg-soft/55 p-6">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-brand">Project state</span>
          <dl className="mt-4 grid gap-4 text-sm">
            <div><dt className="text-muted">Current step</dt><dd className="mt-1 font-bold text-ink">{currentStep} · {currentName}</dd></div>
            <div><dt className="text-muted">Book content</dt><dd className="mt-1 font-bold text-ink">Stored locally</dd></div>
            <div><dt className="text-muted">Completed</dt><dd className="mt-1 font-bold text-ink">{isCompleted ? 5 : Math.max(project.completedSteps, currentStep - 1)} of 5 steps</dd></div>
          </dl>
        </aside>
      </div>
    </>
  );
}

function StatusPill({ status }: { status: Project["status"] }) {
  const label = status === "draft" ? "Draft" : status === "completed" ? "Done" : "In progress";
  const style = status === "completed" ? "bg-[#e0e7db] text-[#526149]" : status === "in_progress" ? "bg-soft text-brand" : "bg-stone-200 text-muted";
  return <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${style}`}>{label}</span>;
}

function formatDate(value: string) { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value)); }
