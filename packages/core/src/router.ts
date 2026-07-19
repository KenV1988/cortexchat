import { classify } from './classifier.js';
import {
  TIER_ORDER,
  type Category,
  type Message,
  type ModelInfo,
  type RoutingDecision,
  type Tier,
} from './types.js';
import { NoCapableModelError } from './types.js';

/** Minimum tier required to handle each category, absent any escalation. */
const CATEGORY_MIN_TIER: Record<Category, Tier> = {
  greeting: 'tiny_local',
  small_talk: 'tiny_local',
  simple_question: 'tiny_local',
  translation: 'medium_local',
  programming: 'medium_local',
  math: 'medium_local',
  writing: 'medium_local',
  planning: 'medium_local',
  document_analysis: 'medium_local',
  image_understanding: 'medium_local',
  ocr: 'medium_local',
  audio: 'medium_local',
  complex_reasoning: 'open_cloud',
  research: 'open_cloud',
  long_context: 'open_cloud',
  multi_agent_task: 'premium',
};

/** Below this confidence, the router escalates one tier as a safety margin. */
const CONFIDENCE_ESCALATION_THRESHOLD = 0.6;

function tierIndex(tier: Tier): number {
  return TIER_ORDER.indexOf(tier);
}

export interface RouterOptions {
  /** Predicate for whether a given model's underlying provider is currently usable (key present, endpoint reachable). */
  isAvailable: (model: ModelInfo) => boolean;
}

export class Router {
  constructor(
    private readonly models: ModelInfo[],
    private readonly options: RouterOptions,
  ) {}

  route(messages: Message[]): RoutingDecision {
    const classification = classify(messages);
    const reasoning: string[] = [
      `classified as "${classification.category}" (confidence ${classification.confidence.toFixed(2)}): ${classification.signals.join('; ')}`,
    ];

    let requiredTier = CATEGORY_MIN_TIER[classification.category];
    let escalated = false;

    if (classification.confidence < CONFIDENCE_ESCALATION_THRESHOLD) {
      const nextIndex = Math.min(tierIndex(requiredTier) + 1, TIER_ORDER.length - 1);
      const escalatedTier = TIER_ORDER[nextIndex];
      if (escalatedTier && escalatedTier !== requiredTier) {
        reasoning.push(
          `confidence ${classification.confidence.toFixed(2)} is below the ${CONFIDENCE_ESCALATION_THRESHOLD} threshold, escalating minimum tier from "${requiredTier}" to "${escalatedTier}"`,
        );
        requiredTier = escalatedTier;
        escalated = true;
      }
    }

    // Long-context and document-analysis requests additionally need a model
    // whose context window actually fits the conversation.
    const minContextWindow =
      classification.category === 'long_context' || classification.category === 'document_analysis'
        ? classification.estimatedTokens
        : 0;

    const capable = this.models.filter(
      (m) => m.capabilities.includes(classification.category) && m.contextWindow >= minContextWindow,
    );

    if (capable.length === 0) {
      throw new NoCapableModelError(classification.category);
    }

    // Walk tiers upward from requiredTier until we find a *configured* model.
    let chosen: ModelInfo | undefined;
    for (let i = tierIndex(requiredTier); i < TIER_ORDER.length; i++) {
      const tier = TIER_ORDER[i];
      const atThisTier = capable
        .filter((m) => m.tier === tier && this.options.isAvailable(m))
        .sort((a, b) => a.costPerMTokIn + a.costPerMTokOut - (b.costPerMTokIn + b.costPerMTokOut));
      if (atThisTier.length > 0) {
        chosen = atThisTier[0];
        if (tier !== requiredTier) {
          reasoning.push(
            `no configured model available at required tier "${requiredTier}", escalated further to "${tier}"`,
          );
          escalated = true;
        }
        break;
      }
    }

    // Last resort: any configured capable model at all, even below the
    // required tier, is better than failing the request outright.
    if (!chosen) {
      const anyConfigured = capable
        .filter((m) => this.options.isAvailable(m))
        .sort((a, b) => tierIndex(a.tier) - tierIndex(b.tier));
      chosen = anyConfigured[0];
      if (chosen) {
        reasoning.push(
          `no configured model met the required tier; falling back to the best available configured model ("${chosen.tier}")`,
        );
      }
    }

    if (!chosen) {
      throw new NoCapableModelError(classification.category);
    }

    reasoning.push(`selected "${chosen.id}" (${chosen.provider}, tier "${chosen.tier}")`);

    return {
      model: chosen,
      category: classification.category,
      confidence: classification.confidence,
      tier: chosen.tier,
      escalated,
      reasoning,
    };
  }
}
