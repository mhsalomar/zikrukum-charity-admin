const DEFAULT_SUPABASE_TIMEOUT_MS = 10_000;

export async function fetchWithSupabaseTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  const timeoutSignal = AbortSignal.timeout(DEFAULT_SUPABASE_TIMEOUT_MS);
  const existingSignal =
    init?.signal ?? (input instanceof Request ? input.signal : undefined);
  const signal = existingSignal
    ? AbortSignal.any([existingSignal, timeoutSignal])
    : timeoutSignal;

  return fetch(input, { ...init, signal });
}
