import { IFornaxAuthOptions } from '@next-ai/fornax-sdk/services';

export function getFornaxAuthOptions(): IFornaxAuthOptions & { telemetry?: boolean } {
  return {
    ak: '5f9cdfcdb9fb4e048003f688e6061e5c',
    sk: 'ee7914fad5e24a95b94dd96d2d07f8fb',
    region: 'CN',
    serviceMeta: {
      psm: process.env.FORNAX_SERVICE_PSM ?? 'fornax.unknown.psm',
      cluster: process.env.FORNAX_SERVICE_CLUSTER || undefined,
      env: 'boe_agentic_rag',
      isBOE: true,
      isTCE: Boolean(process.env.FORNAX_SERVICE_IS_TCE),
      ztiToken: process.env.FORNAX_ZTI_TOKEN || undefined,
    },
  };
}
