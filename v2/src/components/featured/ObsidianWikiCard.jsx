import './featured.css';

export default function ObsidianWikiCard({ a, onOpen }) {
  const open = () => onOpen(a.slug);
  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  };
  return (
    <article
      className="featured-tile featured obsidian-wiki-card"
      onClick={open}
      onKeyDown={onKey}
      role="button"
      tabIndex={0}
    >
      <div className="badge">LATEST · APR 2026</div>
      <div className="cats">{a.cats}</div>
      <h4>{a.title}</h4>
      <div className="meta">
        <span>{a.date}</span>
        <span>·</span>
        <span>{a.read} read</span>
        <span style={{ marginLeft:'auto', color:'var(--accent)' }}>Read ›</span>
      </div>
    </article>
  );
}
