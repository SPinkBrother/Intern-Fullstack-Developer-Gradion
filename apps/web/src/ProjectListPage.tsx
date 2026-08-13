import type { CSSProperties } from "react";
import type { Project, User } from "./api";

type Props = { user: User; projects: Project[]; loading: boolean; error: string; onNewProject: () => void; onSignOut: () => void };

export function ProjectListPage({ user, projects, loading, error, onNewProject, onSignOut }: Props) {
  return (
    <div className="min-h-screen bg-page bg-[radial-gradient(circle_at_15%_0,#fffaf5_0,transparent_30%)]">
      <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-line/75 bg-surface/90 px-4 backdrop-blur sm:px-8 lg:px-12">
        <div className="flex items-center gap-2.5 font-display text-xl font-bold text-ink"><span className="grid size-9 place-items-center rounded-[0.65rem] bg-brand font-sans text-base text-white shadow-soft">G</span>Gradion</div>
        <nav className="flex items-center gap-2 sm:gap-4" aria-label="Account navigation">
          <span className="grid size-9 place-items-center rounded-full bg-soft text-xs font-bold text-brand" aria-hidden="true">{initials(user.name)}</span>
          <span className="hidden max-w-36 truncate text-sm font-semibold text-ink md:block">{user.name}</span>
          <button className="rounded-lg px-3 py-2 text-sm font-bold text-muted hover:bg-soft/60 hover:text-brand" onClick={onSignOut}>Sign out</button>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-8 sm:py-14">
        <div className="mb-9 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
          <div><span className="mb-2 block text-[0.71rem] font-bold uppercase tracking-[0.14em] text-brand">Your library</span><h1 className="font-display text-4xl text-ink sm:text-5xl">Your projects</h1><p className="mt-2 text-muted">Save a book now. Illustration comes later.</p></div>
          <button className="rounded-lg bg-brand px-5 py-3 font-bold text-white shadow-soft hover:bg-brand-hover" onClick={onNewProject}>＋ New project</button>
        </div>
        {loading ? <ProjectListSkeleton /> : error ? <div className="rounded-xl border border-danger/25 bg-danger/10 p-5 text-danger" role="alert">{error}</div> : projects.length ? <ProjectRows projects={projects} /> : <EmptyState onNewProject={onNewProject} />}
      </main>
    </div>
  );
}

function EmptyState({ onNewProject }: { onNewProject: () => void }) {
  return <section className="rounded-2xl border border-dashed border-line bg-surface/75 px-5 py-16 text-center shadow-soft"><span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-brand">A blank shelf</span><h2 className="font-display text-3xl text-ink">No projects yet</h2><p className="mx-auto mt-2 max-w-lg leading-7 text-muted">Paste book text or upload a plain-text file to create your first project.</p><button className="mt-6 rounded-lg bg-brand px-5 py-3 font-bold text-white shadow-soft hover:bg-brand-hover" onClick={onNewProject}>Create your first project →</button></section>;
}

function ProjectRows({ projects }: { projects: Project[] }) {
  return <section className="grid gap-3" aria-label="Projects">{projects.map((project, index) => <button className="group flex min-h-20 w-full items-center gap-4 rounded-xl border border-line/80 bg-surface p-5 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-accent" style={{ animationDelay: `${index * 45}ms` } as CSSProperties} key={project.id} onClick={() => { location.hash = `#/projects/${project.id}`; }}><span className="min-w-0 flex-1"><strong className="block truncate font-display text-lg text-ink">{project.title}</strong><small className="mt-1 block text-sm text-muted">Created {formatDate(project.createdAt)}</small></span><ProjectStatus status={project.status} /><span className="text-xl text-brand group-hover:translate-x-1">→</span></button>)}</section>;
}

function ProjectStatus({ status }: { status: Project["status"] }) {
  const label = status === "draft" ? "Draft" : status === "completed" ? "Done" : status === "failed" ? "Failed" : "In progress";
  const colors = status === "failed" ? "bg-danger/10 text-danger" : status === "completed" ? "bg-success/15 text-success" : status === "in_progress" ? "bg-soft text-brand" : "bg-stone-200 text-muted";
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${colors}`}>{label}</span>;
}

function ProjectListSkeleton() { return <section className="grid gap-3" aria-label="Loading projects">{[0, 1, 2].map((item) => <div className="h-20 animate-pulse rounded-xl bg-soft" key={item} />)}</section>; }
function initials(name: string) { return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
function formatDate(value: string) { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value)); }
