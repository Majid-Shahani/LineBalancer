import { useState } from 'react';

export default function ItemModal({ initialItem = null, onSave, onClose }) {
  const [itemId, setItemId] = useState(initialItem?.id || '');
  const [tags, setTags] = useState(() =>
    Array.isArray(initialItem?.tags) ? [...initialItem.tags] : []
  );
  const [tagDraft, setTagDraft] = useState('');
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const [error, setError] = useState('');

  const handleAddTag = () => {
    const trimmed = tagDraft.trim();
    if (!trimmed) return;
    if (!tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setTagDraft('');
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const moveTag = (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= tags.length || fromIdx === toIdx) return;
    setTags((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  const handleDragStart = (e, idx) => {
    setDraggedIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  };

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIdx !== idx) {
      setDragOverIdx(idx);
    }
  };

  const handleDrop = (e, targetIdx) => {
    e.preventDefault();
    const sourceIdx =
      draggedIdx !== null
        ? draggedIdx
        : parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (!Number.isNaN(sourceIdx) && sourceIdx !== targetIdx) {
      moveTag(sourceIdx, targetIdx);
    }
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const trimmedId = itemId.trim();
    if (!trimmedId) {
      setError('Item ID is required.');
      return;
    }

    const pendingTag = tagDraft.trim();
    const finalTags =
      pendingTag && !tags.includes(pendingTag) ? [...tags, pendingTag] : tags;

    const res = onSave(trimmedId, finalTags, initialItem?.id || null);
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
              {initialItem ? `Edit Item "${initialItem.id}"` : 'Add Item'}
            </h3>
            <p className="wb-modal-subtitle">
              Configure item identifier and state tags
            </p>
          </div>
          <button type="button" className="wb-icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <form className="wb-modal-body" onSubmit={handleSubmit}>
          <div className="wb-field-box">
            <label className="wb-field">
              <span className="wb-field-label">Item ID</span>
              <input
                type="text"
                className="wb-input"
                placeholder="e.g. raw, part, bolt, product"
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
                autoFocus
              />
            </label>

            <div className="wb-inline-form">
              <input
                type="text"
                className="wb-input"
                placeholder="Enter tag name..."
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <button
                type="button"
                className="wb-btn wb-btn-secondary"
                onClick={handleAddTag}
              >
                + Add Tag
              </button>
            </div>

            {tags.length === 0 ? (
              <p className="wb-muted-note">No tags assigned to this item.</p>
            ) : (
              <ul
                className="wb-tag-scroll-list"
                aria-label="Sortable item tags"
              >
                {tags.map((t, idx) => {
                  const isDragging = draggedIdx === idx;
                  const isDragOver = dragOverIdx === idx && draggedIdx !== idx;
                  return (
                    <li
                      key={t}
                      className={`wb-tag-sort-row ${
                        isDragging ? 'is-dragging' : ''
                      } ${isDragOver ? 'is-drag-over' : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={(e) => handleDrop(e, idx)}
                      onDragEnd={handleDragEnd}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          moveTag(idx, idx - 1);
                        } else if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          moveTag(idx, idx + 1);
                        }
                      }}
                    >
                      <div className="wb-tag-sort-left">
                        <span
                          className="wb-drag-grip"
                          title="Drag to reorder tag"
                          aria-hidden="true"
                        >
                          ⋮⋮
                        </span>
                        <span className="wb-tag-sort-name">{t}</span>
                      </div>

                      <div className="wb-tag-sort-actions">
                        <button
                          type="button"
                          className="wb-action-icon-btn wb-sort-btn"
                          onClick={() => moveTag(idx, idx - 1)}
                          disabled={idx === 0}
                          title="Move tag up"
                          aria-label={`Move ${t} up`}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="wb-action-icon-btn wb-sort-btn"
                          onClick={() => moveTag(idx, idx + 1)}
                          disabled={idx === tags.length - 1}
                          title="Move tag down"
                          aria-label={`Move ${t} down`}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="wb-action-icon-btn is-danger wb-sort-btn"
                          onClick={() => handleRemoveTag(t)}
                          title={`Remove tag ${t}`}
                          aria-label={`Remove tag ${t}`}
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

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
              {initialItem ? 'Save Item' : 'Create Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
