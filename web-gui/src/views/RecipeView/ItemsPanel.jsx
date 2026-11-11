import { useState, useMemo } from 'react';
import { useLine } from '../../context/LineContext.js';
import ItemModal from './ItemModal.jsx';

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

export default function ItemsPanel() {
  const {
    model,
    addItem,
    updateItem,
    deleteItem,
    selectedRecipeEntity,
    setSelectedRecipeEntity,
  } = useLine();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [filterKind, setFilterKind] = useState('all'); // 'all' | 'tagged' | 'untagged'
  const [modalItem, setModalItem] = useState(undefined); // undefined = closed, null = new, object = edit

  const filteredItems = useMemo(() => {
    if (filterKind === 'tagged') {
      return model.items.filter((i) => (i.tags || []).length > 0);
    }
    if (filterKind === 'untagged') {
      return model.items.filter((i) => (i.tags || []).length === 0);
    }
    return model.items;
  }, [model.items, filterKind]);

  const handleSaveModal = (id, tags, originalId) => {
    if (originalId) {
      return updateItem(originalId, { id, tags });
    }
    return addItem(id, tags);
  };

  const getItemRoleBadges = (itemId) => {
    const badges = [];
    const isSource = model.nodes.source.some((s) => s.itemId === itemId);
    const isSink = model.nodes.sink.some((sk) => sk.needs?.itemId === itemId);
    if (isSource) badges.push({ label: 'Source Input', tone: 'blue' });
    if (isSink) badges.push({ label: 'Sink Target', tone: 'purple' });
    return badges;
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
            <h2 className="wb-card-title">Items &amp; Tag Universe</h2>
            <p className="wb-card-subtitle">
              Define item IDs and allowed state tags
            </p>
          </div>
        </button>

        <button
          type="button"
          className="wb-btn wb-btn-primary"
          onClick={() => setModalItem(null)}
        >
          + Add Item
        </button>
      </div>

      {!isCollapsed && (
        <>
          <div className="wb-filter-tabs">
            {[
              { id: 'all', label: 'All' },
              { id: 'tagged', label: 'Tagged' },
              { id: 'untagged', label: 'Untagged' },
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
            {filteredItems.length === 0 ? (
              <p className="wb-empty-state">
                No items in this view. Click &ldquo;+ Add Item&rdquo; to create
                one.
              </p>
            ) : (
              filteredItems.map((item) => {
                const isSelected =
                  selectedRecipeEntity?.type === 'item' &&
                  selectedRecipeEntity?.id === item.id;
                const roleBadges = getItemRoleBadges(item.id);
                const hasTags = (item.tags || []).length > 0;

                return (
                  <div
                    key={item.id}
                    className={`wb-op-card ${isSelected ? 'is-selected' : ''}`}
                    onClick={() =>
                      setSelectedRecipeEntity(
                        isSelected ? null : { type: 'item', id: item.id }
                      )
                    }
                  >
                    <div className="wb-op-top">
                      <div className="wb-op-title-group">
                        <span
                          className={`wb-kind-badge ${
                            hasTags ? 'is-tag' : 'is-transform'
                          }`}
                        >
                          {hasTags ? 'tagged' : 'item'}
                        </span>
                        <span className="wb-mono-id">{item.id}</span>
                        {roleBadges.map((b) => (
                          <span
                            key={b.label}
                            className={`wb-badge wb-badge-${b.tone}`}
                          >
                            {b.label}
                          </span>
                        ))}
                      </div>

                      <div className="wb-row-gap">
                        <button
                          type="button"
                          className="wb-action-icon-btn"
                          title={`Edit item ${item.id}`}
                          aria-label={`Edit item ${item.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setModalItem(item);
                          }}
                        >
                          <PenIcon />
                        </button>
                        <button
                          type="button"
                          className="wb-action-icon-btn is-danger"
                          title={`Delete item ${item.id}`}
                          aria-label={`Delete item ${item.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteItem(item.id);
                          }}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>

                    <div className="wb-op-flow">
                      <span className="wb-flow-pill">
                        tags:{' '}
                        <strong>
                          {hasTags ? item.tags.join(', ') : 'None'}
                        </strong>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {modalItem !== undefined && (
        <ItemModal
          initialItem={modalItem}
          onSave={handleSaveModal}
          onClose={() => setModalItem(undefined)}
        />
      )}
    </section>
  );
}
