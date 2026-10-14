import mysql, { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.TIDB_HOST || 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
      port: Number(process.env.TIDB_PORT) || 4000,
      user: process.env.TIDB_USER || '2eAdwtaQKjkweGo.root',
      password: process.env.TIDB_PASSWORD || 'WlFXPmU3OQVc5m0p',
      database: process.env.TIDB_DATABASE || 'xhubhack',
      ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true,
      },
      waitForConnections: true,
      connectionLimit: 15,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });
  }
  return pool;
}

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const p = getPool();
  const [rows] = await p.query<RowDataPacket[] & T[]>(sql, params);
  return rows as T[];
}

export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const p = getPool();
  const [rows] = await p.query<RowDataPacket[] & T[]>(sql, params);
  return rows && rows.length > 0 ? (rows[0] as T) : null;
}

export async function execute(sql: string, params: any[] = []): Promise<{ insertId: number; affectedRows: number }> {
  const p = getPool();
  const [result] = await p.execute<ResultSetHeader>(sql, params);
  return {
    insertId: result.insertId,
    affectedRows: result.affectedRows,
  };
}

export const db = {
  query,
  queryOne,
  execute,
  prepare(sql: string) {
    return {
      all: async (...args: any[]) => {
        const flat = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        return query(sql, flat);
      },
      get: async (...args: any[]) => {
        const flat = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        return queryOne(sql, flat);
      },
      run: async (...args: any[]) => {
        const flat = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        const res = await execute(sql, flat);
        return { lastInsertRowid: res.insertId, changes: res.affectedRows };
      },
    };
  },
  transaction: async <T>(fn: (connection: mysql.PoolConnection) => Promise<T>): Promise<T> => {
    const p = getPool();
    const conn = await p.getConnection();
    try {
      await conn.beginTransaction();
      const res = await fn(conn);
      await conn.commit();
      return res;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },
};

export function getDb() {
  return db;
}

export default getDb;
