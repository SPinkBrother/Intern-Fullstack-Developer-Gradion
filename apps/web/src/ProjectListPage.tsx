import type { CSSProperties } from "react";
import type { Project, User } from "./api";

const STEPS = ["Style", "Characters", "Portraits", "Chapters", "Illustrations"];
const statusStyles: Record<Project["status"], string> = {
  draft: "bg-stone-200 text-muted",
  in_progress: "bg-soft text-brand",
  completed: "bg-[#e0e7db] text-[#526149]",
};

type Props = {
  user: User;
  projects: Project[];
  loading: boolean;
  error: string;
  onNewProject: () => void;
  onSignOut: () => void;
};

export function ProjectListPage({ user, projects, loading, error, onNewProject, onSignOut }: Props) {
  return (
    <div className="min-h-screen bg-page bg-[radial-gradient(circle_at_15%_0,#fffaf5_0,transparent_30%)]">
      <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-line/75 bg-surface/90 px-4 backdrop-blur sm:px-8 lg:px-12">
        <button className="flex items-center gap-2.5 font-display text-xl font-bold text-ink" aria-label="Go to projects">
          <span className="grid size-9 place-items-center rounded-[0.65rem] bg-brand font-sans text-base text-white shadow-soft">G</span>
          <span>Gradion</span>
        </button>
        <nav className="flex items-center gap-2 sm:gap-4" aria-label="Account navigation">
          <span className="hidden border-b-2 border-brand py-5 text-sm font-bold text-brand sm:block">Projects</span>
          <span className="grid size-9 place-items-center rounded-full bg-soft text-xs font-bold text-brand" aria-hidden="true">{initials(user.name)}</span>
          <span className="hidden max-w-36 truncate text-sm font-semibold text-ink md:block">{user.name}</span>
          <button className="rounded-lg px-2 py-2 text-sm font-bold text-muted transition hover:bg-soft/60 hover:text-brand sm:px-3" onClick={onSignOut}>Sign out</button>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-8 sm:py-14">
        <div className="mb-9 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <span className="mb-2 block text-[0.71rem] font-bold uppercase tracking-[0.14em] text-brand">Your library</span>
            <h1 className="font-display text-4xl leading-tight tracking-[-0.025em] text-ink sm:text-5xl">Your projects</h1>
            <p className="mt-2 text-muted">Continue a story or begin a new visual world.</p>
          </div>
          <button className="rounded-lg bg-brand px-5 py-3 font-bold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-brand-hover motion-reduce:hover:translate-y-0" onClick={onNewProject}>＋ New project</button>
        </div>

        {loading ? <ProjectListSkeleton /> : error ? (
          <section className="rounded-xl border border-danger/25 bg-danger/10 p-5 text-danger" role="alert">
            <h2 className="font-display text-xl font-bold">Projects could not be loaded.</h2><p className="mt-1">{error}</p>
          </section>
        ) : projects.length === 0 ? <EmptyState onNewProject={onNewProject} /> : <ProjectRows projects={projects} />}
      </main>
    </div>
  );
}

function EmptyState({ onNewProject }: { onNewProject: () => void }) {
  return (
    <section className="rounded-2xl border border-dashed border-line bg-surface/75 px-5 py-12 text-center shadow-soft sm:py-16">
      <div className="relative mx-auto mb-6 h-28 w-44 overflow-hidden rounded-2xl bg-soft" aria-hidden="true">
        <span className="absolute right-8 top-5 text-xl text-brand">✦</span>
        <i className="absolute -bottom-10 -left-5 h-24 w-32 rounded-[50%] bg-accent/55" />
        <b className="absolute -bottom-12 right-[-12px] h-28 w-36 rounded-[50%] bg-brand/25" />
      </div>
      <span className="mb-2 block text-[0.71rem] font-bold uppercase tracking-[0.14em] text-brand">A blank shelf</span>
      <h2 className="font-display text-3xl text-ink">No projects yet</h2>
      <p className="mx-auto mt-2 max-w-lg leading-7 text-muted">Upload or paste a book in the next step, then guide it through five illustration stages.</p>
      <button className="mt-6 rounded-lg bg-brand px-5 py-3 font-bold text-white shadow-soft transition hover:bg-brand-hover" onClick={onNewProject}>Create your first project <span>→</span></button>
    </section>
  );
}

function ProjectRows({ projects }: { projects: Project[] }) {
  return (
    <section className="grid gap-3" aria-label="Projects">
      {projects.map((project, index) => (
        <button
          className="group flex min-h-[86px] w-full flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-line/80 bg-surface p-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-accent hover:shadow-card motion-safe:animate-row-in sm:flex-nowrap sm:gap-6 sm:px-5"
          style={{ "--delay": `${index * 45}ms`, animationDelay: `var(--delay)` } as CSSProperties}
          key={project.id}
          onClick={() => { location.hash = `#/projects/${project.id}`; }}
        >
          <span className="min-w-0 basis-[calc(100%-2.5rem)] flex-1 sm:basis-auto">
            <strong className="block truncate font-display text-lg text-ink">{project.title}</strong>
            <small className="mt-1 block truncate text-sm text-muted">Created {formatDate(project.createdAt)} · {subtitle(project)}</small>
          </span>
          <span className="order-3 flex min-w-28 flex-1 gap-1 sm:order-none sm:w-28 sm:flex-none" aria-label={`${project.completedSteps} of 5 steps complete`}>
            {STEPS.map((step, stepIndex) => <i key={step} className={`h-1.5 flex-1 rounded-full ${stepIndex < project.completedSteps ? "bg-brand" : "bg-soft"}`} />)}
          </span>
          <span className={`order-4 inline-flex min-w-20 items-center justify-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold sm:order-none ${statusStyles[project.status]}`}>
            {project.status === "in_progress" && <i className="size-1.5 animate-pulse-dot rounded-full bg-brand motion-reduce:animate-none" />}
            {project.status === "completed" ? "Done" : project.status === "in_progress" ? "In progress" : "Draft"}
          </span>
          <span className="order-2 ml-auto text-xl text-brand transition group-hover:translate-x-1 motion-reduce:group-hover:translate-x-0 sm:order-none" aria-hidden="true">→</span>
        </button>
      ))}
    </section>
  );
}

function ProjectListSkeleton() {
  return (
    <section className="grid gap-3" aria-label="Loading projects">
      {[0, 1, 2].map((item) => (
        <div className="flex min-h-[86px] animate-pulse items-center gap-6 rounded-xl border border-line/70 bg-surface p-5 motion-reduce:animate-none" key={item}>
          <span className="h-5 w-2/5 rounded bg-soft" /><span className="ml-auto h-2 w-28 rounded bg-soft" /><i className="h-6 w-20 rounded-full bg-soft" />
        </div>
      ))}
    </section>
  );
}

function initials(name: string) { return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
function formatDate(value: string) { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value)); }
function subtitle(project: Project) {
  if (project.status === "completed") return "All 5 steps complete";
  if (!project.completedSteps) return "Book saved · style not yet generated";
  return `${STEPS.slice(0, project.completedSteps).join(" + ")} done`;
}
