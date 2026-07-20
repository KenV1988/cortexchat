import type { Category, Classification, Message } from './types.js';

/**
 * Deterministic, rule-based request classifier.
 *
 * Deliberately NOT an LLM call: spending inference (and therefore watts and
 * dollars) to decide which model should spend more inference defeats the
 * entire point of the router. Every signal here is a cheap regex/keyword/
 * structural check that runs in microseconds on a laptop CPU.
 */

const GREETING_RE =
  /^\s*(hi|hello|hey|hiya|yo|good\s(morning|afternoon|evening)|sup|tere|tervist|t[sš]au|tere\s(hommikust|õhtust|päevast))\b[!.\s]*$/i;
const SMALL_TALK_RE =
  /\b(how are you|what'?s up|how'?s it going|thanks?|thank you|lol|haha|nice one|good bot)\b/i;
const CODE_FENCE_RE = /```|`[^`\n]+`/;
const PROGRAMMING_RE =
  /\b(function|class\s+\w+|import\s+\w|def\s+\w|const\s+\w|stack trace|traceback|exception|npm|pnpm|pip install|compile|refactor|unit test|regex|api endpoint|null pointer|segfault|bug\b)\b/i;
const MATH_RE =
  /(\d+\s*[+\-*/^]\s*\d+|\bsolve\b|\bequation\b|\bderivative\b|\bintegral\b|\bcalculate\b|\bmatrix\b|\bprobability\b|√|∑|∫)/i;
const OCR_RE = /\b(ocr|extract (the )?text from|read the text in|scan this (image|document))\b/i;
const IMAGE_RE = /\b(this image|this photo|this screenshot|what'?s in (the|this) (image|picture))\b/i;
const AUDIO_RE = /\b(transcribe|this audio|this recording|voice memo|voicemail)\b/i;
const TRANSLATION_RE =
  /\btranslate\b.*\b(into|to)\b|\bin (spanish|french|german|estonian|russian|chinese|japanese|italian|portuguese)\b/i;
const RESEARCH_RE =
  /\b(latest|current|recent news|search the web|find sources|cite (your )?sources|up[- ]to[- ]date|what happened|who won)\b/i;
const PLANNING_RE = /\b(plan|roadmap|itinerary|step[- ]by[- ]step plan|schedule|outline a plan)\b/i;
const WRITING_RE =
  /\b(write (a|an|me)|draft (a|an)|compose|essay|blog post|short story|poem|cover letter)\b/i;
const DOCUMENT_RE =
  /\b(summarize (this|the) (document|pdf|file|report)|analyze (this|the) (document|pdf|file)|attached (document|file|pdf))\b/i;
const MULTI_STEP_RE = /\b(step 1|first,.*then,|and then also|multiple agents|use agents)\b/i;
const QUESTION_WORDS_RE = /^(what|who|when|where|how many|how much|which|is|does|do|can)\b/i;

const LONG_CONTEXT_TOKEN_THRESHOLD = 16_000;

function estimateTokens(messages: Message[]): number {
  const chars = messages.reduce((sum, m) => sum + m.content.length, 0);
  // ~4 chars/token is the standard rough estimate for English text.
  return Math.ceil(chars / 4);
}

function countDistinctImperatives(text: string): number {
  const imperatives = text.match(/\b(write|build|research|then|also|and)\b/gi);
  return imperatives ? new Set(imperatives.map((s) => s.toLowerCase())).size : 0;
}

interface Detector {
  category: Category;
  test(latest: string, fullText: string, wordCount: number): number | null; // returns confidence or null
  signal: string;
}

const DETECTORS: Detector[] = [
  { category: 'greeting', signal: 'matched greeting pattern', test: (l) => (GREETING_RE.test(l) ? 0.95 : null) },
  {
    category: 'ocr',
    signal: 'matched OCR/text-extraction keywords',
    test: (l) => (OCR_RE.test(l) ? 0.9 : null),
  },
  {
    category: 'audio',
    signal: 'matched audio/transcription keywords',
    test: (l) => (AUDIO_RE.test(l) ? 0.9 : null),
  },
  {
    category: 'image_understanding',
    signal: 'matched image-reference keywords',
    test: (l) => (IMAGE_RE.test(l) ? 0.85 : null),
  },
  {
    category: 'document_analysis',
    signal: 'matched document-analysis keywords',
    test: (l) => (DOCUMENT_RE.test(l) ? 0.85 : null),
  },
  {
    category: 'programming',
    signal: 'matched code fence or programming keywords',
    test: (l) => {
      if (CODE_FENCE_RE.test(l)) return 0.95;
      if (PROGRAMMING_RE.test(l)) return 0.8;
      return null;
    },
  },
  { category: 'math', signal: 'matched math notation or keywords', test: (l) => (MATH_RE.test(l) ? 0.85 : null) },
  {
    category: 'translation',
    signal: 'matched translation request pattern',
    test: (l) => (TRANSLATION_RE.test(l) ? 0.85 : null),
  },
  {
    category: 'multi_agent_task',
    signal: 'detected multiple distinct sub-tasks in one request',
    test: (l, _f, wc) => {
      if (MULTI_STEP_RE.test(l)) return 0.8;
      if (wc > 60 && countDistinctImperatives(l) >= 4) return 0.6;
      return null;
    },
  },
  {
    category: 'research',
    signal: 'matched research/current-events keywords',
    test: (l) => (RESEARCH_RE.test(l) ? 0.75 : null),
  },
  { category: 'planning', signal: 'matched planning keywords', test: (l) => (PLANNING_RE.test(l) ? 0.75 : null) },
  { category: 'writing', signal: 'matched creative/long-form writing keywords', test: (l) => (WRITING_RE.test(l) ? 0.75 : null) },
  {
    category: 'small_talk',
    signal: 'matched small-talk pattern',
    test: (l, _f, wc) => (SMALL_TALK_RE.test(l) && wc < 12 ? 0.75 : null),
  },
  {
    category: 'simple_question',
    signal: 'short factual question',
    test: (l, _f, wc) => (QUESTION_WORDS_RE.test(l.trim()) && wc <= 20 ? 0.6 : null),
  },
  {
    category: 'complex_reasoning',
    signal: 'long or multi-clause request with no more specific match',
    test: (_l, _f, wc) => (wc > 40 ? 0.55 : null),
  },
];

export function classify(messages: Message[]): Classification {
  const latestUser = [...messages].reverse().find((m) => m.role === 'user');
  const latest = (latestUser?.content ?? '').trim();
  const fullText = messages.map((m) => m.content).join('\n');
  const wordCount = latest.split(/\s+/).filter(Boolean).length;
  const estimatedTokens = estimateTokens(messages);

  if (estimatedTokens > LONG_CONTEXT_TOKEN_THRESHOLD) {
    return {
      category: 'long_context',
      confidence: 0.9,
      signals: [`conversation is ~${estimatedTokens} tokens, above the ${LONG_CONTEXT_TOKEN_THRESHOLD} long-context threshold`],
      estimatedTokens,
    };
  }

  let best: { category: Category; confidence: number; signal: string } | null = null;
  for (const detector of DETECTORS) {
    const confidence = detector.test(latest, fullText, wordCount);
    if (confidence !== null && (!best || confidence > best.confidence)) {
      best = { category: detector.category, confidence, signal: detector.signal };
    }
  }

  if (!best) {
    // Nothing matched at all: short non-question -> small talk, otherwise a
    // plain simple question. This keeps classification total (never throws).
    best =
      wordCount <= 8
        ? { category: 'small_talk', confidence: 0.4, signal: 'short message with no stronger signal, default to small talk' }
        : { category: 'simple_question', confidence: 0.4, signal: 'no stronger signal, default to simple question' };
  }

  return {
    category: best.category,
    confidence: best.confidence,
    signals: [best.signal],
    estimatedTokens,
  };
}
