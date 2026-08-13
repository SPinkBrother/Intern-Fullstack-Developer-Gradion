import { useEffect, useState } from "react";
import { api, type Character, type Project } from "./api";

const PREVIEW_LENGTH = 320;
const STAGES = ["Style", "Characters", "Portraits", "Chapters", "Illustrations"] as const;

export function ProjectDetailPage({ project, loading, error, authorName, onBack }: { project: Project | null; loading: boolean; error: string; authorName: string; onBack: () => void }) {
  const [bookContent, setBookContent] = useState("");
  const [bookLoading, setBookLoading] = useState(false);
  const [bookError, setBookError] = useState("");
  const [bookOpen, setBookOpen] = useState(false);
  const [artStyle, setArtStyle] = useState("");
  const [styleSaving, setStyleSaving] = useState(false);
  const [styleMessage, setStyleMessage] = useState("");
  const [styleError, setStyleError] = useState("");
  const [savedArtStyle, setSavedArtStyle] = useState("");
  const [styleGenerating, setStyleGenerating] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [characterGenerating, setCharacterGenerating] = useState(false);
  const [portraitGenerating, setPortraitGenerating] = useState(false);
  const [pipelineError, setPipelineError] = useState("");

  useEffect(() => {
    if (!project) return;
    let active = true;
    setBookContent("");
    setBookError("");
    setBookLoading(true);
    api.book(project.id)
      .then(({ bookContent }) => { if (active) setBookContent(bookContent); })
      .catch((value) => { if (active) setBookError((value as Error).message); })
      .finally(() => { if (active) setBookLoading(false); });
    return () => { active = false; };
  }, [project?.id]);

  useEffect(() => {
    setArtStyle(project?.artStyle ?? "");
    setSavedArtStyle(project?.artStyle ?? "");
    setStyleMessage("");
    setStyleError(project?.styleError ?? "");
    setStyleGenerating(project?.styleState === "running");
    setCharacters(project?.characters ?? []);
    setCharacterGenerating(project?.characterState === "running");
    setPortraitGenerating(project?.portraitState === "running");
    setPipelineError(project?.characterError || project?.portraitError || "");
  }, [project?.id, project?.artStyle]);

  useEffect(() => {
    if (!project || project.styleState !== "running") return;
    const timer = setInterval(() => {
      api.project(project.id).then(({ project: refreshed }) => {
        if (refreshed.styleState === "running") return;
        setStyleGenerating(false);
        setSavedArtStyle(refreshed.artStyle ?? "");
        setArtStyle(refreshed.artStyle ?? "");
        setStyleError(refreshed.styleError ?? "");
        if (refreshed.artStyle) setStyleMessage("Art style generated from the book.");
        clearInterval(timer);
      }).catch(() => undefined);
    }, 2000);
    return () => clearInterval(timer);
  }, [project?.id, project?.styleState]);

  useEffect(() => {
    if (!bookOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setBookOpen(false); };
    addEventListener("keydown", closeOnEscape);
    return () => removeEventListener("keydown", closeOnEscape);
  }, [bookOpen]);

  const preview = bookContent.length > PREVIEW_LENGTH ? `${bookContent.slice(0, PREVIEW_LENGTH).trimEnd()}…` : bookContent;

  async function saveArtStyle() {
    if (!project || styleSaving) return;
    setStyleSaving(true);
    setStyleMessage("");
    setStyleError("");
    try {
      const { project: savedProject } = await api.saveArtStyle(project.id, artStyle);
      setArtStyle(savedProject.artStyle ?? "");
      setSavedArtStyle(savedProject.artStyle ?? "");
      setStyleMessage(savedProject.artStyle ? "Art style saved." : "No manual style saved. Gemini will base it on the book text later.");
    } catch (value) {
      setStyleError((value as Error).message);
    } finally {
      setStyleSaving(false);
    }
  }

  async function generateArtStyle() {
    if (!project || styleGenerating) return;
    setStyleGenerating(true);
    setStyleMessage("");
    setStyleError("");
    try {
      const { project: generatedProject } = await api.generateArtStyle(project.id);
      setSavedArtStyle(generatedProject.artStyle ?? "");
      setArtStyle(generatedProject.artStyle ?? "");
      setStyleMessage("Art style generated from the book.");
    } catch (value) {
      setStyleError((value as Error).message);
    } finally {
      setStyleGenerating(false);
    }
  }

  async function generateCharacters() {
    if (!project || characterGenerating) return;
    setCharacterGenerating(true); setPipelineError("");
    try { setCharacters((await api.generateCharacters(project.id)).project.characters ?? []); }
    catch (value) { setPipelineError((value as Error).message); }
    finally { setCharacterGenerating(false); }
  }

  async function generatePortraits() {
    if (!project || portraitGenerating) return;
    setPortraitGenerating(true); setPipelineError("");
    try { setCharacters((await api.generatePortraits(project.id)).project.characters ?? []); }
    catch (value) { setPipelineError((value as Error).message); }
    finally { setPortraitGenerating(false); }
  }

  const portraitsComplete = characters.length > 0 && characters.every((character) => character.portraitFile);
  const currentStage = portraitsComplete ? 3 : characters.length ? 2 : savedArtStyle ? 1 : 0;

  return (
    <main className="min-h-screen bg-page px-4 py-10 sm:px-8 sm:py-14">
      <section className="mx-auto w-full max-w-4xl">
        <button className="mb-8 text-sm font-bold text-brand hover:text-brand-hover" onClick={onBack}>← Back to projects</button>
        {loading ? <div className="h-52 animate-pulse rounded-2xl bg-soft motion-reduce:animate-none" aria-label="Loading project" /> : error ? <div className="rounded-xl border border-danger/25 bg-danger/10 p-5 text-danger" role="alert">{error}</div> : project ? (
          <div className="rounded-2xl border border-line bg-surface p-7 shadow-card sm:p-10">
            <span className="mb-3 inline-flex rounded-full bg-stone-200 px-3 py-1 text-xs font-bold text-muted">{project.status === "draft" ? "Draft" : project.status === "failed" ? "Failed" : project.status === "completed" ? "Done" : "In progress"}</span>
            <h1 className="font-display text-4xl text-ink sm:text-5xl">{project.title}</h1>
            <p className="mt-2 text-sm text-muted">Created {formatDate(project.createdAt)} by {authorName}</p>
            <StageProgress currentIndex={currentStage} />
            <div className="mt-7 rounded-xl border border-line bg-soft/35 p-5">
              <p className="font-bold text-ink">{currentStage === 0 ? "Current stage: Style." : currentStage === 1 ? "Ready for the next stage: Characters." : currentStage === 2 ? "Ready for the next stage: Portraits." : "Ready for the next stage: Chapters."}</p>
              <p className="mt-2 text-sm leading-6 text-muted">{currentStage === 0 ? "Save a manual style below, or leave it blank for Gemini to derive from the book." : currentStage === 1 ? "Gemini will identify no more than two main adult characters." : currentStage === 2 ? "Portraits are generated one at a time and saved locally." : "Characters and portraits are ready for the later chapter step."}</p>
              {currentStage === 1 && <button className="mt-4 rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white disabled:opacity-60" disabled={characterGenerating} onClick={() => void generateCharacters()}>{characterGenerating ? "Generating characters…" : "Generate Characters →"}</button>}
              {currentStage === 2 && <button className="mt-4 rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white disabled:opacity-60" disabled={portraitGenerating} onClick={() => void generatePortraits()}>{portraitGenerating ? "Generating portraits…" : "Generate Portraits →"}</button>}
              {pipelineError && <p className="mt-3 text-sm text-danger" role="alert">{pipelineError}</p>}
            </div>
            <form className="mt-8 rounded-xl border border-line bg-surface p-5" onSubmit={(event) => { event.preventDefault(); void saveArtStyle(); }}>
              <label className="font-display text-2xl text-ink" htmlFor="art-style">Art style</label>
              <p className="mt-2 text-sm leading-6 text-muted" id="art-style-help">Optional. Leave this blank and the style will be based on the book text later.</p>
              <textarea className="mt-4 min-h-28 w-full resize-y rounded-lg border border-line bg-page px-4 py-3 text-ink outline-none placeholder:text-muted/70 focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-70" id="art-style" aria-describedby="art-style-help" maxLength={1000} disabled={characters.length > 0} placeholder="Example: Warm hand-painted watercolor with soft ink outlines" value={artStyle} onChange={(event) => { setArtStyle(event.target.value); setStyleMessage(""); setStyleError(""); }} />
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <button className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={styleSaving || styleGenerating || characters.length > 0}>{styleSaving ? "Saving…" : "Save art style"}</button>
                {!savedArtStyle && <button className="rounded-lg border border-brand px-5 py-3 text-sm font-bold text-brand hover:bg-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60" type="button" disabled={styleGenerating || styleSaving} onClick={() => void generateArtStyle()}>{styleGenerating ? "Generating from book…" : "Generate style from book"}</button>}
                {styleMessage && <p className="text-sm font-bold text-success" role="status">{styleMessage}</p>}
                {styleError && <p className="text-sm text-danger" role="alert">{styleError}</p>}
              </div>
            </form>
            {characters.length > 0 && <section className="mt-8" aria-labelledby="characters-title">
              <h2 className="font-display text-2xl text-ink" id="characters-title">Characters ({characters.length})</h2>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">{characters.map((character) => <article className="overflow-hidden rounded-xl border border-line bg-surface" key={character.id}>
                {character.portraitFile ? <img className="aspect-[3/4] w-full object-cover" src={api.portraitUrl(project.id, character.id)} alt={`Portrait of ${character.name}`} /> : <div className="grid aspect-[3/4] place-items-center bg-soft/60 text-sm font-bold text-muted">Portrait pending</div>}
                <div className="p-5"><h3 className="font-display text-xl text-ink">{character.name}</h3><p className="mt-1 text-xs font-bold uppercase tracking-wider text-brand">Adult · age {character.age}</p><p className="mt-3 leading-6 text-muted">{character.description}</p></div>
              </article>)}</div>
            </section>}
            <div className="mt-8 rounded-xl border border-line bg-soft/35 p-5">
              <h2 className="font-display text-2xl text-ink">Book preview</h2>
              {bookLoading ? <div className="mt-4 h-24 animate-pulse rounded-lg bg-line/60 motion-reduce:animate-none" aria-label="Loading book preview" /> : bookError ? <p className="mt-3 text-danger" role="alert">{bookError}</p> : (
                <>
                  <p className="mt-3 whitespace-pre-wrap leading-7 text-ink">{preview}</p>
                  {bookContent.length > PREVIEW_LENGTH && <button className="mt-5 rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" onClick={() => setBookOpen(true)}>Read full book</button>}
                </>
              )}
            </div>
          </div>
        ) : null}
      </section>
      {bookOpen && project && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/45 p-4" role="dialog" aria-modal="true" aria-labelledby="book-dialog-title">
          <section className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <h2 id="book-dialog-title" className="font-display text-3xl text-ink">{project.title}</h2>
              <button className="rounded-lg border border-line px-4 py-2 text-sm font-bold text-brand hover:bg-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" onClick={() => setBookOpen(false)}>Close book</button>
            </div>
            <div className="mt-5 overflow-y-auto rounded-xl bg-page p-5">
              <p className="whitespace-pre-wrap leading-8 text-ink">{bookContent}</p>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function StageProgress({ currentIndex }: { currentIndex: number }) {
  return (
    <nav className="mt-9 overflow-x-auto pb-2" aria-label="Illustration stages">
      <ol className="flex min-w-[720px] items-center">
        {STAGES.map((stage, index) => {
          const state = index < currentIndex ? "complete" : index === currentIndex ? "current step" : "not started";
          const complete = state === "complete";
          const current = state === "current step";
          return (
            <li className="flex min-w-0 flex-1 items-center last:flex-none" key={stage}>
              <span className="flex items-center gap-2 whitespace-nowrap" aria-label={`${stage} ${state}`}>
                <span className={`grid size-8 place-items-center rounded-full text-sm font-bold ${complete ? "bg-success text-white" : current ? "bg-brand text-white shadow-[0_0_0_5px_rgb(138_90_68_/_0.12)]" : "bg-line text-muted"}`}>{complete ? "✓" : index + 1}</span>
                <span className={`text-sm font-bold ${complete || current ? "text-ink" : "text-muted/65"}`}>{stage}</span>
              </span>
              {index < STAGES.length - 1 && <span className={`mx-4 h-px min-w-8 flex-1 ${index < currentIndex ? "bg-success/70" : "bg-line"}`} aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function formatDate(value: string) { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value)); }
