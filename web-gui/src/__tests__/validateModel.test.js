import { describe, it, expect } from 'vitest';
import { SAMPLE_LINE_MODEL, CANDIDATES_LINE_MODEL } from '../schema/presets.js';
import { normalizeModel } from '../utils/serializer.js';
import { validateModel } from '../validation/validateModel.js';

describe('LineBalancer Phase B1 — Serializer & Two-Tier Validator', () => {
  it('validates the reference SAMPLE_LINE_MODEL with zero errors', () => {
    const res = validateModel(SAMPLE_LINE_MODEL);
    expect(res.isValid).toBe(true);
    expect(res.schemaErrors).toHaveLength(0);
    expect(res.domainErrors).toHaveLength(0);
  });

  it('validates CANDIDATES_LINE_MODEL (stations using candidates instead of ops)', () => {
    const res = validateModel(CANDIDATES_LINE_MODEL);
    expect(res.isValid).toBe(true);
    expect(res.allErrors).toHaveLength(0);
  });

  it('omits empty tags arrays during normalization', () => {
    const copy = structuredClone(SAMPLE_LINE_MODEL);
    copy.items[0].tags = [];
    copy.operations.transform[0].needs.tags = [];
    const normalized = normalizeModel(copy);

    expect('tags' in normalized.items[0]).toBe(false);
    expect('tags' in normalized.operations.transform[0].needs).toBe(false);
  });

  it('catches duplicate IDs across transform, tag, and attach operations', () => {
    const copy = structuredClone(SAMPLE_LINE_MODEL);
    // Duplicate 'cut' inside tag operations
    copy.operations.tag.push({
      id: 'cut',
      needs: { itemId: 'part' },
      adds: ['drilled'],
    });
    const res = validateModel(copy);
    expect(res.isValid).toBe(false);
    expect(
      res.domainErrors.some((e) => e.category === 'Operations Namespace')
    ).toBe(true);
  });

  it('catches duplicate IDs across nodes and belts', () => {
    const copy = structuredClone(SAMPLE_LINE_MODEL);
    // Give source the same id as belt 'b1'
    copy.nodes.source[0].id = 'b1';
    const res = validateModel(copy);
    expect(res.isValid).toBe(false);
    expect(res.domainErrors.some((e) => e.category === 'Nodes Namespace')).toBe(
      true
    );
  });

  it('catches port-belt disagreement', () => {
    const copy = structuredClone(SAMPLE_LINE_MODEL);
    copy.nodes.belt[0].to = 's1'; // disagrees with sp1.input = b1
    const res = validateModel(copy);
    expect(res.isValid).toBe(false);
    expect(
      res.domainErrors.some((e) => e.category === 'Port-Belt Agreement')
    ).toBe(true);
  });
});
