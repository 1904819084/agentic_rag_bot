import { LifecycleHook, LifecycleHookUnit } from '@gulux/gulux';

interface DidReadyHookProps {
  app: unknown;
}

@LifecycleHookUnit()
export default class ApplicationBootstrap {
  @LifecycleHook('didReady')
  public async didReady(_props: DidReadyHookProps) {
    // Reserved for startup checks that should run in the API process.
  }
}
