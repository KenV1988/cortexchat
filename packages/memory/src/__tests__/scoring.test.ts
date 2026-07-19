import { describe, expect, it } from 'vitest';
import { decayedScore, scoreMemoryItem } from '../scoring.js';

describe('scoreMemoryItem', () => {
  it('scores preferences higher than summaries', () => {
    expect(scoreMemoryItem('preference', 'likes dark mode')).toBeGreaterThan(scoreMemoryItem('summary', 'likes dark mode'));
  });

  it('caps at 1', () => {
    expect(scoreMemoryItem('preference', 'x'.repeat(10_000))).toBeLessThanOrEqual(1);
  });
});

describe('decayedScore', () => {
  it('returns close to the base score immediately after access', () => {
    const now = Date.now();
    expect(decayedScore(0.8, now, now)).toBeCloseTo(0.8, 5);
  });

  it('decays toward zero the longer a memory goes unaccessed', () => {
    const now = Date.now();
    const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;
    // one half-life should roughly halve the score
    expect(decayedScore(0.8, ninetyDaysAgo, now)).toBeCloseTo(0.4, 1);
  });

  it('never increases score over time', () => {
    const now = Date.now();
    const earlier = now - 5 * 24 * 60 * 60 * 1000;
    expect(decayedScore(0.5, earlier, now)).toBeLessThanOrEqual(0.5);
  });
});
