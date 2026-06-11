export default function LoadingSkeleton({ type = 'card', count = 3 }) {
  if (type === 'card') {
    return (
      <div className="cards-grid">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="card">
            <div className="skeleton skeleton-title"></div>
            <div className="skeleton skeleton-text" style={{ width: '80%' }}></div>
            <div className="skeleton skeleton-text" style={{ width: '60%' }}></div>
            <div className="skeleton skeleton-text" style={{ width: '90%' }}></div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="table-container">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border-subtle)' }}>
            <div className="skeleton skeleton-text" style={{ width: `${60 + Math.random() * 30}%` }}></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="page-loader">
      <div className="loader-spinner"></div>
    </div>
  );
}
