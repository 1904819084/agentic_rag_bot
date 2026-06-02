import { getFornaxAuthOptions } from './fornaxAuth';
import { loadFornaxSdk } from './fornaxSdk';

let promptHub: any | null = null;

async function getFornaxPromptHub() {
  if (promptHub) {
    return promptHub;
  }

  const { fornaxPromptHub } = await loadFornaxSdk();
  const auth = getFornaxAuthOptions();

  if (typeof fornaxPromptHub !== 'function' || !auth.ak || !auth.sk) {
    return null;
  }

  promptHub = fornaxPromptHub({
    ak: auth.ak,
    sk: auth.sk,
    region: auth.region,
    serviceMeta: auth.serviceMeta,
  });

  return promptHub;
}

export async function getFornaxPrompt({
  key,
  version,
  variables,
  releaseLabel,
  forceRefresh,
}: {
  key: string;
  version?: string;
  variables?: Record<string, unknown>;
  releaseLabel?: string;
  forceRefresh?: boolean;
}) {
  const hub = await getFornaxPromptHub();

  if (!hub) {
    return null;
  }

  return hub.getPrompt({
    key,
    version,
    variables,
    releaseLabel,
    forceRefresh,
  });
}
