export const SAMPLE_LINE_MODEL = {
  version: 1,
  items: [
    { id: 'raw' },
    { id: 'part', tags: ['drilled', 'bolted'] },
    { id: 'bolt' },
    { id: 'product' },
  ],
  operations: {
    transform: [
      { id: 'cut', needs: { itemId: 'raw' }, output: 'part' },
      {
        id: 'paint',
        needs: { itemId: 'part', tags: ['drilled', 'bolted'] },
        output: 'product',
      },
    ],
    tag: [{ id: 'drill', needs: { itemId: 'part' }, adds: ['drilled'] }],
    attach: [
      {
        id: 'bolt',
        needs: { itemId: 'part', tags: ['drilled'] },
        consumes: [{ itemId: 'bolt' }],
        adds: ['bolted'],
      },
    ],
  },
  nodes: {
    source: [
      { id: 'src', itemId: 'raw', output: 'b1' },
      { id: 'bolts', itemId: 'bolt', output: 'b6' },
    ],
    splitter: [
      {
        id: 'sp1',
        input: 'b1',
        outputs: ['b2', 'b3'],
        outputPolicy: 'shortestQueue',
      },
    ],
    station: [
      {
        id: 's1',
        inputs: ['b2'],
        output: 'b4',
        ops: [{ opId: 'cut', mean: 30, sd: 3 }],
      },
      {
        id: 's2',
        inputs: ['b3'],
        output: 'b5',
        ops: [{ opId: 'cut', mean: 36, sd: 4 }],
      },
      {
        id: 's3',
        inputs: ['b4', 'b5', 'b6'],
        output: 'b7',
        inputPolicy: 'oldestFirst',
        ops: [
          { opId: 'drill', mean: 20, sd: 2 },
          { opId: 'bolt', mean: 15, sd: 1 },
          { opId: 'paint', mean: 25, sd: 2 },
        ],
      },
    ],
    sink: [{ id: 'out', inputs: ['b7'], needs: { itemId: 'product' } }],
    belt: [
      { id: 'b1', from: 'src', to: 'sp1', travelTime: 2, capacity: 5 },
      { id: 'b2', from: 'sp1', to: 's1', travelTime: 2, capacity: 5 },
      { id: 'b3', from: 'sp1', to: 's2', travelTime: 2, capacity: 5 },
      { id: 'b4', from: 's1', to: 's3', travelTime: 2, capacity: 5 },
      { id: 'b5', from: 's2', to: 's3', travelTime: 2, capacity: 5 },
      { id: 'b6', from: 'bolts', to: 's3', travelTime: 2, capacity: 5 },
      { id: 'b7', from: 's3', to: 'out', travelTime: 2, capacity: 5 },
    ],
  },
  run: {
    seed: 42,
    replications: 20,
    horizon: 31536000,
    warmupPct: 2,
    confidence: 0.95,
  },
  analysis: { probes: true },
  ui: {
    layout: {
      src: { x: 0, y: 120 },
      sp1: { x: 160, y: 120 },
    },
  },
};

export const CANDIDATES_LINE_MODEL = {
  version: 1,
  items: [
    { id: 'chassis_raw' },
    { id: 'chassis', tags: ['welded', 'wired', 'tested'] },
    { id: 'harness' },
    { id: 'finished_unit' },
  ],
  operations: {
    transform: [
      { id: 'stamp', needs: { itemId: 'chassis_raw' }, output: 'chassis' },
      {
        id: 'pack',
        needs: { itemId: 'chassis', tags: ['welded', 'wired', 'tested'] },
        output: 'finished_unit',
      },
    ],
    tag: [
      { id: 'weld', needs: { itemId: 'chassis' }, adds: ['welded'] },
      {
        id: 'qa_test',
        needs: { itemId: 'chassis', tags: ['welded', 'wired'] },
        adds: ['tested'],
      },
    ],
    attach: [
      {
        id: 'wire_mount',
        needs: { itemId: 'chassis', tags: ['welded'] },
        consumes: [{ itemId: 'harness' }],
        adds: ['wired'],
      },
    ],
  },
  nodes: {
    source: [
      { id: 'src_chassis', itemId: 'chassis_raw', output: 'b_in1' },
      { id: 'src_harness', itemId: 'harness', output: 'b_in2' },
    ],
    splitter: [],
    station: [
      {
        id: 'st_prep',
        inputs: ['b_in1'],
        output: 'b_mid',
        candidates: [
          { opId: 'stamp', mean: 18, sd: 2 },
          { opId: 'weld', mean: 22, sd: 3 },
        ],
      },
      {
        id: 'st_final',
        inputs: ['b_mid', 'b_in2'],
        output: 'b_out',
        inputPolicy: 'firstBlocked',
        candidates: [
          { opId: 'wire_mount', mean: 24, sd: 2.5 },
          { opId: 'qa_test', mean: 14, sd: 1.5 },
          { opId: 'pack', mean: 12, sd: 1 },
        ],
      },
    ],
    sink: [
      {
        id: 'sink_main',
        inputs: ['b_out'],
        needs: { itemId: 'finished_unit' },
      },
    ],
    belt: [
      {
        id: 'b_in1',
        from: 'src_chassis',
        to: 'st_prep',
        travelTime: 3,
        capacity: 6,
      },
      {
        id: 'b_in2',
        from: 'src_harness',
        to: 'st_final',
        travelTime: 3,
        capacity: 8,
      },
      {
        id: 'b_mid',
        from: 'st_prep',
        to: 'st_final',
        travelTime: 4,
        capacity: 5,
      },
      {
        id: 'b_out',
        from: 'st_final',
        to: 'sink_main',
        travelTime: 2,
        capacity: 5,
      },
    ],
  },
  run: {
    seed: 101,
    replications: 30,
    horizon: 31536000,
    warmupPct: 2,
    confidence: 0.95,
  },
  analysis: { probes: true },
  ui: {
    layout: {
      src_chassis: { x: 40, y: 80 },
      src_harness: { x: 40, y: 240 },
      st_prep: { x: 260, y: 80 },
      st_final: { x: 500, y: 150 },
      sink_main: { x: 740, y: 150 },
    },
  },
};

export const PRESETS = [
  {
    id: 'sample-v1',
    name: 'Spec Sample Line',
    description:
      'Reference v1 line with raw & bolt sources, splitter, 3 stations, and 4 operations.',
    model: SAMPLE_LINE_MODEL,
  },
  {
    id: 'candidates-v1',
    name: 'Balancer Candidates Line',
    description:
      'Stations configured with unordered candidates instead of fixed ops.',
    model: CANDIDATES_LINE_MODEL,
  },
];
