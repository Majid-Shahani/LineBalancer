import { useState } from 'react';
import { normalizeRequirement } from '../../utils/serializer.js';

export default function OperationModal({
  items,
  initialKind = 'transform',
  initialOp = null,
  onSave,
  onClose,
}) {
  const defaultItemId = items[0]?.id || '';

  const [kind, setKind] = useState(initialKind);
  const [opId, setOpId] = useState(initialOp?.id || '');
  const [needsItemId, setNeedsItemId] = useState(
    initialOp?.needs?.itemId || defaultItemId
  );
  const [needsTags, setNeedsTags] = useState(initialOp?.needs?.tags || []);
  const [outputItemId, setOutputItemId] = useState(
    initialOp?.output || items[1]?.id || defaultItemId
  );
  const [addsTags, setAddsTags] = useState(initialOp?.adds || []);
  const [consumesList, setConsumesList] = useState(() => {
    if (Array.isArray(initialOp?.consumes) && initialOp.consumes.length > 0) {
      return initialOp.consumes.map((c) => ({
        itemId: c.itemId || defaultItemId,
        tags: c.tags || [],
      }));
    }
    return [{ itemId: defaultItemId, tags: [] }];
  });
  const [error, setError] = useState('');

  const getAllowedTags = (itemId) => {
    const found = items.find((i) => i.id === itemId);
    return found?.tags || [];
  };

  const baseAllowedTags = getAllowedTags(needsItemId);

  const toggleTagInList = (list, tag) =>
    list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag];

  const handleNeedsItemChange = (newItemId) => {
    setNeedsItemId(newItemId);
    const valid = getAllowedTags(newItemId);
    setNeedsTags((prev) => prev.filter((t) => valid.includes(t)));
    setAddsTags((prev) => prev.filter((t) => valid.includes(t)));
  };

  const handleConsumesItemChange = (idx, newItemId) => {
    const valid = getAllowedTags(newItemId);
    setConsumesList((prev) =>
      prev.map((entry, i) =>
        i === idx
          ? {
              itemId: newItemId,
              tags: (entry.tags || []).filter((t) => valid.includes(t)),
            }
          : entry
      )
    );
  };

  const handleConsumesTagToggle = (idx, tag) => {
    setConsumesList((prev) =>
      prev.map((entry, i) =>
        i === idx
          ? {
              ...entry,
              tags: toggleTagInList(entry.tags || [], tag),
            }
          : entry
      )
    );
  };

  const handleAddConsumesRow = () => {
    setConsumesList((prev) => [...prev, { itemId: defaultItemId, tags: [] }]);
  };

  const handleRemoveConsumesRow = (idx) => {
    setConsumesList((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const trimmedId = opId.trim();
    if (!trimmedId) {
      setError('Operation ID is required.');
      return;
    }
    if (!needsItemId) {
      setError('A required base item must be selected.');
      return;
    }

    const normalizedNeeds = normalizeRequirement({
      itemId: needsItemId,
      tags: needsTags,
    });

    let payload;
    if (kind === 'transform') {
      if (!outputItemId) {
        setError('Transform operation requires an output itemId.');
        return;
      }
      payload = {
        id: trimmedId,
        needs: normalizedNeeds,
        output: outputItemId,
      };
    } else if (kind === 'tag') {
      if (addsTags.length === 0) {
        setError('Tag operation requires at least one tag in `adds`.');
        return;
      }
      payload = {
        id: trimmedId,
        needs: normalizedNeeds,
        adds: addsTags,
      };
    } else {
      if (consumesList.length === 0) {
        setError(
          'Attach operation requires a non-empty `consumes` component array.'
        );
        return;
      }
      if (addsTags.length === 0) {
        setError(
          'Attach operation requires at least one tag in `adds` on the base item.'
        );
        return;
      }
      payload = {
        id: trimmedId,
        needs: normalizedNeeds,
        consumes: consumesList.map(normalizeRequirement),
        adds: addsTags,
      };
    }

    const res = onSave(
      kind,
      payload,
      initialOp?.id || null,
      initialOp ? initialKind : null
    );
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onClose();
  };

  return (
    <div className="wb-modal-backdrop" onClick={onClose}>
      <div
        className="wb-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="wb-modal-header">
          <div>
            <h3 className="wb-modal-title">
              {initialOp ? `Edit Operation "${initialOp.id}"` : 'New Operation'}
            </h3>
            <p className="wb-modal-subtitle">
              All operations share one ID namespace across transform, tag, and
              attach
            </p>
          </div>
          <button type="button" className="wb-icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <form className="wb-modal-body" onSubmit={handleSubmit}>
          <div className="wb-form-grid">
            <label className="wb-field">
              <span className="wb-field-label">Operation Kind</span>
              <div className="wb-segmented">
                {['transform', 'tag', 'attach'].map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={`wb-seg-btn ${kind === k ? 'is-active' : ''}`}
                    onClick={() => setKind(k)}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </label>

            <label className="wb-field">
              <span className="wb-field-label">Operation ID</span>
              <input
                type="text"
                className="wb-input"
                placeholder="e.g. cut, drill, bolt, paint"
                value={opId}
                onChange={(e) => setOpId(e.target.value)}
                autoFocus
              />
            </label>
          </div>

          <div className="wb-field-box">
            <div className="wb-field-box-title">Base Item Requirement</div>
            <label className="wb-field">
              <span className="wb-field-label">Needed Item ID</span>
              <select
                className="wb-select"
                value={needsItemId}
                onChange={(e) => handleNeedsItemChange(e.target.value)}
              >
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.id}
                  </option>
                ))}
              </select>
            </label>

            <div className="wb-field">
              <span className="wb-field-label">
                Required Predecessor Tags on <code>{needsItemId}</code>
              </span>
              {baseAllowedTags.length === 0 ? (
                <p className="wb-muted-note">
                  Item <code>{needsItemId}</code> has no declared tags.
                </p>
              ) : (
                <div className="wb-chip-picker">
                  {baseAllowedTags.map((t) => {
                    const active = needsTags.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        className={`wb-pick-chip ${active ? 'is-picked' : ''}`}
                        onClick={() =>
                          setNeedsTags((prev) => toggleTagInList(prev, t))
                        }
                      >
                        {active ? '✓ ' : '+ '}
                        {t}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {kind === 'transform' && (
            <div className="wb-field-box">
              <div className="wb-field-box-title">Transform Effect</div>
              <label className="wb-field">
                <span className="wb-field-label">Output Item ID</span>
                <select
                  className="wb-select"
                  value={outputItemId}
                  onChange={(e) => setOutputItemId(e.target.value)}
                >
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.id}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {kind === 'attach' && (
            <div className="wb-field-box">
              <div className="wb-row-between">
                <div className="wb-field-box-title">Consumed Components</div>
                <button
                  type="button"
                  className="wb-btn wb-btn-secondary wb-btn-xs"
                  onClick={handleAddConsumesRow}
                >
                  + Add Component
                </button>
              </div>

              <div className="wb-consumes-list">
                {consumesList.map((cons, idx) => {
                  const consAllowedTags = getAllowedTags(cons.itemId);
                  return (
                    <div key={idx} className="wb-consumes-row">
                      <div className="wb-row-between">
                        <span className="wb-field-label">
                          Component #{idx + 1}
                        </span>
                        {consumesList.length > 1 && (
                          <button
                            type="button"
                            className="wb-text-btn wb-text-danger"
                            onClick={() => handleRemoveConsumesRow(idx)}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <select
                        className="wb-select"
                        value={cons.itemId}
                        onChange={(e) =>
                          handleConsumesItemChange(idx, e.target.value)
                        }
                      >
                        {items.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.id}
                          </option>
                        ))}
                      </select>

                      {consAllowedTags.length > 0 && (
                        <div className="wb-chip-picker">
                          {consAllowedTags.map((t) => {
                            const active = (cons.tags || []).includes(t);
                            return (
                              <button
                                key={t}
                                type="button"
                                className={`wb-pick-chip ${
                                  active ? 'is-picked' : ''
                                }`}
                                onClick={() => handleConsumesTagToggle(idx, t)}
                              >
                                {active ? '✓ ' : '+ '}
                                {t}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(kind === 'tag' || kind === 'attach') && (
            <div className="wb-field-box">
              <div className="wb-field-box-title">
                Added Tags on Base Item <code>{needsItemId}</code>
              </div>
              {baseAllowedTags.length === 0 ? (
                <p className="wb-form-error">
                  Base item <code>{needsItemId}</code> has no tags declared. Add
                  tags to <code>{needsItemId}</code> in the Items panel first.
                </p>
              ) : (
                <div className="wb-chip-picker">
                  {baseAllowedTags.map((t) => {
                    const active = addsTags.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        className={`wb-pick-chip ${active ? 'is-picked' : ''}`}
                        onClick={() =>
                          setAddsTags((prev) => toggleTagInList(prev, t))
                        }
                      >
                        {active ? '✓ ' : '+ '}
                        {t}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {error && <p className="wb-form-error">{error}</p>}

          <div className="wb-modal-footer">
            <button
              type="button"
              className="wb-btn wb-btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="wb-btn wb-btn-primary">
              {initialOp ? 'Save Operation' : 'Create Operation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
