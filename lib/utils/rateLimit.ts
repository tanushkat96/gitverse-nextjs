import { AxiosError } from "axios";

const RATE_LIMIT_PATTERNS = [
  "rate limit",
  "api rate limit",
  "secondary rate limit",
  "abuse limit",
  "too many requests",
  "429",
] as const;

export function isRateLimitError(err: unknown): boolean {
  if (err instanceof AxiosError) {
    if (err.response?.status === 429) return true;

    const retryAfter = err.response?.headers?.["retry-after"];
    if (retryAfter != null) return true;

    const xRateLimit = err.response?.headers?.["x-ratelimit-remaining"];
    if (xRateLimit === "0") return true;
  }

  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return RATE_LIMIT_PATTERNS.some((p) => msg.includes(p));
  }

  return false;
}

export function extractRetryAfter(err: unknown): number | null {
  if (!(err instanceof AxiosError) || !err.response) return null;

  const header = err.response.headers?.["retry-after"];
  if (header == null) return null;

  const parsed = parseInt(header, 10);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;

  const date = new Date(header);
  if (!isNaN(date.getTime())) {
    const seconds = Math.max(0, Math.ceil((date.getTime() - Date.now()) / 1000));
    return seconds > 0 ? seconds : null;
  }

  return null;
}

export function sanitizeErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const status = err.response?.status;
    const message = err.response?.data?.message || err.message;
    const safe = stripSensitive(String(message));
    return status ? `[${status}] ${safe}` : safe;
  }

  if (err instanceof Error) {
    return stripSensitive(err.message);
  }

  return stripSensitive(String(err));
}

function stripSensitive(text: string): string {
  return text
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, "Bearer [REDACTED]")
    .replace(/token[=:]\s*[A-Za-z0-9\-._~+/]+=*/gi, "token=[REDACTED]")
    .replace(/gh[pousr]_[A-Za-z0-9_]{36,}/gi, "[REDACTED]")
    .replace(/https?:\/\/[^@\s]+:[^@\s]+@/g, "https://[REDACTED]@")
    .replace(/Authorization:\s*.+/gi, "Authorization: [REDACTED]");
}
