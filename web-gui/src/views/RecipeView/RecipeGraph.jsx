import { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  ControlButton,
  Handle,
  Position,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useLine } from '../../context/LineContext.js';

function RecipeItemStateNode({ data }) {
  return (
    <div
      className={`rf-recipe-item ${data.isSelected ? 'is-selected' : ''} ${
        data.isDimmed ? 'is-dimmed' : ''
      } ${data.isSource ? 'is-source' : ''} ${data.isSink ? 'is-sink' : ''}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="rf-handle-subtle"
      />
      <div className="rf-item-header">
        <span className="rf-item-type-label">ITEM STATE</span>
        <div className="rf-item-badges">
          {data.isSource && (
            <span className="rf-mini-pill is-source">Source</span>
          )}
          {data.isSink && <span className="rf-mini-pill is-sink">Sink</span>}
        </div>
      </div>
      <div className="rf-item-id">{data.itemId}</div>
      {data.tags.length > 0 ? (
        <div className="rf-item-tags">
          {data.tags.map((t) => (
            <span key={t} className="rf-tag-badge">
              {t}
            </span>
          ))}
        </div>
      ) : (
        <div className="rf-item-untagged">base</div>
      )}
      <Handle
        type="source"
        position={Position.Right}
        className="rf-handle-subtle"
      />
    </div>
  );
}

function RecipeOpNode({ data }) {
  return (
    <div
      className={`rf-recipe-op is-${data.kind} ${
        data.isSelected ? 'is-selected' : ''
      } ${data.isDimmed ? 'is-dimmed' : ''}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="rf-handle-subtle"
      />
      <div className="rf-op-header">
        <span className={`rf-op-kind is-${data.kind}`}>{data.kind}</span>
        <span className="rf-op-id">{data.opId}</span>
      </div>
      <div className="rf-op-detail">{data.summary}</div>
      {data.stations.length > 0 && (
        <div className="rf-op-stations">
          Stations: {data.stations.join(', ')}
        </div>
      )}
      <Handle
        type="source"
        position={Position.Right}
        className="rf-handle-subtle"
      />
    </div>
  );
}

const nodeTypes = {
  recipeItem: RecipeItemStateNode,
  recipeOp: RecipeOpNode,
};

export default function RecipeGraph({
  isSidebarCollapsed = false,
  onToggleSidebar,
}) {
  const { model, selectedRecipeEntity, setSelectedRecipeEntity } = useLine();

  const { nodes, edges } = useMemo(() => {
    const itemTagOrder = new Map();
    for (const item of model.items || []) {
      itemTagOrder.set(item.id, item.tags || []);
    }

    const canonicalizeTags = (itemId, tags = []) => {
      const declared = itemTagOrder.get(itemId) || [];
      const unique = Array.from(new Set(tags));
      return unique.sort((a, b) => {
        const ia = declared.indexOf(a);
        const ib = declared.indexOf(b);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return a.localeCompare(b);
      });
    };

    const makeStateKey = (itemId, tags = []) => {
      const sorted = canonicalizeTags(itemId, tags);
      return sorted.length > 0
        ? `state:${itemId}[${sorted.join(',')}]`
        : `state:${itemId}`;
    };

    const sourceItemIds = new Set(
      (model.nodes?.source || []).map((s) => s.itemId)
    );
    const sinkStateKeys = new Set(
      (model.nodes?.sink || []).map((sk) =>
        makeStateKey(sk.needs?.itemId || '', sk.needs?.tags || [])
      )
    );

    const stateNodesMap = new Map();
    const ensureStateNode = (itemId, tags = []) => {
      if (!itemId) return null;
      const cleanTags = canonicalizeTags(itemId, tags);
      const key = makeStateKey(itemId, cleanTags);
      if (!stateNodesMap.has(key)) {
        stateNodesMap.set(key, {
          key,
          itemId,
          tags: cleanTags,
          isSource: cleanTags.length === 0 && sourceItemIds.has(itemId),
          isSink: sinkStateKeys.has(key),
        });
      }
      return key;
    };

    // Ensure every base item exists as a state node
    for (const item of model.items || []) {
      ensureStateNode(item.id, []);
    }
    // Ensure sink target state exists
    for (const sk of model.nodes?.sink || []) {
      if (sk.needs?.itemId) {
        ensureStateNode(sk.needs.itemId, sk.needs.tags || []);
      }
    }

    const opNodesList = [];
    const graphEdges = [];
    const adj = new Map();
    const inDegree = new Map();

    const registerGraphNode = (id) => {
      if (!adj.has(id)) adj.set(id, []);
      if (!inDegree.has(id)) inDegree.set(id, 0);
    };

    const addDirectedEdge = (source, target, edgeProps) => {
      registerGraphNode(source);
      registerGraphNode(target);
      adj.get(source).push(target);
      inDegree.set(target, (inDegree.get(target) || 0) + 1);
      graphEdges.push({
        id: `e-${source}-${target}-${graphEdges.length}`,
        source,
        target,
        ...edgeProps,
      });
    };

    const getStationsForOp = (opId) => {
      const list = [];
      for (const st of model.nodes?.station || []) {
        const hasOp =
          (st.ops || []).some((o) => o.opId === opId) ||
          (st.candidates || []).some((o) => o.opId === opId);
        if (hasOp) list.push(st.id);
      }
      return list;
    };

    // Process transform operations
    for (const op of model.operations?.transform || []) {
      const opNodeId = `op:transform:${op.id}`;
      const inState = ensureStateNode(op.needs?.itemId, op.needs?.tags || []);
      const outState = ensureStateNode(op.output, []);

      opNodesList.push({
        id: opNodeId,
        opId: op.id,
        kind: 'transform',
        summary: `${op.needs?.itemId || '?'} ➔ ${op.output || '?'}`,
        stations: getStationsForOp(op.id),
      });
      registerGraphNode(opNodeId);

      if (inState) {
        addDirectedEdge(inState, opNodeId, {
          label: 'needs',
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: '#6366f1', strokeWidth: 2 },
        });
      }
      if (outState) {
        addDirectedEdge(opNodeId, outState, {
          label: 'output',
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: '#6366f1', strokeWidth: 2 },
        });
      }
    }

    // Process tag operations
    for (const op of model.operations?.tag || []) {
      const opNodeId = `op:tag:${op.id}`;
      const baseItem = op.needs?.itemId;
      const inTags = op.needs?.tags || [];
      const outTags = [...inTags, ...(op.adds || [])];
      const inState = ensureStateNode(baseItem, inTags);
      const outState = ensureStateNode(baseItem, outTags);

      opNodesList.push({
        id: opNodeId,
        opId: op.id,
        kind: 'tag',
        summary: `adds +${(op.adds || []).join(', +')}`,
        stations: getStationsForOp(op.id),
      });
      registerGraphNode(opNodeId);

      if (inState) {
        addDirectedEdge(inState, opNodeId, {
          label: 'needs',
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: '#10b981', strokeWidth: 2 },
        });
      }
      if (outState) {
        addDirectedEdge(opNodeId, outState, {
          label: `+${(op.adds || []).join(',')}`,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: '#10b981', strokeWidth: 2 },
        });
      }
    }

    // Process attach operations
    for (const op of model.operations?.attach || []) {
      const opNodeId = `op:attach:${op.id}`;
      const baseItem = op.needs?.itemId;
      const inTags = op.needs?.tags || [];
      const outTags = [...inTags, ...(op.adds || [])];
      const inState = ensureStateNode(baseItem, inTags);
      const outState = ensureStateNode(baseItem, outTags);

      opNodesList.push({
        id: opNodeId,
        opId: op.id,
        kind: 'attach',
        summary: `+${(op.consumes || [])
          .map((c) => c.itemId)
          .join(', ')} ➔ +${(op.adds || []).join(', +')}`,
        stations: getStationsForOp(op.id),
      });
      registerGraphNode(opNodeId);

      if (inState) {
        addDirectedEdge(inState, opNodeId, {
          label: 'base',
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: '#f59e0b', strokeWidth: 2 },
        });
      }

      for (const cons of op.consumes || []) {
        const consState = ensureStateNode(cons.itemId, cons.tags || []);
        if (consState) {
          addDirectedEdge(consState, opNodeId, {
            label: 'consumes',
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: {
              stroke: '#f97316',
              strokeWidth: 2,
              strokeDasharray: '5 4',
            },
          });
        }
      }

      if (outState) {
        addDirectedEdge(opNodeId, outState, {
          label: `+${(op.adds || []).join(',')}`,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: '#f59e0b', strokeWidth: 2 },
        });
      }
    }

    for (const key of stateNodesMap.keys()) {
      registerGraphNode(key);
    }

    // Compute simple topological column depth for the Recipe Precedence view
    const depth = new Map();
    const queue = [];
    for (const [id, deg] of inDegree.entries()) {
      depth.set(id, 0);
      if (deg === 0) queue.push(id);
    }

    const visitedCount = new Map();
    while (queue.length > 0) {
      const u = queue.shift();
      const d = depth.get(u) || 0;
      for (const v of adj.get(u) || []) {
        const nextDepth = Math.max(depth.get(v) || 0, d + 1);
        depth.set(v, nextDepth);
        const count = (visitedCount.get(v) || 0) + 1;
        visitedCount.set(v, count);
        if (count <= (inDegree.get(v) || 1)) {
          queue.push(v);
        }
      }
    }

    const columns = new Map();
    for (const id of adj.keys()) {
      const col = depth.get(id) || 0;
      if (!columns.has(col)) columns.set(col, []);
      columns.get(col).push(id);
    }

    const rfNodes = [];
    const selectedNodeIds = new Set();
    const hasSelection = Boolean(selectedRecipeEntity);
    const COL_SPACING = 230;
    const ROW_SPACING = 130;

    for (const [col, ids] of columns.entries()) {
      ids.forEach((id, rowIdx) => {
        const x = 40 + col * COL_SPACING;
        const y = 50 + rowIdx * ROW_SPACING;

        if (stateNodesMap.has(id)) {
          const stNode = stateNodesMap.get(id);
          const isSelected =
            selectedRecipeEntity?.type === 'item' &&
            selectedRecipeEntity?.id === stNode.itemId;
          if (isSelected) selectedNodeIds.add(id);
          rfNodes.push({
            id,
            type: 'recipeItem',
            position: { x, y },
            zIndex: isSelected ? 20 : 1,
            data: {
              ...stNode,
              isSelected,
              isDimmed: hasSelection && !isSelected,
            },
          });
        } else {
          const opNode = opNodesList.find((o) => o.id === id);
          if (opNode) {
            const isSelected =
              selectedRecipeEntity?.type === 'op' &&
              selectedRecipeEntity?.id === opNode.opId;
            if (isSelected) selectedNodeIds.add(id);
            rfNodes.push({
              id,
              type: 'recipeOp',
              position: { x, y },
              zIndex: isSelected ? 20 : 1,
              data: {
                ...opNode,
                isSelected,
                isDimmed: hasSelection && !isSelected,
              },
            });
          }
        }
      });
    }

    const styledEdges = graphEdges.map((edge) => {
      if (!hasSelection) return edge;
      const isConnectedToSelected =
        selectedNodeIds.has(edge.source) || selectedNodeIds.has(edge.target);
      if (isConnectedToSelected) {
        return {
          ...edge,
          zIndex: 15,
          style: {
            ...edge.style,
            strokeWidth: 3,
            opacity: 1,
          },
          labelStyle: {
            fontWeight: 700,
            opacity: 1,
          },
        };
      }
      return {
        ...edge,
        zIndex: 0,
        animated: false,
        style: {
          ...edge.style,
          stroke: '#94a3b8',
          strokeWidth: 1.5,
          opacity: 0.2,
          filter: 'grayscale(100%)',
        },
        labelStyle: {
          opacity: 0.22,
        },
        labelBgStyle: {
          opacity: 0.22,
        },
      };
    });

    return { nodes: rfNodes, edges: styledEdges };
  }, [model, selectedRecipeEntity]);

  const handleNodeClick = (_, node) => {
    if (node.type === 'recipeItem') {
      const isSame =
        selectedRecipeEntity?.type === 'item' &&
        selectedRecipeEntity?.id === node.data.itemId;
      setSelectedRecipeEntity(
        isSame ? null : { type: 'item', id: node.data.itemId }
      );
    } else if (node.type === 'recipeOp') {
      const isSame =
        selectedRecipeEntity?.type === 'op' &&
        selectedRecipeEntity?.id === node.data.opId;
      setSelectedRecipeEntity(
        isSame
          ? null
          : {
              type: 'op',
              id: node.data.opId,
              kind: node.data.kind,
            }
      );
    }
  };

  return (
    <div className="wb-recipe-graph-card">
      <div className="wb-card-header">
        <div>
          <h2 className="wb-card-title">Interactive Recipe Precedence Graph</h2>
          <p className="wb-card-subtitle">
            Visualizes how raw items transform, gain tags, and attach components
            toward the final sink product
          </p>
        </div>

        <div className="wb-legend-row">
          <span className="wb-legend-item">
            <span className="wb-legend-swatch is-transform" /> transform
          </span>
          <span className="wb-legend-item">
            <span className="wb-legend-swatch is-tag" /> tag
          </span>
          <span className="wb-legend-item">
            <span className="wb-legend-swatch is-attach" /> attach
          </span>
        </div>
      </div>

      <div className="wb-rf-container">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          onPaneClick={() => setSelectedRecipeEntity(null)}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1} color="#cbd5e1" />
          <Controls showInteractive={false}>
            <ControlButton
              onClick={onToggleSidebar}
              title={isSidebarCollapsed ? 'Show sidebar' : 'Full screen graph'}
              aria-label={
                isSidebarCollapsed ? 'Show sidebar' : 'Full screen graph'
              }
            >
              {isSidebarCollapsed ? (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="9" y1="3" x2="9" y2="21" />
                  <polyline points="13 9 16 12 13 15" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              )}
            </ControlButton>
          </Controls>
        </ReactFlow>
      </div>
    </div>
  );
}
