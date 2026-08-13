import { useEffect, useState } from "react";
import { api, type Character, type Project } from "./api";

declare const __GEMINI_MOCK_MODE__: boolean;

const PREVIEW_LENGTH = 320;
const STAGES = ["Style", "Characters", "Portraits", "Chapters", "Illustrations"] as const;

export function ProjectDetailPage({ project, loading, error, authorName, onBack }: { project: Project | null; loading: boolean; error: string; authorName: string; onBack: () => void }) {
  const [bookContent, setBookContent] = useState("");
  const [projectStatus, setProjectStatus] = useState<Project["status"]>("draft");
  const [bookLoading, setBookLoading] = useState(false);
  const [bookError, setBookError] = useState("");
  const [bookOpen, setBookOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [artStyle, setArtStyle] = useState("");
  const [styleSaving, setStyleSaving] = useState(false);
  const [styleMessage, setStyleMessage] = useState("");
  const [styleError, setStyleError] = useState("");
  const [savedArtStyle, setSavedArtStyle] = useState("");
  const [styleGenerating, setStyleGenerating] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [characterGenerating, setCharacterGenerating] = useState(false);
  const [portraitGenerating, setPortraitGenerating] = useState(false);
  const [chapterTitle, setChapterTitle] = useState("");
  const [scenePrompt, setScenePrompt] = useState("");
  const [chapterCreated, setChapterCreated] = useState(false);
  const [chapterGenerating, setChapterGenerating] = useState(false);
  const [chapterSaving, setChapterSaving] = useState(false);
  const [chapterMessage, setChapterMessage] = useState("");
  const [illustrationState, setIllustrationState] = useState<"idle" | "running" | "failed" | "completed">("idle");
  const [illustrationError, setIllustrationError] = useState("");
  const [illustrationFile, setIllustrationFile] = useState("");
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
    setProjectStatus(project?.status ?? "draft");
    setSavedArtStyle(project?.artStyle ?? "");
    setStyleMessage("");
    setStyleError(project?.styleError ?? "");
    setStyleGenerating(project?.styleState === "running");
    setCharacters(project?.characters ?? []);
    setCharacterGenerating(project?.characterState === "running");
    setPortraitGenerating(project?.portraitState === "running");
    setChapterTitle(project?.chapters?.[0]?.title ?? "");
    setScenePrompt(project?.chapters?.[0]?.scenePrompt ?? "");
    setChapterCreated(Boolean(project?.chapters?.length));
    setChapterGenerating(project?.chapterState === "running");
    setChapterMessage("");
    setIllustrationState(project?.stepState?.illustrations?.state ?? "idle");
    setIllustrationError(project?.stepState?.illustrations?.error ?? "");
    setIllustrationFile(project?.chapters?.[0]?.illustrationFile ?? "");
    setPipelineError(project?.characterError || project?.portraitError || project?.chapterError || "");
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
    if (!project || illustrationState !== "running") return;
    const timer = setInterval(() => {
      api.project(project.id).then(({ project: refreshed }) => {
        const step = refreshed.stepState?.illustrations;
        setIllustrationState(step?.state ?? "idle");
        setIllustrationError(step?.error ?? "");
        setIllustrationFile(refreshed.chapters?.[0]?.illustrationFile ?? "");
        setProjectStatus(refreshed.status);
        if (step?.state !== "running") clearInterval(timer);
      }).catch(() => undefined);
    }, 2000);
    return () => clearInterval(timer);
  }, [project?.id, illustrationState]);

  useEffect(() => {
    if (!bookOpen && !detailsOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setBookOpen(false);
      setDetailsOpen(false);
    };
    addEventListener("keydown", closeOnEscape);
    return () => removeEventListener("keydown", closeOnEscape);
  }, [bookOpen, detailsOpen]);

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

  async function generateChapter() {
    if (!project || chapterGenerating) return;
    setChapterGenerating(true); setPipelineError(""); setChapterMessage("");
    try {
      const generated = (await api.generateChapter(project.id)).project.chapters?.[0];
      setChapterTitle(generated?.title ?? "");
      setScenePrompt(generated?.scenePrompt ?? "");
      setChapterCreated(Boolean(generated));
    } catch (value) { setPipelineError((value as Error).message); }
    finally { setChapterGenerating(false); }
  }

  async function saveChapter() {
    if (!project || chapterSaving) return;
    if (!chapterTitle.trim() || !scenePrompt.trim()) { setPipelineError("Enter a chapter title and scene prompt."); return; }
    setChapterSaving(true); setPipelineError(""); setChapterMessage("");
    try {
      const saved = (await api.saveChapter(project.id, chapterTitle, scenePrompt)).project.chapters?.[0];
      setChapterTitle(saved?.title ?? "");
      setScenePrompt(saved?.scenePrompt ?? "");
      setChapterMessage("Chapter prompt saved.");
    } catch (value) { setPipelineError((value as Error).message); }
    finally { setChapterSaving(false); }
  }

  async function generateIllustration() {
    if (!project || illustrationState === "running") return;
    setIllustrationState("running");
    setProjectStatus("in_progress");
    setIllustrationError("");
    try {
      const generatedProject = (await api.generateIllustration(project.id)).project;
      setIllustrationState(generatedProject.stepState?.illustrations?.state ?? "completed");
      setIllustrationError(generatedProject.stepState?.illustrations?.error ?? "");
      setIllustrationFile(generatedProject.chapters?.[0]?.illustrationFile ?? "");
      setProjectStatus(generatedProject.status);
    } catch (value) {
      setIllustrationState("failed");
      setProjectStatus("failed");
      setIllustrationError((value as Error).message);
    }
  }

  const portraitsComplete = characters.length > 0 && characters.every((character) => character.portraitFile);
  const chapterComplete = chapterCreated;
  const illustrationComplete = Boolean(illustrationFile);
  const currentStage = illustrationComplete ? 5 : chapterComplete ? 4 : portraitsComplete ? 3 : characters.length ? 2 : savedArtStyle ? 1 : 0;

  return (
    <main className="min-h-screen bg-page px-4 py-10 sm:px-8 sm:py-14">
      <DemoModeNotice enabled={__GEMINI_MOCK_MODE__} />
      <section className="mx-auto w-full max-w-4xl">
        <button className="mb-8 text-sm font-bold text-brand hover:text-brand-hover" onClick={onBack}>← Back to projects</button>
        {loading ? <div className="h-52 animate-pulse rounded-2xl bg-soft motion-reduce:animate-none" aria-label="Loading project" /> : error ? <div className="rounded-xl border border-danger/25 bg-danger/10 p-5 text-danger" role="alert">{error}</div> : project ? (
          <div className="rounded-2xl border border-line bg-surface p-7 shadow-card sm:p-10">
            <span className="mb-3 inline-flex rounded-full bg-stone-200 px-3 py-1 text-xs font-bold text-muted">{projectStatus === "draft" ? "Draft" : projectStatus === "failed" ? "Failed" : projectStatus === "completed" ? "Done" : "In progress"}</span>
            <h1 className="font-display text-4xl text-ink sm:text-5xl">{project.title}</h1>
            <p className="mt-2 text-sm text-muted">Created {formatDate(project.createdAt)} by {authorName}</p>
            <StageProgress currentIndex={currentStage} />
            <div className="mt-7 rounded-xl border border-line bg-soft/35 p-5">
              <p className="font-bold text-ink">{currentStage === 0 ? "Current stage: Style." : currentStage === 1 ? "Ready for the next stage: Characters." : currentStage === 2 ? "Ready for the next stage: Portraits." : currentStage === 3 ? "Ready for the next stage: Chapters." : currentStage === 4 ? illustrationState === "running" ? "Generating the final illustration." : "Ready for the next stage: Illustrations." : "All 5 stages complete."}</p>
              <p className="mt-2 text-sm leading-6 text-muted">{currentStage === 0 ? "Save a manual style below, or leave it blank for Gemini to derive from the book." : currentStage === 1 ? "Gemini will identify no more than two main adult characters." : currentStage === 2 ? "Portraits are generated one at a time and saved locally." : currentStage === 3 ? "Gemini will choose one meaningful scene from the book for illustration." : currentStage === 4 ? illustrationState === "running" ? "Gemini is using the saved book, character appearances, portraits, and chapter prompt." : "Review the chapter prompt below before generating its illustration." : "The final illustration is saved and available below."}</p>
              {currentStage === 1 && <button className="mt-4 rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white disabled:opacity-60" disabled={characterGenerating} onClick={() => void generateCharacters()}>{characterGenerating ? "Generating characters…" : "Generate Characters →"}</button>}
              {currentStage === 2 && <button className="mt-4 rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white disabled:opacity-60" disabled={portraitGenerating} onClick={() => void generatePortraits()}>{portraitGenerating ? "Generating portraits…" : "Generate Portraits →"}</button>}
              {currentStage === 3 && <button className="mt-4 rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white disabled:opacity-60" disabled={chapterGenerating} onClick={() => void generateChapter()}>{chapterGenerating ? "Finding a meaningful scene…" : "Generate Chapter →"}</button>}
              {currentStage === 4 && <button className="mt-4 rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={illustrationState === "running"} onClick={() => void generateIllustration()}>{illustrationState === "running" ? "Generating Illustration…" : illustrationState === "failed" ? "Retry Illustration" : "Generate Illustration"}</button>}
              {currentStage === 5 && <button className="mt-4 rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" onClick={() => setDetailsOpen(true)}>View all details</button>}
              {illustrationError && <p className="mt-3 text-sm text-danger" role="alert">{illustrationError}</p>}
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
            {illustrationComplete && <figure className="mt-8 overflow-hidden rounded-xl border border-line bg-surface">
              <img className="aspect-video w-full object-cover" src={api.illustrationUrl(project.id)} alt={`Final illustration for ${chapterTitle}`} />
              <figcaption className="p-5"><span className="text-xs font-bold uppercase tracking-[0.14em] text-success">Final illustration</span><h2 className="mt-1 font-display text-2xl text-ink">{chapterTitle}</h2></figcaption>
            </figure>}
            {chapterComplete && <form className="mt-8 rounded-xl border border-line bg-soft/35 p-5" onSubmit={(event) => { event.preventDefault(); void saveChapter(); }}>
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-brand">Chapter 1</span>
              <h2 className="mt-1 font-display text-2xl text-ink">Illustration scene</h2>
              <p className="mt-2 text-sm leading-6 text-muted">Gemini selected one meaningful scene. You can refine it before generating the final illustration.</p>
              <label className="mt-5 block text-sm font-bold text-ink" htmlFor="chapter-title">Chapter title</label>
              <input className="mt-2 w-full rounded-lg border border-line bg-page px-4 py-3 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" id="chapter-title" maxLength={160} value={chapterTitle} onChange={(event) => { setChapterTitle(event.target.value); setChapterMessage(""); }} />
              <label className="mt-5 block text-sm font-bold text-ink" htmlFor="scene-prompt">Scene prompt</label>
              <textarea className="mt-2 min-h-36 w-full resize-y rounded-lg border border-line bg-page px-4 py-3 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" id="scene-prompt" maxLength={5000} value={scenePrompt} onChange={(event) => { setScenePrompt(event.target.value); setChapterMessage(""); }} />
              <div className="mt-4 flex flex-wrap items-center gap-4"><button className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-60" type="submit" disabled={chapterSaving}>{chapterSaving ? "Saving…" : "Save chapter prompt"}</button>{chapterMessage && <p className="text-sm font-bold text-success" role="status">{chapterMessage}</p>}</div>
            </form>}
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
      {detailsOpen && project && illustrationComplete && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/45 p-4" role="dialog" aria-modal="true" aria-labelledby="details-dialog-title">
          <section className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-success">Complete project</span>
                <h2 id="details-dialog-title" className="mt-1 font-display text-3xl text-ink">{project.title} — complete project</h2>
              </div>
              <button className="shrink-0 rounded-lg border border-line px-4 py-2 text-sm font-bold text-brand hover:bg-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" onClick={() => setDetailsOpen(false)}>Close details</button>
            </div>

            <section className="mt-7 rounded-xl bg-soft/45 p-5" aria-labelledby="summary-style-title">
              <h3 id="summary-style-title" className="font-display text-2xl text-ink">1. Art style</h3>
              <p className="mt-2 whitespace-pre-wrap leading-7 text-muted">{savedArtStyle || artStyle}</p>
            </section>

            <section className="mt-6" aria-labelledby="summary-characters-title">
              <h3 id="summary-characters-title" className="font-display text-2xl text-ink">2–3. Characters and portraits</h3>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                {characters.map((character) => (
                  <article className="overflow-hidden rounded-xl border border-line bg-surface" key={character.id}>
                    {character.portraitFile && <img className="aspect-[3/4] w-full object-cover" src={api.portraitUrl(project.id, character.id)} alt={`Portrait of ${character.name} — complete project`} />}
                    <div className="p-5">
                      <h4 className="font-display text-xl text-ink">{character.name}</h4>
                      <p className="mt-1 text-xs font-bold uppercase tracking-wider text-brand">Adult · age {character.age}</p>
                      <p className="mt-3 leading-6 text-muted">{character.description}</p>
                      <p className="mt-3 text-sm leading-6 text-muted"><span className="font-bold text-ink">Appearance:</span> {character.visualPrompt}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="mt-6 rounded-xl bg-soft/45 p-5" aria-labelledby="summary-chapter-title">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-brand">4. Chapter scene</span>
              <h3 id="summary-chapter-title" className="mt-1 font-display text-2xl text-ink">{chapterTitle}</h3>
              <p className="mt-3 whitespace-pre-wrap leading-7 text-muted">{scenePrompt}</p>
            </section>

            <figure className="mt-6 overflow-hidden rounded-xl border border-line bg-surface">
              <img className="aspect-video w-full object-cover" src={api.illustrationUrl(project.id)} alt={`Final illustration for ${chapterTitle} — complete project`} />
              <figcaption className="p-5 text-sm font-bold uppercase tracking-[0.14em] text-success">5. Final illustration</figcaption>
            </figure>

            <section className="mt-6 rounded-xl border border-line bg-page p-5" aria-labelledby="summary-book-title">
              <h3 id="summary-book-title" className="font-display text-2xl text-ink">Original book</h3>
              <p className="mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap leading-8 text-ink">{bookContent}</p>
            </section>
          </section>
        </div>
      )}
    </main>
  );
}

export function DemoModeNotice({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;
  return <div className="mx-auto mb-5 w-full max-w-4xl rounded-lg border border-accent bg-soft px-4 py-3 text-center text-sm font-bold text-brand" role="status">Demo mode · Gemini calls are mocked and use no quota.</div>;
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
