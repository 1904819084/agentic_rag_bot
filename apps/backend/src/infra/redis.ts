import { Injectable } from '@gulux/gulux';
import IORedis from 'ioredis';
import { env } from '../config/env';

@Injectable()
export class RedisConnection {
  private connection: IORedis | null = null;

  public getConnection() {
    if (!this.connection) {
      this.connection = new IORedis({
        host: env.redis.host,
        port: env.redis.port,
        maxRetriesPerRequest: null,
      });
    }

    return this.connection;
  }
}
