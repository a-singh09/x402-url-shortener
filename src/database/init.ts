import { pool, testConnection } from "./connection";
import { MigrationManager, Migration } from "./migrations";
import fs from "fs/promises";
import path from "path";

// Initial schema migration
const initialMigration: Migration = {
  version: "001",
  name: "initial_schema",
  up: `
    -- Create extension for UUID generation
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- URLs table to store shortened URLs
    CREATE TABLE IF NOT EXISTS urls (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        short_code VARCHAR(10) UNIQUE NOT NULL,
        original_url TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP WITH TIME ZONE,
        click_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        payment_tx_hash VARCHAR(66),
        creator_address VARCHAR(42)
    );

    -- Payments table to track x402 payments
    CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        url_id UUID REFERENCES urls(id) ON DELETE CASCADE,
        transaction_hash VARCHAR(66),
        amount DECIMAL(20, 6) NOT NULL,
        currency VARCHAR(10) DEFAULT 'USDC',
        payer_address VARCHAR(42),
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        confirmed_at TIMESTAMP WITH TIME ZONE
    );

    -- Clicks table to track URL access attempts
    CREATE TABLE IF NOT EXISTS clicks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        url_id UUID REFERENCES urls(id) ON DELETE CASCADE,
        ip_address INET,
        user_agent TEXT,
        referer TEXT,
        payment_required BOOLEAN DEFAULT false,
        payment_id UUID REFERENCES payments(id),
        accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_urls_short_code ON urls(short_code);
    CREATE INDEX IF NOT EXISTS idx_urls_created_at ON urls(created_at);
    CREATE INDEX IF NOT EXISTS idx_payments_url_id ON payments(url_id);
    CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
    CREATE INDEX IF NOT EXISTS idx_clicks_url_id ON clicks(url_id);
    CREATE INDEX IF NOT EXISTS idx_clicks_accessed_at ON clicks(accessed_at);
  `,
  down: `
    DROP TABLE IF EXISTS clicks CASCADE;
    DROP TABLE IF EXISTS payments CASCADE;
    DROP TABLE IF EXISTS urls CASCADE;
    DROP EXTENSION IF EXISTS "uuid-ossp";
  `,
};

export class DatabaseInitializer {
  private migrationManager: MigrationManager;

  constructor() {
    this.migrationManager = new MigrationManager();
  }

  async initializeDatabase(): Promise<void> {
    try {
      console.log("Testing database connection...");
      const connected = await testConnection();

      if (!connected) {
        throw new Error("Could not establish database connection");
      }

      console.log("Running database migrations...");
      await this.migrationManager.runMigrations([initialMigration]);

      console.log("Database initialization completed successfully");
    } catch (error) {
      console.error("Database initialization failed:", error);
      throw error;
    }
  }

  async resetDatabase(): Promise<void> {
    try {
      console.log("Resetting database...");

      // Drop all tables in reverse order
      await pool.query(`
        DROP TABLE IF EXISTS clicks CASCADE;
        DROP TABLE IF EXISTS payments CASCADE;
        DROP TABLE IF EXISTS urls CASCADE;
        DROP TABLE IF EXISTS schema_migrations CASCADE;
        DROP EXTENSION IF EXISTS "uuid-ossp";
      `);

      console.log("Database reset completed");

      // Reinitialize
      await this.initializeDatabase();
    } catch (error) {
      console.error("Database reset failed:", error);
      throw error;
    }
  }

  async checkDatabaseHealth(): Promise<boolean> {
    try {
      // Check if all required tables exist
      const result = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('urls', 'payments', 'clicks', 'schema_migrations')
      `);

      const expectedTables = [
        "urls",
        "payments",
        "clicks",
        "schema_migrations",
      ];
      const existingTables = result.rows.map((row) => row.table_name);

      const allTablesExist = expectedTables.every((table) =>
        existingTables.includes(table),
      );

      if (allTablesExist) {
        console.log("Database health check passed");
        return true;
      } else {
        console.log("Database health check failed - missing tables");
        return false;
      }
    } catch (error) {
      console.error("Database health check failed:", error);
      return false;
    }
  }
}

// Export singleton instance
export const dbInitializer = new DatabaseInitializer();
