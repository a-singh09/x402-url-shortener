import { pool } from "./connection";
import fs from "fs/promises";
import path from "path";

export interface Migration {
  version: string;
  name: string;
  up: string;
  down?: string;
}

export class MigrationManager {
  private migrationsTable = "schema_migrations";

  async initialize(): Promise<void> {
    // Create migrations tracking table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
        version VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async getAppliedMigrations(): Promise<string[]> {
    const result = await pool.query(
      `SELECT version FROM ${this.migrationsTable} ORDER BY version`,
    );
    return result.rows.map((row) => row.version);
  }

  async applyMigration(migration: Migration): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Execute migration
      await client.query(migration.up);

      // Record migration as applied
      await client.query(
        `INSERT INTO ${this.migrationsTable} (version, name) VALUES ($1, $2)`,
        [migration.version, migration.name],
      );

      await client.query("COMMIT");
      console.log(
        `Applied migration: ${migration.version} - ${migration.name}`,
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw new Error(
        `Failed to apply migration ${migration.version}: ${error}`,
      );
    } finally {
      client.release();
    }
  }

  async rollbackMigration(migration: Migration): Promise<void> {
    if (!migration.down) {
      throw new Error(`No rollback script for migration ${migration.version}`);
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Execute rollback
      await client.query(migration.down);

      // Remove migration record
      await client.query(
        `DELETE FROM ${this.migrationsTable} WHERE version = $1`,
        [migration.version],
      );

      await client.query("COMMIT");
      console.log(
        `Rolled back migration: ${migration.version} - ${migration.name}`,
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw new Error(
        `Failed to rollback migration ${migration.version}: ${error}`,
      );
    } finally {
      client.release();
    }
  }

  async runMigrations(migrations: Migration[]): Promise<void> {
    await this.initialize();
    const appliedMigrations = await this.getAppliedMigrations();

    for (const migration of migrations) {
      if (!appliedMigrations.includes(migration.version)) {
        await this.applyMigration(migration);
      }
    }
  }
}
