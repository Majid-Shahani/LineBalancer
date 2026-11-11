import { useLine } from '../context/LineContext.js';

const DOMAIN_RULE_SUMMARY = [
  {
    id: 'schema',
    title: 'AJV JSON Schema v1',
    desc: 'Enforces required fields, policy enums, station ops XOR candidates, and positive numbers.',
  },
  {
    id: 'op-ns',
    title: 'Shared Operations Namespace',
    desc: 'All operation IDs across transform, tag, and attach must be globally unique.',
  },
  {
    id: 'node-ns',
    title: 'Shared Nodes & Belts Namespace',
    desc: 'All IDs across source, splitter, station, sink, and belt must be globally unique.',
  },
  {
    id: 'item-tag',
    title: 'Item & Tag Integrity',
    desc: 'Every referenced itemId and tag must be declared in the items catalog.',
  },
  {
    id: 'port-belt',
    title: 'Bidirectional Port-Belt Agreement',
    desc: 'Belt from/to node IDs must agree with source, splitter, station, and sink ports.',
  },
  {
    id: 'dag',
    title: 'Layout Acyclicity (DAG)',
    desc: 'Conveyor belts must form a directed acyclic graph without loops.',
  },
];

export default function ValidationDrawer() {
  const { validation, isValidationOpen, setIsValidationOpen } = useLine();

  if (!isValidationOpen) return null;

  const { isValid, schemaErrors, domainErrors, warnings } = validation;

  return (
    <aside className="wb-drawer" aria-label="Validation Inspector">
      <div className="wb-drawer-header">
        <div>
          <h2 className="wb-drawer-title">Two-Tier Load-Time Validator</h2>
          <p className="wb-drawer-subtitle">
            AJV Schema v1 + Semantic Domain Checks
          </p>
        </div>
        <button
          type="button"
          className="wb-icon-btn"
          onClick={() => setIsValidationOpen(false)}
          aria-label="Close validation drawer"
        >
          ✕
        </button>
      </div>

      <div className="wb-drawer-body">
        <div
          className={`wb-banner ${isValid ? 'wb-banner-ok' : 'wb-banner-err'}`}
        >
          <strong>
            {isValid
              ? 'All Schema & Domain Checks Passing'
              : `${schemaErrors.length + domainErrors.length} Issue(s) Detected`}
          </strong>
          <span>
            {schemaErrors.length} schema error(s), {domainErrors.length} domain
            error(s), {warnings.length} warning(s)
          </span>
        </div>

        {schemaErrors.length > 0 && (
          <section className="wb-drawer-section">
            <h3 className="wb-section-heading">
              Tier 1: JSON Schema Errors ({schemaErrors.length})
            </h3>
            <ul className="wb-issue-list">
              {schemaErrors.map((err, idx) => (
                <li key={idx} className="wb-issue-item is-error">
                  <code className="wb-issue-path">{err.path}</code>
                  <span>{err.message}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {domainErrors.length > 0 && (
          <section className="wb-drawer-section">
            <h3 className="wb-section-heading">
              Tier 2: Semantic Domain Errors ({domainErrors.length})
            </h3>
            <ul className="wb-issue-list">
              {domainErrors.map((err, idx) => (
                <li key={idx} className="wb-issue-item is-error">
                  <div className="wb-issue-meta">
                    <span className="wb-badge wb-badge-red">
                      {err.category}
                    </span>
                    <code className="wb-issue-path">{err.path}</code>
                  </div>
                  <span>{err.message}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {warnings.length > 0 && (
          <section className="wb-drawer-section">
            <h3 className="wb-section-heading">Warnings ({warnings.length})</h3>
            <ul className="wb-issue-list">
              {warnings.map((w, idx) => (
                <li key={idx} className="wb-issue-item is-warning">
                  <div className="wb-issue-meta">
                    <span className="wb-badge wb-badge-amber">
                      {w.category}
                    </span>
                    <code className="wb-issue-path">{w.path}</code>
                  </div>
                  <span>{w.message}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="wb-drawer-section">
          <h3 className="wb-section-heading">Active Validation Rules</h3>
          <div className="wb-rule-cards">
            {DOMAIN_RULE_SUMMARY.map((rule) => (
              <div key={rule.id} className="wb-rule-card">
                <div className="wb-rule-title">{rule.title}</div>
                <p className="wb-rule-desc">{rule.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}
