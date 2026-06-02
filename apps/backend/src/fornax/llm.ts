import { getFornaxAuthOptions } from './fornaxAuth';
import { loadFornaxSdk } from './fornaxSdk';

function stripMarkdownCodeFence(text: string) {
  return text
    .trim()
    .replace(/^```[a-zA-Z0-9_-]*\s*/, '')
    .replace(/```$/, '')
    .trim();
}

function normalizeTextResult(result: unknown) {
  if (!result) {
    return '';
  }

  if (typeof result === 'string') {
    return stripMarkdownCodeFence(result);
  }

  if (typeof result !== 'object') {
    return '';
  }

  const record = result as { text?: unknown; choices?: unknown };

  if (typeof record.text === 'string') {
    return stripMarkdownCodeFence(record.text);
  }

  const choices = Array.isArray(record.choices) ? record.choices : [];
  const firstMessage = choices[0]?.message;

  if (typeof firstMessage?.content === 'string') {
    return stripMarkdownCodeFence(firstMessage.content);
  }

  return '';
}

export async function fornaxExecute({
  promptKey,
  promptVersion,
  variables,
  callOptions,
  mcpExecuteConfig,
}: {
  promptKey: string;
  promptVersion?: string;
  variables?: Record<string, unknown>;
  callOptions?: Record<string, unknown>;
  mcpExecuteConfig?: {
    headers?: Record<string, Record<string, string>>;
    params?: Record<string, Record<string, string>>;
    common_headers?: Record<string, string>;
    common_params?: Record<string, string>;
  };
}) {
  const { ptaas } = await loadFornaxSdk();
  const auth = getFornaxAuthOptions();

  if (!ptaas) {
    return { ok: false, error: 'fornax_ptaas_unavailable', text: '' };
  }

  if (!auth.ak || !auth.sk) {
    return { ok: false, error: 'fornax_auth_missing', text: '' };
  }

  try {
    const model = (ptaas as (key: string, options: Record<string, unknown>) => any)(promptKey, {
      ak: auth.ak,
      sk: auth.sk,
      region: auth.region,
      serviceMeta: auth.serviceMeta,
      timeout: 60_000,
    });

    const result = await model.invoke({
      messages: [],
      modelConfigs: {
        version: promptVersion,
        variables: variables ?? {},
        mcpExecuteConfig,
      },
      callOptions: callOptions ?? {},
    });

    return {
      ok: true,
      error: null,
      text: normalizeTextResult(result),
      raw: result,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'fornax_execute_failed',
      text: '',
    };
  }
}
