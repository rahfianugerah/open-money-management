const fs = require('node:fs/promises');
const path = require('node:path');
const { pool } = require('./pool');

const MIGRATION_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
`;

async function ensureMigrationsTable(client) {
  await client.query(MIGRATION_TABLE_SQL);
}

async function getExecutedMigrations(client) {
  const result = await client.query('SELECT name FROM migrations');
  return new Set(result.rows.map((row) => row.name));
}

async function getMigrationFiles() {
  const migrationsDir = path.resolve(process.cwd(), 'migrations');
  const files = await fs.readdir(migrationsDir);

  return files
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b, 'en'))
    .map((file) => path.join(migrationsDir, file));
}

async function run() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await ensureMigrationsTable(client);
    await client.query('COMMIT');

    const executedMigrations = await getExecutedMigrations(client);
    const migrationFiles = await getMigrationFiles();

    for (const migrationFile of migrationFiles) {
      const migrationName = path.basename(migrationFile);

      if (executedMigrations.has(migrationName)) {
        continue;
      }

      const sql = await fs.readFile(migrationFile, 'utf8');

      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO migrations (name) VALUES ($1)', [migrationName]);
      await client.query('COMMIT');

      console.log(`Applied migration: ${migrationName}`);
    }

    console.log('Migrations are up to date.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
