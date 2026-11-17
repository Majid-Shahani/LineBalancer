/**
 * Normalizes an item requirement ({ itemId, tags? }) by omitting `tags` when empty.
 */
export function normalizeRequirement(req) {
  if (!req || typeof req !== 'object') {
    return { itemId: '' };
  }
  const cleanTags = Array.isArray(req.tags)
    ? req.tags.map((t) => String(t).trim()).filter(Boolean)
    : [];
  if (cleanTags.length > 0) {
    return {
      itemId: String(req.itemId || '').trim(),
      tags: Array.from(new Set(cleanTags)),
    };
  }
  return {
    itemId: String(req.itemId || '').trim(),
  };
}

/**
 * Normalizes the entire LineBalancer JSON v1 document so that:
 * - Empty `tags` arrays are omitted everywhere (`items`, `needs`, `consumes`)
 * - Station nodes keep either `ops` or `candidates` (never both)
 * - Optional policy fields are preserved when explicitly set
 * - Canonical top-level key order is maintained
 */
export function normalizeModel(raw) {
  const doc = raw && typeof raw === 'object' ? raw : {};

  const items = Array.isArray(doc.items)
    ? doc.items.map((item) => {
        const cleanTags = Array.isArray(item.tags)
          ? Array.from(
              new Set(item.tags.map((t) => String(t).trim()).filter(Boolean))
            )
          : [];
        return cleanTags.length > 0
          ? { id: String(item.id || '').trim(), tags: cleanTags }
          : { id: String(item.id || '').trim() };
      })
    : [];

  const opsRaw = doc.operations || {};
  const operations = {
    transform: Array.isArray(opsRaw.transform)
      ? opsRaw.transform.map((op) => ({
          id: String(op.id || '').trim(),
          needs: normalizeRequirement(op.needs),
          output: String(op.output || '').trim(),
        }))
      : [],
    tag: Array.isArray(opsRaw.tag)
      ? opsRaw.tag.map((op) => ({
          id: String(op.id || '').trim(),
          needs: normalizeRequirement(op.needs),
          adds: Array.isArray(op.adds)
            ? Array.from(
                new Set(op.adds.map((t) => String(t).trim()).filter(Boolean))
              )
            : [],
        }))
      : [],
    attach: Array.isArray(opsRaw.attach)
      ? opsRaw.attach.map((op) => ({
          id: String(op.id || '').trim(),
          needs: normalizeRequirement(op.needs),
          consumes: Array.isArray(op.consumes)
            ? op.consumes.map(normalizeRequirement)
            : [],
          adds: Array.isArray(op.adds)
            ? Array.from(
                new Set(op.adds.map((t) => String(t).trim()).filter(Boolean))
              )
            : [],
        }))
      : [],
  };

  const nodesRaw = doc.nodes || {};
  const nodes = {
    source: Array.isArray(nodesRaw.source)
      ? nodesRaw.source.map((s) => ({
          id: String(s.id || '').trim(),
          itemId: String(s.itemId || '').trim(),
          output: String(s.output || '').trim(),
        }))
      : [],
    splitter: Array.isArray(nodesRaw.splitter)
      ? nodesRaw.splitter.map((sp) => {
          const entry = {
            id: String(sp.id || '').trim(),
            input: String(sp.input || '').trim(),
            outputs: Array.isArray(sp.outputs) ? [...sp.outputs] : [],
          };
          if (sp.outputPolicy) {
            entry.outputPolicy = sp.outputPolicy;
          }
          return entry;
        })
      : [],
    station: Array.isArray(nodesRaw.station)
      ? nodesRaw.station.map((st) => {
          const entry = {
            id: String(st.id || '').trim(),
            inputs: Array.isArray(st.inputs) ? [...st.inputs] : [],
            output: String(st.output || '').trim(),
          };
          if (st.inputPolicy) {
            entry.inputPolicy = st.inputPolicy;
          }
          if (Array.isArray(st.candidates) && !Array.isArray(st.ops)) {
            entry.candidates = st.candidates.map((c) => ({
              opId: String(c.opId || '').trim(),
              mean: Number(c.mean),
              sd: Number(c.sd),
            }));
          } else {
            entry.ops = (Array.isArray(st.ops) ? st.ops : []).map((o) => ({
              opId: String(o.opId || '').trim(),
              mean: Number(o.mean),
              sd: Number(o.sd),
            }));
          }
          return entry;
        })
      : [],
    sink: Array.isArray(nodesRaw.sink)
      ? nodesRaw.sink.map((sk) => ({
          id: String(sk.id || '').trim(),
          inputs: Array.isArray(sk.inputs) ? [...sk.inputs] : [],
          needs: normalizeRequirement(sk.needs),
        }))
      : [],
    belt: Array.isArray(nodesRaw.belt)
      ? nodesRaw.belt.map((b) => ({
          id: String(b.id || '').trim(),
          from: String(b.from || '').trim(),
          to: String(b.to || '').trim(),
          travelTime: Number(b.travelTime),
          capacity: Number(b.capacity),
        }))
      : [],
  };

  const runRaw = doc.run || {};
  const run = {
    seed: Number(runRaw.seed ?? 42),
    replications: Number(runRaw.replications ?? 20),
    horizon: Number(runRaw.horizon ?? 31536000),
    warmupPct: Number(runRaw.warmupPct ?? 2),
    confidence: Number(runRaw.confidence ?? 0.95),
  };

  const analysis = {
    probes: Boolean(doc.analysis?.probes ?? true),
  };

  const ui = {
    layout: doc.ui?.layout ? { ...doc.ui.layout } : {},
  };

  return {
    version: doc.version !== undefined ? doc.version : 1,
    items,
    operations,
    nodes,
    run,
    analysis,
    ui,
  };
}

export function serializeModel(model) {
  return JSON.stringify(normalizeModel(model), null, 2);
}
