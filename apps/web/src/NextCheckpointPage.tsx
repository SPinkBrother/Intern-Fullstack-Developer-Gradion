export function NextCheckpointPage({ onBack }: { onBack: () => void }) {
  return <main className="next-checkpoint"><section><span className="eyebrow">Next checkpoint</span><h1>New project</h1><p>The navigation and route are ready. The upload and paste form will be implemented only after you approve the project-list checkpoint.</p><button className="primary" onClick={onBack}>← Back to projects</button></section></main>;
}
