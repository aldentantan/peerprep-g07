import { Client } from 'pg';

const DEFAULT_BOOTSTRAP_DB = process.env.DB_BOOTSTRAP_DB || 'postgres';
const DATABASE_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

function getConnectionConfig(database) {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database,
  };
}

export async function ensureDatabaseExists() {
  const databaseName = process.env.DB_NAME || 'peerprep_attempt_history';

  if (!DATABASE_NAME_PATTERN.test(databaseName)) {
    throw new Error('DB_NAME must contain only letters, numbers, and underscores.');
  }

  const client = new Client(getConnectionConfig(DEFAULT_BOOTSTRAP_DB));

  try {
    await client.connect();

    const existingDatabase = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [databaseName],
    );

    if (existingDatabase.rowCount === 0) {
      await client.query(`CREATE DATABASE "${databaseName}"`);
      console.log(`Created database "${databaseName}".`);
    }
  } catch (error) {
    if (error?.code !== '42P04') {
      throw error;
    }
  } finally {
    await client.end();
  }
}
