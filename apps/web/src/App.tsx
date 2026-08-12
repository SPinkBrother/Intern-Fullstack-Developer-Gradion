import { useEffect, useState } from "react";
import { api, type Project, type User } from "./api";
import { LoginPage } from "./LoginPage";
import { NextCheckpointPage } from "./NextCheckpointPage";
import { ProjectListPage } from "./ProjectListPage";
import { RegisterPage } from "./RegisterPage";
import "./styles.css";

type Screen = "login" | "register" | "projects" | "new-project";
function route(user: User | null): Screen {
  if (!user) return location.hash === "#/register" ? "register" : "login";
  return location.hash === "#/projects/new" ? "new-project" : "projects";
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [email, setEmail] = useState(""); const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]); const [projectsLoading, setProjectsLoading] = useState(false); const [projectsError, setProjectsError] = useState("");
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    api.session().then(({ user }) => { setUser(user); setScreen(route(user)); loadProjects(); }).catch(() => setScreen(route(null))).finally(() => setSessionLoading(false));
  }, []);
  useEffect(() => {
    const handleHashChange = () => setScreen(route(user));
    addEventListener("hashchange", handleHashChange);
    return () => removeEventListener("hashchange", handleHashChange);
  }, [user]);

  async function loadProjects() { setProjectsLoading(true); setProjectsError(""); try { setProjects((await api.projects()).projects); } catch (value) { setProjectsError((value as Error).message); } finally { setProjectsLoading(false); } }
  function handleAuthenticated(nextUser: User) { setUser(nextUser); location.hash = "#/projects"; setScreen("projects"); loadProjects(); }
  function navigate(next: Screen, retainedEmail = "") { setEmail(retainedEmail); const hashes: Record<Screen,string> = { login: "#/login", register: "#/register", projects: "#/projects", "new-project": "#/projects/new" }; location.hash = hashes[next]; setScreen(next); }
  async function handleSignOut() { await api.logout(); setUser(null); setProjects([]); navigate("login"); }

  if (sessionLoading) return <main className="grid min-h-screen place-items-center"><div className="size-8 animate-spin rounded-full border-3 border-soft border-t-brand motion-reduce:animate-none" aria-label="Restoring session"/></main>;
  if (!user) return screen === "register" ? <RegisterPage initialEmail={email} onRegister={handleAuthenticated} onLogin={(value) => navigate("login", value)} /> : <LoginPage initialEmail={email} onLogin={handleAuthenticated} onRegister={(value) => navigate("register", value)} />;
  if (screen === "new-project") return <NextCheckpointPage onBack={() => navigate("projects")}/>;
  return <ProjectListPage user={user} projects={projects} loading={projectsLoading} error={projectsError} onNewProject={() => navigate("new-project")} onSignOut={handleSignOut}/>;
}
