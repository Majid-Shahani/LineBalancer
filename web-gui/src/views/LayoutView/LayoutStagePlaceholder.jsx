import { useLine } from '../../context/LineContext.js';

export default function LayoutStagePlaceholder() {
  const { model, setActiveStage } = useLine();
  const { source, splitter, station, sink, belt } = model.nodes;
  const layoutEntries = Object.entries(model.ui?.layout || {});

  return (
    <div className="wb-stage-container">
      <div className="wb-card">
        <div className="wb-card-header">
          <div>
            <h2 className="wb-card-title">Line Layout Architect</h2>
            <p className="wb-card-subtitle">
              Current model nodes, belts, and explicit <code>ui.layout</code>{' '}
              coordinates
            </p>
          </div>
          <button
            type="button"
            className="wb-btn wb-btn-secondary"
            onClick={() => setActiveStage('recipe')}
          >
            ← Back to Recipe
          </button>
        </div>

        <div className="wb-summary-grid">
          <div className="wb-stat-box">
            <span className="wb-stat-label">Sources</span>
            <strong className="wb-stat-value">{source.length}</strong>
            <span className="wb-stat-meta">
              {source.map((s) => `${s.id}: ${s.itemId}`).join(', ') || 'None'}
            </span>
          </div>

          <div className="wb-stat-box">
            <span className="wb-stat-label">Splitters</span>
            <strong className="wb-stat-value">{splitter.length}</strong>
            <span className="wb-stat-meta">
              {splitter
                .map((sp) => `${sp.id}: ${sp.outputPolicy || 'shortestQueue'}`)
                .join(', ') || 'None'}
            </span>
          </div>

          <div className="wb-stat-box">
            <span className="wb-stat-label">Stations</span>
            <strong className="wb-stat-value">{station.length}</strong>
            <span className="wb-stat-meta">
              {station.map((st) => st.id).join(', ') || 'None'}
            </span>
          </div>

          <div className="wb-stat-box">
            <span className="wb-stat-label">Sinks</span>
            <strong className="wb-stat-value">{sink.length}</strong>
            <span className="wb-stat-meta">
              {sink.map((sk) => `${sk.id}: ${sk.needs.itemId}`).join(', ') ||
                'None'}
            </span>
          </div>

          <div className="wb-stat-box">
            <span className="wb-stat-label">Conveyor Belts</span>
            <strong className="wb-stat-value">{belt.length}</strong>
            <span className="wb-stat-meta">
              {belt.map((b) => `${b.id}: ${b.from}→${b.to}`).join(', ') ||
                'None'}
            </span>
          </div>

          <div className="wb-stat-box">
            <span className="wb-stat-label">Saved ui.layout Coords</span>
            <strong className="wb-stat-value">{layoutEntries.length}</strong>
            <span className="wb-stat-meta">
              {layoutEntries
                .map(([id, pos]) => `${id}: ${pos.x}, ${pos.y}`)
                .join(' | ') || 'None'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
