export type AIUsage = {
  inputTokens: number;
  outputTokens: number;
};

export type AIUsagePricing = {
  inputCostPerMillion: number;
  outputCostPerMillion: number;
};

export type AIUsageRecord = AIUsage & {
  feature: "suggest-reply" | "categorize-ticket";
  model: string;
  costUsd: number | null;
};

export function calculateAIUsageCost(usage: AIUsage, pricing: AIUsagePricing): number {
  return (
    usage.inputTokens * pricing.inputCostPerMillion
    + usage.outputTokens * pricing.outputCostPerMillion
  ) / 1_000_000;
}

export function logAIUsage(
  feature: AIUsageRecord["feature"],
  model: string,
  usage: AIUsage,
  pricing?: AIUsagePricing,
): void {
  const record: AIUsageRecord = {
    feature,
    model,
    ...usage,
    costUsd: pricing ? calculateAIUsageCost(usage, pricing) : null,
  };
  console.info("AI usage", JSON.stringify(record));
}
