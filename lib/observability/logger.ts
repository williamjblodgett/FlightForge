type LogContext = Record<string, string | number | boolean | null | undefined>;

function normalizeError(error: unknown) {
  if (!(error instanceof Error)) return { errorType: typeof error };
  return { errorName: error.name, errorMessage: error.message };
}

export function logError(event: string, error: unknown, context: LogContext = {}) {
  console.error(JSON.stringify({
    level: "error",
    event,
    releaseId: process.env.RELEASE_ID ?? "unknown",
    timestamp: new Date().toISOString(),
    ...context,
    ...normalizeError(error),
  }));
}
