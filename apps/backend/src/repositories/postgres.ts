import { Injectable } from '@gulux/gulux';
import pg from 'pg';
import { env } from '../config/env';

const { Pool } = pg;

@Injectable()
export class PostgresRepository {
  private readonly pool = new Pool({
    host: env.postgres.host,
    port: env.postgres.port,
    database: env.postgres.database,
    user: env.postgres.user,
    password: env.postgres.password,
  });

  public query<T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, params?: unknown[]) {
    return this.pool.query<T>(text, params);
  }
}
