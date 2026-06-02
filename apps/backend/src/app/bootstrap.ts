import { LifecycleHook, LifecycleHookUnit } from '@gulux/gulux';
import { env } from '../config/env';
import SyncWorker from '../workers/syncWorker';

interface DidReadyHookProps {
  app: { container: { get<T>(token: new (...args: never[]) => T): T } };
}

@LifecycleHookUnit()
export default class ApplicationBootstrap {
  @LifecycleHook('didReady')
  public async didReady({ app }: DidReadyHookProps) {
    if (env.processRole === 'api') {
      return;
    }

    const Worker = app.container.get(SyncWorker);
    Worker.start();
  }
}
