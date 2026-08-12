import type { Project, User } from "./api";
import type { CSSProperties } from "react";

const STEPS = ["Style", "Characters", "Portraits", "Chapters", "Illustrations"];

export function ProjectListPage({ user, projects, loading, error, onNewProject, onSignOut }: { user: User; projects: Project[]; loading: boolean; error: string; onNewProject: () => void; onSignOut: () => void }) {
  return <div className="app-shell">
    <header className="app-nav"><button className="nav-brand" aria-label="Go to projects"><span className="brand-mark">G</span><span>Gradion</span></button><nav><span className="nav-current">Projects</span><span className="avatar" aria-hidden>{initials(user.name)}</span><span className="user-name">{user.name}</span><button className="sign-out" onClick={onSignOut}>Sign out</button></nav></header>
    <main className="projects-page"><div className="projects-head"><div><span className="eyebrow">Your library</span><h1>Your projects</h1><p>Continue a story or begin a new visual world.</p></div><button className="primary new-project" onClick={onNewProject}>＋ New project</button></div>
      {loading ? <ProjectListSkeleton /> : error ? <section className="list-error" role="alert"><h2>Projects could not be loaded.</h2><p>{error}</p></section> : projects.length === 0 ? <EmptyState onNewProject={onNewProject}/> : <ProjectRows projects={projects}/>} 
    </main>
  </div>;
}

function EmptyState({ onNewProject }: { onNewProject: () => void }) {
  return <section className="project-empty"><div className="empty-illustration" aria-hidden><span>✦</span><i/><b/></div><span className="eyebrow">A blank shelf</span><h2>No projects yet</h2><p>Upload or paste a book in the next step, then guide it through five illustration stages.</p><button className="primary" onClick={onNewProject}>Create your first project <span>→</span></button></section>;
}

function ProjectRows({ projects }: { projects: Project[] }) {
  return <section className="project-list" aria-label="Projects">{projects.map((project, index) => <button className="project-row" style={{ "--delay": `${index * 45}ms` } as CSSProperties} key={project.id} onClick={() => { location.hash = `#/projects/${project.id}`; }}>
    <span className="project-copy"><strong>{project.title}</strong><small>Created {formatDate(project.createdAt)} · {subtitle(project)}</small></span>
    <span className="progress-mini" aria-label={`${project.completedSteps} of 5 steps complete`}>{STEPS.map((step, stepIndex) => <i key={step} className={stepIndex < project.completedSteps ? "complete" : ""}/>)}</span>
    <span className={`status-pill ${project.status}`}>{project.status === "in_progress" && <i/>}{project.status === "completed" ? "Done" : project.status === "in_progress" ? "In progress" : "Draft"}</span>
    <span className="row-arrow" aria-hidden>→</span>
  </button>)}</section>;
}

function ProjectListSkeleton() { return <section className="project-list" aria-label="Loading projects">{[0,1,2].map((item) => <div className="project-row skeleton-row" key={item}><span/><span/><i/></div>)}</section>; }
function initials(name: string) { return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
function formatDate(value: string) { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value)); }
function subtitle(project: Project) { if (project.status === "completed") return "All 5 steps complete"; if (!project.completedSteps) return "Book saved · style not yet generated"; return `${STEPS.slice(0, project.completedSteps).join(" + ")} done`; }
