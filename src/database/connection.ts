import { Pool, PoolConfig, PoolClient } from "pg";
import { ConnectionError, QueryError } from "./types";

// Database connection configuration
const config: PoolConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "url_shortener",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
};

// Create a connection pool
export const pool = new Pool(config);

// Handle pool errors
pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
});

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query("SELECT NOW()");
    client.release();
    console.log("Database connection successful");
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}

// Execute query with error handling
export async function executeQuery<T = any>(
  text: string,
  params?: any[],
): Promise<T[]> {
  try {
    const result = await pool.query(text, params);
    return result.rows;
  } catch (error: any) {
    if (error.code === "23505") {
      // Unique constraint violation
      throw new QueryError(
        `Unique constraint violation: ${error.detail}`,
        error,
      );
    }
    throw new QueryError(`Query execution failed: ${error.message}`, error);
  }
}

// Execute query with transaction support
export async function executeTransaction<T>(
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error: any) {
    await client.query("ROLLBACK");
    throw new QueryError(`Transaction failed: ${error.message}`, error);
  } finally {
    client.release();
  }
}

// Get a client from the pool
export async function getClient(): Promise<PoolClient> {
  try {
    return await pool.connect();
  } catch (error: any) {
    throw new ConnectionError(
      `Failed to get database client: ${error.message}`,
      error,
    );
  }
}

// Graceful shutdown
export async function closeConnection(): Promise<void> {
  try {
    await pool.end();
    console.log("Database connection pool closed");
  } catch (error: any) {
    console.error("Error closing database connection:", error);
    throw new ConnectionError(
      `Failed to close connection: ${error.message}`,
      error,
    );
  }
}
