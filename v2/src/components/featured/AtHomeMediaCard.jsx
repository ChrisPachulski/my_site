import './featured.css';

export default function AtHomeMediaCard({ a, onOpen }) {
  const open = () => onOpen(a.slug);
  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  };
  return (
    <article
      className="featured-tile featured at-home-media-card"
      onClick={open}
      onKeyDown={onKey}
      role="button"
      tabIndex={0}
    >
      <div className="badge">HOME THEATER · S01E11</div>
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
