import { useState, useMemo } from 'react';
import { useLine } from '../../context/LineContext.js';
import OperationModal from './OperationModal.jsx';

function PenIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function ChevronIcon({ collapsed }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
        transition: 'transform 0.15s ease',
      }}
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function formatReqPill(req) {
  if (!req) return '';
  if (Array.isArray(req.tags) && req.tags.length > 0) {
    return `${req.itemId} [${req.tags.join(', ')}]`;
  }
  return req.itemId;
}

export default function OperationsPanel() {
  const {
    model,
    saveOperation,
    deleteOperation,
    selectedRecipeEntity,
    setSelectedRecipeEntity,
  } = useLine();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [filterKind, setFilterKind] = useState('all'); // 'all' | 'transform' | 'tag' | 'attach'
  const [modalState, setModalState] = useState(null); // { kind, op }

  const flatOps = useMemo(() => {
    const list = [];
    for (const op of model.operations.transform || []) {
      list.push({ ...op, kind: 'transform' });
    }
    for (const op of model.operations.tag || []) {
      list.push({ ...op, kind: 'tag' });
    }
    for (const op of model.operations.attach || []) {
      list.push({ ...op, kind: 'attach' });
    }
    return list;
  }, [model.operations]);

  const filteredOps = useMemo(() => {
    if (filterKind === 'all') return flatOps;
    return flatOps.filter((op) => op.kind === filterKind);
  }, [flatOps, filterKind]);

  const getStationsUsingOp = (opId) => {
    const stations = [];
    for (const st of model.nodes.station || []) {
      const inOps = (st.ops || []).some((e) => e.opId === opId);
      const inCand = (st.candidates || []).some((e) => e.opId === opId);
      if (inOps || inCand) stations.push(st.id);
    }
    return stations;
  };

  return (
    <section className={`wb-card ${isCollapsed ? 'is-collapsed' : ''}`}>
      <div className="wb-card-header">
        <button
          type="button"
          className="wb-collapse-trigger"
          onClick={() => setIsCollapsed((v) => !v)}
          aria-expanded={!isCollapsed}
        >
          <span className="wb-collapse-icon">
            <ChevronIcon collapsed={isCollapsed} />
          </span>
          <div>
            <h2 className="wb-card-title">Operations Catalog</h2>
            <p className="wb-card-subtitle">
              Shared ID namespace across <code>transform</code>,{' '}
              <code>tag</code>, and <code>attach</code>
            </p>
          </div>
        </button>

        <button
          type="button"
          className="wb-btn wb-btn-primary"
          onClick={() =>
            setModalState({
              kind: filterKind === 'all' ? 'transform' : filterKind,
              op: null,
            })
          }
        >
          + New Operation
        </button>
      </div>

      {!isCollapsed && (
        <>
          <div className="wb-filter-tabs">
            {[
              { id: 'all', label: 'All' },
              { id: 'transform', label: 'transform' },
              { id: 'tag', label: 'tag' },
              { id: 'attach', label: 'attach' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`wb-filter-tab ${
                  filterKind === tab.id ? 'is-active' : ''
                }`}
                onClick={() => setFilterKind(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="wb-op-list">
            {filteredOps.length === 0 ? (
              <p className="wb-empty-state">
                No operations in this group. Click &ldquo;+ New Operation&rdquo;
                to add one.
              </p>
            ) : (
              filteredOps.map((op) => {
                const isSelected =
                  selectedRecipeEntity?.type === 'op' &&
                  selectedRecipeEntity?.id === op.id;
                const stationsUsing = getStationsUsingOp(op.id);

                return (
                  <div
                    key={`${op.kind}-${op.id}`}
                    className={`wb-op-card ${isSelected ? 'is-selected' : ''}`}
                    onClick={() =>
                      setSelectedRecipeEntity(
                        isSelected
                          ? null
                          : {
                              type: 'op',
                              id: op.id,
                              kind: op.kind,
                            }
                      )
                    }
                  >
                    <div className="wb-op-top">
                      <div className="wb-op-title-group">
                        <span className={`wb-kind-badge is-${op.kind}`}>
                          {op.kind}
                        </span>
                        <span className="wb-mono-id">{op.id}</span>
                      </div>

                      <div className="wb-row-gap">
                        <button
                          type="button"
                          className="wb-action-icon-btn"
                          title={`Edit operation ${op.id}`}
                          aria-label={`Edit operation ${op.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setModalState({ kind: op.kind, op });
                          }}
                        >
                          <PenIcon />
                        </button>
                        <button
                          type="button"
                          className="wb-action-icon-btn is-danger"
                          title={`Delete operation ${op.id}`}
                          aria-label={`Delete operation ${op.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteOperation(op.kind, op.id);
                          }}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>

                    <div className="wb-op-flow">
                      <span className="wb-flow-pill">
                        needs: <strong>{formatReqPill(op.needs)}</strong>
                      </span>

                      {op.kind === 'attach' && (
                        <>
                          <span className="wb-flow-arrow">+</span>
                          <span className="wb-flow-pill is-consume">
                            consumes:{' '}
                            <strong>
                              {(op.consumes || [])
                                .map(formatReqPill)
                                .join(' + ')}
                            </strong>
                          </span>
                        </>
                      )}

                      <span className="wb-flow-arrow">➔</span>

                      {op.kind === 'transform' ? (
                        <span className="wb-flow-pill is-output">
                          output: <strong>{op.output}</strong>
                        </span>
                      ) : (
                        <span className="wb-flow-pill is-adds">
                          adds: <strong>+{(op.adds || []).join(', +')}</strong>
                        </span>
                      )}
                    </div>

                    {stationsUsing.length > 0 && (
                      <div className="wb-op-stations">
                        Stations:{' '}
                        {stationsUsing.map((st) => (
                          <code key={st} className="wb-mini-code">
                            {st}
                          </code>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {modalState && (
        <OperationModal
          items={model.items}
          initialKind={modalState.kind}
          initialOp={modalState.op}
          onSave={saveOperation}
          onClose={() => setModalState(null)}
        />
      )}
    </section>
  );
}
