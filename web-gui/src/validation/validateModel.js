import Ajv from 'ajv';
import { lineSchemaV1 } from '../schema/lineSchemaV1.js';
import { normalizeModel } from '../utils/serializer.js';

const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
const validateSchema = ajv.compile(lineSchemaV1);

/**
 * Validates the LineBalancer JSON v1 model at two levels:
 * 1. Tier 1 — AJV JSON Schema structural validation
 * 2. Tier 2 — Semantic & Domain rules (shared ID namespaces, item/tag references,
 *             bidirectional port-belt agreement, acyclicity, and recipe producibility)
 */
export function validateModel(rawModel) {
  const model = normalizeModel(rawModel);
  const schemaErrors = [];
  const domainErrors = [];
  const warnings = [];

  const valid = validateSchema(model);
  if (!valid && Array.isArray(validateSchema.errors)) {
    for (const err of validateSchema.errors) {
      schemaErrors.push({
        tier: 'schema',
        path: err.instancePath || '/',
        message: `${err.instancePath || 'root'} ${err.message}`,
      });
    }
  }

  // 1. Items uniqueness & tag lookup map
  const itemMap = new Map();
  for (const item of model.items || []) {
    if (!item.id) continue;
    if (itemMap.has(item.id)) {
      domainErrors.push({
        tier: 'domain',
        category: 'Items Namespace',
        path: `items.${item.id}`,
        message: `Duplicate item ID "${item.id}".`,
      });
    } else {
      itemMap.set(item.id, new Set(item.tags || []));
    }
  }

  // Helper to validate an item requirement ({ itemId, tags? })
  const checkItemReq = (req, contextLabel, path) => {
    if (!req || !req.itemId) return;
    if (!itemMap.has(req.itemId)) {
      domainErrors.push({
        tier: 'domain',
        category: 'Item Reference',
        path,
        message: `${contextLabel} references unknown item "${req.itemId}".`,
      });
      return;
    }
    const allowedTags = itemMap.get(req.itemId);
    for (const tag of req.tags || []) {
      if (!allowedTags.has(tag)) {
        domainErrors.push({
          tier: 'domain',
          category: 'Tag Reference',
          path,
          message: `${contextLabel} requires tag "${tag}" which is not declared on item "${req.itemId}".`,
        });
      }
    }
  };

  // 2. Shared Operation ID Namespace & Operation Rules
  const opMap = new Map();
  const registerOp = (op, kind) => {
    if (!op.id) return;
    if (opMap.has(op.id)) {
      const prev = opMap.get(op.id);
      domainErrors.push({
        tier: 'domain',
        category: 'Operations Namespace',
        path: `operations.${kind}.${op.id}`,
        message: `Duplicate operation ID "${op.id}" across "${prev.kind}" and "${kind}" (operations share one namespace).`,
      });
    } else {
      opMap.set(op.id, { ...op, kind });
    }
  };

  for (const op of model.operations?.transform || []) {
    registerOp(op, 'transform');
    checkItemReq(
      op.needs,
      `Transform "${op.id}" needs`,
      `operations.transform.${op.id}.needs`
    );
    if (op.output && !itemMap.has(op.output)) {
      domainErrors.push({
        tier: 'domain',
        category: 'Item Reference',
        path: `operations.transform.${op.id}.output`,
        message: `Transform "${op.id}" outputs unknown item "${op.output}".`,
      });
    }
  }

  for (const op of model.operations?.tag || []) {
    registerOp(op, 'tag');
    checkItemReq(
      op.needs,
      `Tag operation "${op.id}" needs`,
      `operations.tag.${op.id}.needs`
    );
    const baseItemId = op.needs?.itemId;
    if (baseItemId && itemMap.has(baseItemId)) {
      const allowedTags = itemMap.get(baseItemId);
      const neededTags = new Set(op.needs?.tags || []);
      for (const addedTag of op.adds || []) {
        if (!allowedTags.has(addedTag)) {
          domainErrors.push({
            tier: 'domain',
            category: 'Tag Reference',
            path: `operations.tag.${op.id}.adds`,
            message: `Tag operation "${op.id}" adds tag "${addedTag}" which is not declared on item "${baseItemId}".`,
          });
        }
        if (neededTags.has(addedTag)) {
          warnings.push({
            tier: 'warning',
            category: 'Redundant Tag',
            path: `operations.tag.${op.id}.adds`,
            message: `Tag operation "${op.id}" adds tag "${addedTag}" that is already required in its needs.`,
          });
        }
      }
    }
  }

  for (const op of model.operations?.attach || []) {
    registerOp(op, 'attach');
    checkItemReq(
      op.needs,
      `Attach operation "${op.id}" base needs`,
      `operations.attach.${op.id}.needs`
    );
    (op.consumes || []).forEach((cons, idx) => {
      checkItemReq(
        cons,
        `Attach operation "${op.id}" consumes[${idx}]`,
        `operations.attach.${op.id}.consumes[${idx}]`
      );
    });
    const baseItemId = op.needs?.itemId;
    if (baseItemId && itemMap.has(baseItemId)) {
      const allowedTags = itemMap.get(baseItemId);
      const neededTags = new Set(op.needs?.tags || []);
      for (const addedTag of op.adds || []) {
        if (!allowedTags.has(addedTag)) {
          domainErrors.push({
            tier: 'domain',
            category: 'Tag Reference',
            path: `operations.attach.${op.id}.adds`,
            message: `Attach operation "${op.id}" adds tag "${addedTag}" which is not declared on base item "${baseItemId}".`,
          });
        }
        if (neededTags.has(addedTag)) {
          warnings.push({
            tier: 'warning',
            category: 'Redundant Tag',
            path: `operations.attach.${op.id}.adds`,
            message: `Attach operation "${op.id}" adds tag "${addedTag}" that is already required on base item "${baseItemId}".`,
          });
        }
      }
    }
  }

  // 3. Shared Node ID Namespace (including belts)
  const nodeMap = new Map();
  const nodeGroups = ['source', 'splitter', 'station', 'sink', 'belt'];
  for (const group of nodeGroups) {
    for (const entry of model.nodes?.[group] || []) {
      if (!entry.id) continue;
      if (nodeMap.has(entry.id)) {
        const prev = nodeMap.get(entry.id);
        domainErrors.push({
          tier: 'domain',
          category: 'Nodes Namespace',
          path: `nodes.${group}.${entry.id}`,
          message: `Duplicate node/belt ID "${entry.id}" across "${prev.group}" and "${group}" (all nodes and belts share one namespace).`,
        });
      } else {
        nodeMap.set(entry.id, { ...entry, group });
      }
    }
  }

  // 4. Node-specific & Port-Belt Bidirectional Agreement Checks
  const beltMap = new Map((model.nodes?.belt || []).map((b) => [b.id, b]));

  for (const src of model.nodes?.source || []) {
    if (src.itemId && !itemMap.has(src.itemId)) {
      domainErrors.push({
        tier: 'domain',
        category: 'Item Reference',
        path: `nodes.source.${src.id}`,
        message: `Source "${src.id}" emits unknown item "${src.itemId}".`,
      });
    }
    const belt = beltMap.get(src.output);
    if (!belt) {
      domainErrors.push({
        tier: 'domain',
        category: 'Port-Belt Agreement',
        path: `nodes.source.${src.id}.output`,
        message: `Source "${src.id}" output references unknown belt "${src.output}".`,
      });
    } else if (belt.from !== src.id) {
      domainErrors.push({
        tier: 'domain',
        category: 'Port-Belt Agreement',
        path: `nodes.source.${src.id}.output`,
        message: `Source "${src.id}" output belt "${belt.id}" has from="${belt.from}" instead of "${src.id}".`,
      });
    }
  }

  for (const sp of model.nodes?.splitter || []) {
    const inBelt = beltMap.get(sp.input);
    if (!inBelt) {
      domainErrors.push({
        tier: 'domain',
        category: 'Port-Belt Agreement',
        path: `nodes.splitter.${sp.id}.input`,
        message: `Splitter "${sp.id}" input references unknown belt "${sp.input}".`,
      });
    } else if (inBelt.to !== sp.id) {
      domainErrors.push({
        tier: 'domain',
        category: 'Port-Belt Agreement',
        path: `nodes.splitter.${sp.id}.input`,
        message: `Splitter "${sp.id}" input belt "${inBelt.id}" has to="${inBelt.to}" instead of "${sp.id}".`,
      });
    }

    for (const outBeltId of sp.outputs || []) {
      const outBelt = beltMap.get(outBeltId);
      if (!outBelt) {
        domainErrors.push({
          tier: 'domain',
          category: 'Port-Belt Agreement',
          path: `nodes.splitter.${sp.id}.outputs`,
          message: `Splitter "${sp.id}" output references unknown belt "${outBeltId}".`,
        });
      } else if (outBelt.from !== sp.id) {
        domainErrors.push({
          tier: 'domain',
          category: 'Port-Belt Agreement',
          path: `nodes.splitter.${sp.id}.outputs`,
          message: `Splitter "${sp.id}" output belt "${outBelt.id}" has from="${outBelt.from}" instead of "${sp.id}".`,
        });
      }
    }
  }

  for (const st of model.nodes?.station || []) {
    for (const inBeltId of st.inputs || []) {
      const inBelt = beltMap.get(inBeltId);
      if (!inBelt) {
        domainErrors.push({
          tier: 'domain',
          category: 'Port-Belt Agreement',
          path: `nodes.station.${st.id}.inputs`,
          message: `Station "${st.id}" input references unknown belt "${inBeltId}".`,
        });
      } else if (inBelt.to !== st.id) {
        domainErrors.push({
          tier: 'domain',
          category: 'Port-Belt Agreement',
          path: `nodes.station.${st.id}.inputs`,
          message: `Station "${st.id}" input belt "${inBelt.id}" has to="${inBelt.to}" instead of "${st.id}".`,
        });
      }
    }

    const outBelt = beltMap.get(st.output);
    if (!outBelt) {
      domainErrors.push({
        tier: 'domain',
        category: 'Port-Belt Agreement',
        path: `nodes.station.${st.id}.output`,
        message: `Station "${st.id}" output references unknown belt "${st.output}".`,
      });
    } else if (outBelt.from !== st.id) {
      domainErrors.push({
        tier: 'domain',
        category: 'Port-Belt Agreement',
        path: `nodes.station.${st.id}.output`,
        message: `Station "${st.id}" output belt "${outBelt.id}" has from="${outBelt.from}" instead of "${st.id}".`,
      });
    }

    const opEntries = st.ops || st.candidates || [];
    for (const entry of opEntries) {
      if (entry.opId && !opMap.has(entry.opId)) {
        domainErrors.push({
          tier: 'domain',
          category: 'Operation Reference',
          path: `nodes.station.${st.id}`,
          message: `Station "${st.id}" references unknown operation "${entry.opId}".`,
        });
      }
    }
  }

  for (const sk of model.nodes?.sink || []) {
    checkItemReq(
      sk.needs,
      `Sink "${sk.id}" needs`,
      `nodes.sink.${sk.id}.needs`
    );
    for (const inBeltId of sk.inputs || []) {
      const inBelt = beltMap.get(inBeltId);
      if (!inBelt) {
        domainErrors.push({
          tier: 'domain',
          category: 'Port-Belt Agreement',
          path: `nodes.sink.${sk.id}.inputs`,
          message: `Sink "${sk.id}" input references unknown belt "${inBeltId}".`,
        });
      } else if (inBelt.to !== sk.id) {
        domainErrors.push({
          tier: 'domain',
          category: 'Port-Belt Agreement',
          path: `nodes.sink.${sk.id}.inputs`,
          message: `Sink "${sk.id}" input belt "${inBelt.id}" has to="${inBelt.to}" instead of "${sk.id}".`,
        });
      }
    }
  }

  // Reverse check: every belt's `from` and `to` must list the belt in its ports
  for (const belt of model.nodes?.belt || []) {
    const fromNode = nodeMap.get(belt.from);
    const toNode = nodeMap.get(belt.to);

    if (!fromNode || fromNode.group === 'belt') {
      domainErrors.push({
        tier: 'domain',
        category: 'Port-Belt Agreement',
        path: `nodes.belt.${belt.id}.from`,
        message: `Belt "${belt.id}" has invalid from node "${belt.from}".`,
      });
    } else {
      const hasPort =
        (fromNode.group === 'source' && fromNode.output === belt.id) ||
        (fromNode.group === 'station' && fromNode.output === belt.id) ||
        (fromNode.group === 'splitter' &&
          Array.isArray(fromNode.outputs) &&
          fromNode.outputs.includes(belt.id));
      if (!hasPort) {
        domainErrors.push({
          tier: 'domain',
          category: 'Port-Belt Agreement',
          path: `nodes.belt.${belt.id}.from`,
          message: `Belt "${belt.id}" claims from="${belt.from}", but node "${belt.from}" does not list "${belt.id}" in its output port(s).`,
        });
      }
    }

    if (!toNode || toNode.group === 'belt') {
      domainErrors.push({
        tier: 'domain',
        category: 'Port-Belt Agreement',
        path: `nodes.belt.${belt.id}.to`,
        message: `Belt "${belt.id}" has invalid to node "${belt.to}".`,
      });
    } else {
      const hasPort =
        (toNode.group === 'splitter' && toNode.input === belt.id) ||
        ((toNode.group === 'station' || toNode.group === 'sink') &&
          Array.isArray(toNode.inputs) &&
          toNode.inputs.includes(belt.id));
      if (!hasPort) {
        domainErrors.push({
          tier: 'domain',
          category: 'Port-Belt Agreement',
          path: `nodes.belt.${belt.id}.to`,
          message: `Belt "${belt.id}" claims to="${belt.to}", but node "${belt.to}" does not list "${belt.id}" in its input port(s).`,
        });
      }
    }
  }

  // 5. Acyclicity (DAG) check on node graph
  const adj = new Map();
  for (const belt of model.nodes?.belt || []) {
    if (!adj.has(belt.from)) adj.set(belt.from, []);
    adj.get(belt.from).push(belt.to);
  }
  const visited = new Set();
  const inStack = new Set();
  let cycleFound = false;

  const dfs = (u) => {
    if (cycleFound) return;
    visited.add(u);
    inStack.add(u);
    for (const v of adj.get(u) || []) {
      if (!visited.has(v)) {
        dfs(v);
      } else if (inStack.has(v)) {
        cycleFound = true;
        domainErrors.push({
          tier: 'domain',
          category: 'Layout Acyclicity',
          path: `nodes.belt`,
          message: `Cycle detected in line layout involving "${u}" -> "${v}". Layout must be acyclic.`,
        });
        return;
      }
    }
    inStack.delete(u);
  };

  for (const nodeId of adj.keys()) {
    if (!visited.has(nodeId)) {
      dfs(nodeId);
    }
  }

  const allErrors = [...schemaErrors, ...domainErrors];
  return {
    isValid: allErrors.length === 0,
    schemaErrors,
    domainErrors,
    warnings,
    allErrors,
  };
}
