import { Injectable } from '@gulux/gulux';
import pg from 'pg';
import pgvector from 'pgvector/pg';
import { env } from '../config/env';

const { Pool } = pg;
type Queryable = Pick<pg.Pool | pg.PoolClient, 'query'>;

@Injectable()
export class PostgresRepository {
  private readonly pool = new Pool({
    host: env.postgres.host,
    port: env.postgres.port,
    database: env.postgres.database,
    user: env.postgres.user,
    password: env.postgres.password,
    onConnect: async (client) => {
      try {
        await pgvector.registerTypes(client);
      } catch {
        // Migrations create the vector extension. Startup should still work before they run.
      }
    },
  });

  public query<T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, params?: unknown[]) {
    return this.pool.query<T>(text, params);
  }

  public async transaction<T>(callback: (client: Queryable) => Promise<T>) {
    const client = await this.pool.connect();
    try {
      await pgvector.registerTypes(client);
    } catch {
      // The vector type may not exist before migrations run.
    }

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
