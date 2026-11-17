import { useState } from 'react';
import { useLine } from '../context/LineContext.js';
import { serializeModel } from '../utils/serializer.js';

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
    title: 'Layout Acyclicity',
    desc: 'Conveyor belts must form a directed acyclic graph without loops.',
  },
];

export default function JsonDrawer() {
  const {
    model,
    setModel,
    validation,
    isJsonDrawerOpen,
    setIsJsonDrawerOpen,
    isValidationOpen,
    setIsValidationOpen,
  } = useLine();

  const [draftText, setDraftText] = useState(null);
  const [parseError, setParseError] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isJsonDrawerOpen) return null;

  const canonicalText = serializeModel(model);
  const displayedText = draftText !== null ? draftText : canonicalText;
  const { isValid, schemaErrors, domainErrors, warnings } = validation;
  const versionMatchesAndValid = model.version === 1 && isValid;

  const handleApplyJson = () => {
    if (draftText === null) return;
    try {
      const parsed = JSON.parse(draftText);
      setModel(parsed);
      setDraftText(null);
      setParseError('');
    } catch (err) {
      setParseError(err.message);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(canonicalText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Ignore clipboard failures
    }
  };

  return (
    <aside
      className="wb-drawer wb-drawer-wide"
      aria-label="Live JSON Inspector"
    >
      <div className="wb-drawer-header">
        <div>
          <h2 className="wb-drawer-title">
            {isValidationOpen
              ? 'V1 Schema & Load-Time Validator'
              : 'Live JSON v1 Document'}
          </h2>
          <p className="wb-drawer-subtitle">
            {isValidationOpen
              ? 'AJV JSON Schema v1 + Semantic Domain Checks'
              : 'Normalized format dictionary'}
          </p>
        </div>

        <div className="wb-row-gap">
          <button
            type="button"
            className={`wb-btn wb-btn-sm ${
              isValidationOpen ? 'wb-btn-primary' : 'wb-btn-secondary'
            } ${!versionMatchesAndValid ? 'wb-schema-btn-invalid' : ''}`}
            onClick={() => setIsValidationOpen((v) => !v)}
          >
            <span
              className="wb-status-dot"
              style={{
                background: versionMatchesAndValid ? '#10b981' : '#ef4444',
              }}
            />
            Schema
          </button>

          {!isValidationOpen && (
            <>
              <button
                type="button"
                className="wb-btn wb-btn-secondary wb-btn-sm"
                onClick={handleCopy}
              >
                {copied ? 'Copied!' : 'Copy JSON'}
              </button>
              {draftText !== null && (
                <>
                  <button
                    type="button"
                    className="wb-btn wb-btn-secondary wb-btn-sm"
                    onClick={() => {
                      setDraftText(null);
                      setParseError('');
                    }}
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    className="wb-btn wb-btn-primary wb-btn-sm"
                    onClick={handleApplyJson}
                  >
                    Apply Edits
                  </button>
                </>
              )}
            </>
          )}

          <button
            type="button"
            className="wb-icon-btn"
            onClick={() => {
              setIsValidationOpen(false);
              setIsJsonDrawerOpen(false);
            }}
            aria-label="Close JSON drawer"
          >
            ✕
          </button>
        </div>
      </div>

      {isValidationOpen ? (
        <div className="wb-drawer-body">
          <div
            className={`wb-banner ${
              versionMatchesAndValid ? 'wb-banner-ok' : 'wb-banner-err'
            }`}
          >
            <strong>
              {versionMatchesAndValid
                ? 'V1 Schema & All Domain Checks Passing'
                : `${schemaErrors.length + domainErrors.length} Validation Issue(s) Detected`}
            </strong>
            <span>
              {schemaErrors.length} schema error, {domainErrors.length} domain
              error, {warnings.length} warning
            </span>
          </div>

          {schemaErrors.length > 0 && (
            <section className="wb-drawer-section">
              <h3 className="wb-section-heading">Tier 1: JSON Schema Errors</h3>
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
                Tier 2: Semantic Domain Errors
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
              <h3 className="wb-section-heading">Warnings</h3>
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
      ) : (
        <>
          {parseError && (
            <div
              className="wb-banner wb-banner-err"
              style={{ margin: '0.75rem 1rem 0' }}
            >
              <strong>JSON Syntax Error:</strong> <span>{parseError}</span>
            </div>
          )}

          <div className="wb-drawer-body wb-json-editor-wrap">
            <textarea
              className="wb-json-textarea"
              value={displayedText}
              onChange={(e) => {
                setDraftText(e.target.value);
                setParseError('');
              }}
              spellCheck={false}
            />
          </div>
        </>
      )}
    </aside>
  );
}
