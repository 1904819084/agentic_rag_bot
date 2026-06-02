type LoadedFornaxSdk = {
  execute: unknown;
  streamExecute: unknown;
  ptaas: unknown;
  fornaxPromptHub: unknown;
  tracer: unknown;
  error: Error | null;
};

let cached: LoadedFornaxSdk | null = null;

export async function loadFornaxSdk(): Promise<LoadedFornaxSdk> {
  if (cached) {
    return cached;
  }

  const result: LoadedFornaxSdk = {
    execute: null,
    streamExecute: null,
    ptaas: null,
    fornaxPromptHub: null,
    tracer: null,
    error: null,
  };

  try {
    const sdk = await import('@next-ai/fornax-sdk');
    result.execute = typeof sdk.execute === 'function' ? sdk.execute : null;
    result.streamExecute = typeof sdk.streamExecute === 'function' ? sdk.streamExecute : null;
  } catch (error) {
    result.error = error instanceof Error ? error : new Error('fornax_sdk_import_failed');
  }

  try {
    const components = await import('@next-ai/fornax-sdk/components');
    result.fornaxPromptHub =
      typeof components.fornaxPromptHub === 'function' ? components.fornaxPromptHub : null;
    result.ptaas = typeof components.ptaas === 'function' ? components.ptaas : null;
  } catch (error) {
    result.error =
      result.error ??
      (error instanceof Error ? error : new Error('fornax_components_import_failed'));
  }

  try {
    const tracer = await import('@next-ai/fornax-sdk/tracer');
    result.tracer = tracer ?? null;
  } catch {
    result.tracer = null;
  }

  cached = result;
  return result;
}
