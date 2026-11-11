import { useMemo, useState, useCallback } from 'react';
import { LineContext } from './LineContext.js';
import { SAMPLE_LINE_MODEL } from '../schema/presets.js';
import { normalizeModel, normalizeRequirement } from '../utils/serializer.js';
import { validateModel } from '../validation/validateModel.js';

export function LineProvider({ children }) {
  const [model, setModelState] = useState(() =>
    normalizeModel(SAMPLE_LINE_MODEL)
  );
  const [activeStage, setActiveStage] = useState('recipe'); // 'recipe' | 'layout' | 'run'
  const [selectedRecipeEntity, setSelectedRecipeEntity] = useState(null); // { type: 'item' | 'op', id, kind? }
  const [isValidationOpen, setIsValidationOpen] = useState(false);
  const [isJsonDrawerOpen, setIsJsonDrawerOpen] = useState(false);

  const setModel = useCallback((updater) => {
    setModelState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return normalizeModel(next);
    });
  }, []);

  const validation = useMemo(() => validateModel(model), [model]);

  // --- ITEM ACTIONS ---
  const addItem = useCallback(
    (id, tags = []) => {
      const trimmedId = String(id || '').trim();
      if (!trimmedId) return { ok: false, error: 'Item ID cannot be empty.' };
      if (model.items.some((i) => i.id === trimmedId)) {
        return { ok: false, error: `Item "${trimmedId}" already exists.` };
      }
      const cleanTags = Array.from(
        new Set(tags.map((t) => String(t).trim()).filter(Boolean))
      );
      setModel((prev) => ({
        ...prev,
        items: [
          ...prev.items,
          cleanTags.length > 0
            ? { id: trimmedId, tags: cleanTags }
            : { id: trimmedId },
        ],
      }));
      return { ok: true };
    },
    [model.items, setModel]
  );

  const updateItem = useCallback(
    (originalId, updatedItem) => {
      const newId = String(updatedItem.id || '').trim();
      if (!newId) return { ok: false, error: 'Item ID cannot be empty.' };
      if (newId !== originalId && model.items.some((i) => i.id === newId)) {
        return { ok: false, error: `Item "${newId}" already exists.` };
      }
      const cleanTags = Array.from(
        new Set(
          (updatedItem.tags || []).map((t) => String(t).trim()).filter(Boolean)
        )
      );

      setModel((prev) => {
        const nextItems = prev.items.map((item) =>
          item.id === originalId
            ? cleanTags.length > 0
              ? { id: newId, tags: cleanTags }
              : { id: newId }
            : item
        );

        // Cascade rename if itemId changed
        const renameReq = (req) => {
          if (!req || req.itemId !== originalId) return req;
          const validTags = (req.tags || []).filter((t) =>
            cleanTags.includes(t)
          );
          return normalizeRequirement({ itemId: newId, tags: validTags });
        };

        return {
          ...prev,
          items: nextItems,
          operations: {
            transform: prev.operations.transform.map((op) => ({
              ...op,
              needs: renameReq(op.needs),
              output: op.output === originalId ? newId : op.output,
            })),
            tag: prev.operations.tag.map((op) => ({
              ...op,
              needs: renameReq(op.needs),
            })),
            attach: prev.operations.attach.map((op) => ({
              ...op,
              needs: renameReq(op.needs),
              consumes: op.consumes.map(renameReq),
            })),
          },
          nodes: {
            ...prev.nodes,
            source: prev.nodes.source.map((s) =>
              s.itemId === originalId ? { ...s, itemId: newId } : s
            ),
            sink: prev.nodes.sink.map((sk) => ({
              ...sk,
              needs: renameReq(sk.needs),
            })),
          },
        };
      });
      return { ok: true };
    },
    [model.items, setModel]
  );

  const deleteItem = useCallback(
    (itemId) => {
      setModel((prev) => ({
        ...prev,
        items: prev.items.filter((i) => i.id !== itemId),
      }));
      if (
        selectedRecipeEntity?.type === 'item' &&
        selectedRecipeEntity?.id === itemId
      ) {
        setSelectedRecipeEntity(null);
      }
    },
    [selectedRecipeEntity, setModel]
  );

  // --- OPERATION ACTIONS ---
  const getAllOperationIds = useCallback((opsObj) => {
    const ids = new Set();
    for (const kind of ['transform', 'tag', 'attach']) {
      for (const op of opsObj?.[kind] || []) {
        ids.add(op.id);
      }
    }
    return ids;
  }, []);

  const saveOperation = useCallback(
    (kind, opData, originalId = null, originalKind = null) => {
      const trimmedId = String(opData.id || '').trim();
      if (!trimmedId) {
        return { ok: false, error: 'Operation ID is required.' };
      }

      // Check shared namespace across all three operation kinds
      const allIds = getAllOperationIds(model.operations);
      if (trimmedId !== originalId && allIds.has(trimmedId)) {
        return {
          ok: false,
          error: `Operation ID "${trimmedId}" is already used (operations share a single ID namespace).`,
        };
      }

      setModel((prev) => {
        const nextOps = {
          transform: [...prev.operations.transform],
          tag: [...prev.operations.tag],
          attach: [...prev.operations.attach],
        };

        // If editing an existing operation, remove from original kind array if kind changed, or update in place
        if (originalId && originalKind) {
          if (originalKind === kind) {
            nextOps[kind] = nextOps[kind].map((op) =>
              op.id === originalId ? opData : op
            );
          } else {
            nextOps[originalKind] = nextOps[originalKind].filter(
              (op) => op.id !== originalId
            );
            nextOps[kind] = [...nextOps[kind], opData];
          }
        } else {
          nextOps[kind] = [...nextOps[kind], opData];
        }

        // Cascade operation ID rename to stations if renamed
        const nextStations =
          originalId && originalId !== trimmedId
            ? prev.nodes.station.map((st) => {
                if (Array.isArray(st.ops)) {
                  return {
                    ...st,
                    ops: st.ops.map((entry) =>
                      entry.opId === originalId
                        ? { ...entry, opId: trimmedId }
                        : entry
                    ),
                  };
                }
                if (Array.isArray(st.candidates)) {
                  return {
                    ...st,
                    candidates: st.candidates.map((entry) =>
                      entry.opId === originalId
                        ? { ...entry, opId: trimmedId }
                        : entry
                    ),
                  };
                }
                return st;
              })
            : prev.nodes.station;

        return {
          ...prev,
          operations: nextOps,
          nodes: {
            ...prev.nodes,
            station: nextStations,
          },
        };
      });

      return { ok: true };
    },
    [getAllOperationIds, model.operations, setModel]
  );

  const deleteOperation = useCallback(
    (kind, opId) => {
      setModel((prev) => ({
        ...prev,
        operations: {
          ...prev.operations,
          [kind]: prev.operations[kind].filter((op) => op.id !== opId),
        },
      }));
      if (
        selectedRecipeEntity?.type === 'op' &&
        selectedRecipeEntity?.id === opId
      ) {
        setSelectedRecipeEntity(null);
      }
    },
    [selectedRecipeEntity, setModel]
  );

  // --- RUN & ANALYSIS SETTINGS ---
  const updateRunConfig = useCallback(
    (patch) => {
      setModel((prev) => ({
        ...prev,
        run: {
          ...prev.run,
          ...patch,
        },
      }));
    },
    [setModel]
  );

  const updateAnalysisConfig = useCallback(
    (patch) => {
      setModel((prev) => ({
        ...prev,
        analysis: {
          ...prev.analysis,
          ...patch,
        },
      }));
    },
    [setModel]
  );

  const value = useMemo(
    () => ({
      model,
      setModel,
      validation,
      activeStage,
      setActiveStage,
      selectedRecipeEntity,
      setSelectedRecipeEntity,
      isValidationOpen,
      setIsValidationOpen,
      isJsonDrawerOpen,
      setIsJsonDrawerOpen,
      addItem,
      updateItem,
      deleteItem,
      saveOperation,
      deleteOperation,
      updateRunConfig,
      updateAnalysisConfig,
    }),
    [
      model,
      setModel,
      validation,
      activeStage,
      selectedRecipeEntity,
      isValidationOpen,
      isJsonDrawerOpen,
      addItem,
      updateItem,
      deleteItem,
      saveOperation,
      deleteOperation,
      updateRunConfig,
      updateAnalysisConfig,
    ]
  );

  return <LineContext.Provider value={value}>{children}</LineContext.Provider>;
}
