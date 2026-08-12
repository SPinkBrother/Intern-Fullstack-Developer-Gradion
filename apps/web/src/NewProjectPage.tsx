import { useRef, useState, type ChangeEvent, type SubmitEvent } from "react";
import { api, type Project } from "./api";

export function NewProjectPage({ onBack, onCreated }: { onBack: () => void; onCreated: (project: Project) => void }) {
  const [title, setTitle] = useState("");
  const [bookContent, setBookContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!title.trim()) { setError("Project title is required."); titleRef.current?.focus(); return; }
    if (!bookContent.trim()) { setError("Book content is required. Paste text or upload a .txt file."); contentRef.current?.focus(); return; }
    setBusy(true);
    try { onCreated((await api.createProject(title, bookContent)).project); }
    catch (value) { setError((value as Error).message); }
    finally { setBusy(false); }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".txt")) {
      setError("Choose a .txt file."); setFileName(""); event.target.value = ""; return;
    }
    try {
      setBookContent(await readTextFile(file));
      setFileName(file.name);
      setError("");
    } catch { setError("The text file could not be read."); }
  }

  return (
    <main className="min-h-screen bg-page bg-[radial-gradient(circle_at_15%_0,#fffaf5_0,transparent_30%)] px-4 py-10 sm:px-8 sm:py-14">
      <form className="mx-auto w-full max-w-3xl rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-10" onSubmit={handleSubmit} noValidate>
        <button className="mb-8 text-sm font-bold text-brand hover:text-brand-hover" type="button" onClick={onBack}>← Back to projects</button>
        <span className="mb-2 block text-[0.71rem] font-bold uppercase tracking-[0.14em] text-brand">Start a visual world</span>
        <h1 className="font-display text-4xl text-ink sm:text-5xl">New project</h1>
        <p className="mt-3 max-w-xl leading-7 text-muted">Name the project, then paste your book text or load it from a plain-text file.</p>

        <label className="mt-8 block text-sm font-bold text-ink">Project title
          <input className="mt-2 w-full rounded-lg border border-line bg-white/70 px-4 py-3 text-ink placeholder:text-muted/65 focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/10" ref={titleRef} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="The Secret Garden" autoFocus />
        </label>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <label className="text-sm font-bold text-ink" htmlFor="book-content">Book content</label>
          <label className="cursor-pointer rounded-lg border border-line bg-soft/55 px-4 py-2 text-sm font-bold text-brand transition hover:border-accent hover:bg-soft">
            Upload a .txt file
            <input className="sr-only" type="file" accept=".txt,text/plain" onChange={handleFileChange} />
          </label>
        </div>
        {fileName && <p className="mt-2 text-sm font-semibold text-success">Loaded: <strong>{fileName}</strong></p>}
        <textarea id="book-content" className="mt-2 min-h-64 w-full resize-y rounded-lg border border-line bg-white/70 px-4 py-3 leading-7 text-ink placeholder:text-muted/65 focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/10" ref={contentRef} value={bookContent} onChange={(event) => { setBookContent(event.target.value); setFileName(""); }} placeholder="Paste the book text here…" />
        <p className="mt-2 text-xs leading-5 text-muted">Plain text only. The content is stored locally and uploaded to Gemini only in a later pipeline step.</p>

        {error && <div className="mt-5 rounded-lg border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">{error}</div>}
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button className="rounded-lg px-5 py-3 font-bold text-muted hover:bg-soft/60" type="button" onClick={onBack}>Cancel</button>
          <button className="rounded-lg bg-brand px-6 py-3 font-bold text-white shadow-soft transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60" disabled={busy}>{busy ? "Creating project…" : "Create project"}</button>
        </div>
      </form>
    </main>
  );
}

function readTextFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
