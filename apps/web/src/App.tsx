import { useEffect, useRef, useState } from "react";
import { api, type Project, type User } from "./api";
import { LoginPage } from "./LoginPage";
import { NewProjectPage } from "./NewProjectPage";
import { ProjectDetailPage } from "./ProjectDetailPage";
import { ProjectListPage } from "./ProjectListPage";
import { RegisterPage } from "./RegisterPage";
import "./styles.css";

type Screen = "login" | "register" | "projects" | "new-project" | "project-detail";
type NavigationScreen = Exclude<Screen, "project-detail">;
function route(user: User | null): Screen {
  if (!user) return location.hash === "#/register" ? "register" : "login";
  if (location.hash === "#/projects/new") return "new-project";
  return projectIdFromHash() ? "project-detail" : "projects";
}
function projectIdFromHash() { return location.hash.match(/^#\/projects\/([^/]+)$/)?.[1] ?? ""; }

export default function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [email, setEmail] = useState(""); const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]); const [projectsLoading, setProjectsLoading] = useState(false); const [projectsError, setProjectsError] = useState("");
  const [detailProject, setDetailProject] = useState<Project | null>(null); const [detailLoading, setDetailLoading] = useState(false); const [detailError, setDetailError] = useState("");
  const createdProjectNavigation = useRef("");
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    api.session().then(({ user }) => {
      setUser(user);
      const nextScreen = route(user);
      setScreen(nextScreen);
      loadProjects();
      const projectId = projectIdFromHash();
      if (nextScreen === "project-detail" && projectId) loadProject(projectId);
    }).catch(() => setScreen(route(null))).finally(() => setSessionLoading(false));
  }, []);
  useEffect(() => {
    const handleHashChange = () => {
      const nextScreen = route(user);
      setScreen(nextScreen);
      const projectId = projectIdFromHash();
      if (createdProjectNavigation.current === projectId) createdProjectNavigation.current = "";
      else if (nextScreen === "project-detail" && projectId && detailProject?.id !== projectId) loadProject(projectId);
    };
    addEventListener("hashchange", handleHashChange);
    return () => removeEventListener("hashchange", handleHashChange);
  }, [user]);

  async function loadProjects() { setProjectsLoading(true); setProjectsError(""); try { setProjects((await api.projects()).projects); } catch (value) { setProjectsError((value as Error).message); } finally { setProjectsLoading(false); } }
  async function loadProject(projectId: string) { setDetailLoading(true); setDetailError(""); try { setDetailProject((await api.project(projectId)).project); } catch (value) { setDetailError((value as Error).message); } finally { setDetailLoading(false); } }
  function handleAuthenticated(nextUser: User) { setUser(nextUser); location.hash = "#/projects"; setScreen("projects"); loadProjects(); }
  function navigate(next: NavigationScreen, retainedEmail = "") { setEmail(retainedEmail); const hashes: Record<NavigationScreen,string> = { login: "#/login", register: "#/register", projects: "#/projects", "new-project": "#/projects/new" }; location.hash = hashes[next]; setScreen(next); }
  function handleProjectCreated(project: Project) { setProjects((current) => [project, ...current]); setDetailProject(project); createdProjectNavigation.current = project.id; location.hash = `#/projects/${project.id}`; setScreen("project-detail"); }
  async function handleSignOut() { await api.logout(); setUser(null); setProjects([]); navigate("login"); }

  if (sessionLoading) return <main className="grid min-h-screen place-items-center"><div className="size-8 animate-spin rounded-full border-3 border-soft border-t-brand motion-reduce:animate-none" aria-label="Restoring session"/></main>;
  if (!user) return screen === "register" ? <RegisterPage initialEmail={email} onRegister={handleAuthenticated} onLogin={(value) => navigate("login", value)} /> : <LoginPage initialEmail={email} onLogin={handleAuthenticated} onRegister={(value) => navigate("register", value)} />;
  if (screen === "new-project") return <NewProjectPage onBack={() => navigate("projects")} onCreated={handleProjectCreated}/>;
  if (screen === "project-detail") return <ProjectDetailPage project={detailProject} loading={detailLoading} error={detailError} authorName={user.name} onBack={() => navigate("projects")}/>;
  return <ProjectListPage user={user} projects={projects} loading={projectsLoading} error={projectsError} onNewProject={() => navigate("new-project")} onSignOut={handleSignOut}/>;
}
