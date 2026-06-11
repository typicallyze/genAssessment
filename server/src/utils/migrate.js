import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  console.log('Running database migrations...\n');

  // Create migrations tracking table
  await query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const migrationsDir = path.join(__dirname, '../../migrations');
  const files = await fs.readdir(migrationsDir);
  const sqlFiles = files.filter((f) => f.endsWith('.sql')).sort();

  // Get already-run migrations
  const executed = await query('SELECT name FROM _migrations');
  const executedNames = new Set(executed.rows.map((r) => r.name));

  for (const file of sqlFiles) {
    if (executedNames.has(file)) {
      console.log(`  ✓ ${file} (already applied)`);
      continue;
    }

    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf-8');
    try {
      await query('BEGIN');
      await query(sql);
      await query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
      await query('COMMIT');
      console.log(`  ✅ ${file} (applied)`);
    } catch (err) {
      await query('ROLLBACK');
      console.error(`  ❌ ${file} failed:`, err.message);
      process.exit(1);
    }
  }

  console.log('\nMigrations complete!');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration runner failed:', err);
  process.exit(1);
});
