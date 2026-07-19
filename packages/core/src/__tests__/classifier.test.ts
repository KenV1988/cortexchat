import { describe, expect, it } from 'vitest';
import { classify } from '../classifier.js';
import type { Message } from '../types.js';

function userMsg(content: string): Message[] {
  return [{ role: 'user', content }];
}

describe('classify', () => {
  it('classifies a greeting', () => {
    const result = classify(userMsg('hello!'));
    expect(result.category).toBe('greeting');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('classifies small talk', () => {
    const result = classify(userMsg('how are you doing today?'));
    expect(result.category).toBe('small_talk');
  });

  it('classifies a fenced code block as programming', () => {
    const result = classify(userMsg('fix this:\n```js\nfunction foo() { return }\n```'));
    expect(result.category).toBe('programming');
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it('classifies a stack trace question as programming without a fence', () => {
    const result = classify(userMsg('I am getting a null pointer exception in my function, why?'));
    expect(result.category).toBe('programming');
  });

  it('classifies arithmetic as math', () => {
    const result = classify(userMsg('please calculate the derivative of x^2 + 3x'));
    expect(result.category).toBe('math');
  });

  it('classifies a translation request', () => {
    const result = classify(userMsg('translate "good morning" into french'));
    expect(result.category).toBe('translation');
  });

  it('classifies a research request', () => {
    const result = classify(userMsg('what is the latest news on the current interest rate?'));
    expect(result.category).toBe('research');
  });

  it('classifies a planning request', () => {
    const result = classify(userMsg('help me build a step-by-step plan to launch my product'));
    expect(result.category).toBe('planning');
  });

  it('classifies a writing request', () => {
    const result = classify(userMsg('write me a short story about a robot who learns to paint'));
    expect(result.category).toBe('writing');
  });

  it('classifies a short factual question as simple_question', () => {
    const result = classify(userMsg('what is the capital of France?'));
    expect(result.category).toBe('simple_question');
  });

  it('falls back to complex_reasoning for a long, unmatched request', () => {
    const long = 'Explain in depth '.repeat(20) + 'why democracies sometimes elect authoritarian leaders and what structural factors contribute to it';
    const result = classify(userMsg(long));
    expect(result.category).toBe('complex_reasoning');
  });

  it('classifies as long_context when the conversation is huge, overriding topical signals', () => {
    const huge = 'a'.repeat(20_000 * 4); // ~20k tokens
    const result = classify(userMsg(`hello! ${huge}`));
    expect(result.category).toBe('long_context');
    expect(result.estimatedTokens).toBeGreaterThan(16_000);
  });

  it('never throws and always returns a category for empty input', () => {
    expect(() => classify([])).not.toThrow();
    expect(classify([]).category).toBeDefined();
  });
});
