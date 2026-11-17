const itemRequirementSchema = {
  type: 'object',
  required: ['itemId'],
  additionalProperties: false,
  properties: {
    itemId: { type: 'string', minLength: 1 },
    tags: {
      type: 'array',
      minItems: 1,
      uniqueItems: true,
      items: { type: 'string', minLength: 1 },
    },
  },
};

const stationOpEntrySchema = {
  type: 'object',
  required: ['opId', 'mean', 'sd'],
  additionalProperties: false,
  properties: {
    opId: { type: 'string', minLength: 1 },
    mean: { type: 'number', exclusiveMinimum: 0 },
    sd: { type: 'number', minimum: 0 },
  },
};

export const lineSchemaV1 = {
  type: 'object',
  required: ['version', 'items', 'operations', 'nodes', 'run'],
  additionalProperties: false,
  properties: {
    version: { const: 1 },
    items: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['id'],
        additionalProperties: false,
        properties: {
          id: { type: 'string', minLength: 1 },
          tags: {
            type: 'array',
            minItems: 1,
            uniqueItems: true,
            items: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    operations: {
      type: 'object',
      required: ['transform', 'tag', 'attach'],
      additionalProperties: false,
      properties: {
        transform: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'needs', 'output'],
            additionalProperties: false,
            properties: {
              id: { type: 'string', minLength: 1 },
              needs: itemRequirementSchema,
              output: { type: 'string', minLength: 1 },
            },
          },
        },
        tag: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'needs', 'adds'],
            additionalProperties: false,
            properties: {
              id: { type: 'string', minLength: 1 },
              needs: itemRequirementSchema,
              adds: {
                type: 'array',
                minItems: 1,
                uniqueItems: true,
                items: { type: 'string', minLength: 1 },
              },
            },
          },
        },
        attach: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'needs', 'consumes', 'adds'],
            additionalProperties: false,
            properties: {
              id: { type: 'string', minLength: 1 },
              needs: itemRequirementSchema,
              consumes: {
                type: 'array',
                minItems: 1,
                items: itemRequirementSchema,
              },
              adds: {
                type: 'array',
                minItems: 1,
                uniqueItems: true,
                items: { type: 'string', minLength: 1 },
              },
            },
          },
        },
      },
    },
    nodes: {
      type: 'object',
      required: ['source', 'splitter', 'station', 'sink', 'belt'],
      additionalProperties: false,
      properties: {
        source: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'itemId', 'output'],
            additionalProperties: false,
            properties: {
              id: { type: 'string', minLength: 1 },
              itemId: { type: 'string', minLength: 1 },
              output: { type: 'string', minLength: 1 },
            },
          },
        },
        splitter: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'input', 'outputs'],
            additionalProperties: false,
            properties: {
              id: { type: 'string', minLength: 1 },
              input: { type: 'string', minLength: 1 },
              outputs: {
                type: 'array',
                minItems: 1,
                uniqueItems: true,
                items: { type: 'string', minLength: 1 },
              },
              outputPolicy: {
                type: 'string',
                enum: ['shortestQueue', 'roundRobin', 'random', 'fillFirst'],
              },
            },
          },
        },
        station: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'inputs', 'output'],
            additionalProperties: false,
            properties: {
              id: { type: 'string', minLength: 1 },
              inputs: {
                type: 'array',
                minItems: 1,
                uniqueItems: true,
                items: { type: 'string', minLength: 1 },
              },
              output: { type: 'string', minLength: 1 },
              inputPolicy: {
                type: 'string',
                enum: ['firstBlocked', 'oldestFirst', 'roundRobin', 'priority'],
              },
              ops: {
                type: 'array',
                items: stationOpEntrySchema,
              },
              candidates: {
                type: 'array',
                items: stationOpEntrySchema,
              },
            },
            oneOf: [
              {
                required: ['ops'],
                not: { required: ['candidates'] },
              },
              {
                required: ['candidates'],
                not: { required: ['ops'] },
              },
            ],
          },
        },
        sink: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'inputs', 'needs'],
            additionalProperties: false,
            properties: {
              id: { type: 'string', minLength: 1 },
              inputs: {
                type: 'array',
                minItems: 1,
                uniqueItems: true,
                items: { type: 'string', minLength: 1 },
              },
              needs: itemRequirementSchema,
            },
          },
        },
        belt: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'from', 'to', 'travelTime', 'capacity'],
            additionalProperties: false,
            properties: {
              id: { type: 'string', minLength: 1 },
              from: { type: 'string', minLength: 1 },
              to: { type: 'string', minLength: 1 },
              travelTime: { type: 'number', exclusiveMinimum: 0 },
              capacity: { type: 'integer', minimum: 1 },
            },
          },
        },
      },
    },
    run: {
      type: 'object',
      required: ['seed', 'replications', 'horizon', 'warmupPct', 'confidence'],
      additionalProperties: false,
      properties: {
        seed: { type: 'integer' },
        replications: { type: 'integer', minimum: 1 },
        horizon: { type: 'number', exclusiveMinimum: 0 },
        warmupPct: { type: 'number', minimum: 0, exclusiveMaximum: 100 },
        confidence: {
          type: 'number',
          exclusiveMinimum: 0,
          exclusiveMaximum: 1,
        },
      },
    },
    analysis: {
      type: 'object',
      required: ['probes'],
      additionalProperties: false,
      properties: {
        probes: { type: 'boolean' },
      },
    },
    ui: {
      type: 'object',
      additionalProperties: false,
      properties: {
        layout: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            required: ['x', 'y'],
            additionalProperties: false,
            properties: {
              x: { type: 'number' },
              y: { type: 'number' },
            },
          },
        },
      },
    },
  },
};
