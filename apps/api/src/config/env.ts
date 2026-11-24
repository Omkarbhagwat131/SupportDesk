import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(__dirname, "../../../../.env") });

const DEFAULT_CORS_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"];
const MAX_JWT_LIFETIME_SECONDS = 30 * 24 * 60 * 60;

function parseCorsOrigins(value: string | undefined): string[] {
  if (value === undefined) return DEFAULT_CORS_ORIGINS;
  if (value.trim() === "") return [];

  return value.split(",").map((entry) => {
    const origin = entry.trim();
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error("CORS_ORIGINS must contain valid origins separated by commas.");
    }

    if (
      (parsed.protocol !== "http:" && parsed.protocol !== "https:")
      || parsed.origin !== origin
      || parsed.username !== ""
      || parsed.password !== ""
    ) {
      throw new Error("CORS_ORIGINS entries must be exact http or https origins without paths.");
    }
    return parsed.origin;
  }).filter((origin, index, origins) => origins.indexOf(origin) === index);
}

function parseJwtLifetime(value: string | undefined): number {
  const duration = value ?? "1d";
  const match = /^([1-9]\d*)(s|m|h|d)$/.exec(duration);
  if (!match) {
    throw new Error("JWT_EXPIRES_IN must be a positive duration such as 15m, 1h, or 1d.");
  }

  const amount = Number(match[1]);
  let secondsPerUnit: number;
  switch (match[2]) {
    case "s":
      secondsPerUnit = 1;
      break;
    case "m":
      secondsPerUnit = 60;
      break;
    case "h":
      secondsPerUnit = 3600;
      break;
    case "d":
      secondsPerUnit = 86400;
      break;
    default:
      throw new Error("JWT_EXPIRES_IN must use seconds, minutes, hours, or days.");
  }
  const seconds = amount * secondsPerUnit;
  if (!Number.isSafeInteger(seconds) || seconds > MAX_JWT_LIFETIME_SECONDS) {
    throw new Error("JWT_EXPIRES_IN must not exceed 30 days.");
  }
  return seconds;
}

export function validateEnv(environment: NodeJS.ProcessEnv) {
  const port = Number(environment.PORT ?? 3000);
  const databaseUrl = environment.DATABASE_URL;
  const jwtSecret = environment.JWT_SECRET;
  const geminiKeyValue = environment.GEMINI_API_KEY;
  const geminiKey = geminiKeyValue?.trim() || null;
  const geminiModel = environment.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite";
  const geminiInputCostPerMillion = parseOptionalCost(
    environment.GEMINI_INPUT_COST_PER_1M_TOKENS,
    "GEMINI_INPUT_COST_PER_1M_TOKENS",
  );
  const geminiOutputCostPerMillion = parseOptionalCost(
    environment.GEMINI_OUTPUT_COST_PER_1M_TOKENS,
    "GEMINI_OUTPUT_COST_PER_1M_TOKENS",
  );
  const corsOrigins = parseCorsOrigins(environment.CORS_ORIGINS);
  const jwtExpiresInSeconds = parseJwtLifetime(environment.JWT_EXPIRES_IN);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be a valid port number.");
  }

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env before starting the API.");
  }

  if (!jwtSecret || Buffer.byteLength(jwtSecret, "utf8") < 32 || jwtSecret.startsWith("replace_with_")) {
    throw new Error("JWT_SECRET must be set to a non-placeholder value of at least 32 bytes.");
  }

  if (
    geminiKey !== null && (geminiKey.length < 20 || /placeholder/i.test(geminiKey))
  ) {
    throw new Error("GEMINI_API_KEY must be a non-placeholder API key when configured.");
  }

  if (geminiModel.length === 0 || geminiModel.length > 100 || /[\s\0-\x1f]/.test(geminiModel)) {
    throw new Error("GEMINI_MODEL must be a non-empty model identifier without whitespace.");
  }

  return {
    port,
    databaseUrl,
    jwtSecret,
    corsOrigins,
    jwtExpiresInSeconds,
    gemini: {
      apiKey: geminiKey,
      model: geminiModel,
      inputCostPerMillion: geminiInputCostPerMillion,
      outputCostPerMillion: geminiOutputCostPerMillion,
    },
  };
}

function parseOptionalCost(value: string | undefined, name: string): number | null {
  if (value === undefined || value.trim() === "") return null;
  const cost = Number(value);
  if (!Number.isFinite(cost) || cost < 0) {
    throw new Error(`${name} must be a non-negative number.`);
  }
  return cost;
}

export const env = validateEnv(process.env);