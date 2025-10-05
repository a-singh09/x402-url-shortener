import {
  executeQuery,
  executeTransaction,
  DatabaseUrl,
  DatabaseError,
  UniqueConstraintError,
} from "../database";
import { PoolClient } from "pg";

export interface CreateUrlData {
  shortCode: string;
  originalUrl: string;
  paymentTxHash?: string;
  creatorAddress?: string;
  expiresAt?: Date;
}

export interface UpdateUrlData {
  originalUrl?: string;
  isActive?: boolean;
  expiresAt?: Date;
}

export interface UrlStats {
  id: string;
  shortCode: string;
  originalUrl: string;
  createdAt: Date;
  clickCount: number;
  isActive: boolean;
  paymentTxHash?: string;
  creatorAddress?: string;
}

export class UrlStorageService {
  /**
   * Store a new URL mapping with payment information
   */
  async storeUrl(data: CreateUrlData): Promise<DatabaseUrl> {
    try {
      const result = await executeQuery<DatabaseUrl>(
        `INSERT INTO urls (short_code, original_url, payment_tx_hash, creator_address, expires_at)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          data.shortCode,
          data.originalUrl,
          data.paymentTxHash,
          data.creatorAddress,
          data.expiresAt,
        ],
      );

      if (result.length === 0) {
        throw new DatabaseError("Failed to create URL record");
      }

      return result[0];
    } catch (error: any) {
      if (
        error.code === "23505" &&
        error.constraint === "urls_short_code_key"
      ) {
        throw new UniqueConstraintError(
          `Short code '${data.shortCode}' already exists`,
          "short_code",
        );
      }
      throw new DatabaseError(
        `Failed to store URL: ${error.message}`,
        undefined,
        error,
      );
    }
  }

  /**
   * Retrieve URL by short code
   */
  async getUrl(shortCode: string): Promise<DatabaseUrl | null> {
    try {
      const result = await executeQuery<DatabaseUrl>(
        `SELECT * FROM urls WHERE short_code = $1 AND is_active = true`,
        [shortCode],
      );

      return result.length > 0 ? result[0] : null;
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to retrieve URL: ${error.message}`,
        undefined,
        error,
      );
    }
  }

  /**
   * Retrieve URL by ID
   */
  async getUrlById(id: string): Promise<DatabaseUrl | null> {
    try {
      const result = await executeQuery<DatabaseUrl>(
        `SELECT * FROM urls WHERE id = $1`,
        [id],
      );

      return result.length > 0 ? result[0] : null;
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to retrieve URL by ID: ${error.message}`,
        undefined,
        error,
      );
    }
  }

  /**
   * Update URL information
   */
  async updateUrl(
    shortCode: string,
    data: UpdateUrlData,
  ): Promise<DatabaseUrl | null> {
    try {
      const setParts: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (data.originalUrl !== undefined) {
        setParts.push(`original_url = $${paramIndex++}`);
        values.push(data.originalUrl);
      }

      if (data.isActive !== undefined) {
        setParts.push(`is_active = $${paramIndex++}`);
        values.push(data.isActive);
      }

      if (data.expiresAt !== undefined) {
        setParts.push(`expires_at = $${paramIndex++}`);
        values.push(data.expiresAt);
      }

      if (setParts.length === 0) {
        throw new DatabaseError("No fields to update");
      }

      values.push(shortCode);

      const result = await executeQuery<DatabaseUrl>(
        `UPDATE urls SET ${setParts.join(", ")} 
         WHERE short_code = $${paramIndex} 
         RETURNING *`,
        values,
      );

      return result.length > 0 ? result[0] : null;
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to update URL: ${error.message}`,
        undefined,
        error,
      );
    }
  }

  /**
   * Increment access count for a URL (with transaction support)
   */
  async incrementAccessCount(shortCode: string): Promise<number> {
    try {
      return await executeTransaction(async (client: PoolClient) => {
        // Increment click count
        const result = await client.query(
          `UPDATE urls SET click_count = click_count + 1 
           WHERE short_code = $1 AND is_active = true 
           RETURNING click_count`,
          [shortCode],
        );

        if (result.rows.length === 0) {
          throw new DatabaseError(
            `URL with short code '${shortCode}' not found or inactive`,
          );
        }

        return result.rows[0].click_count;
      });
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to increment access count: ${error.message}`,
        undefined,
        error,
      );
    }
  }

  /**
   * Get URL statistics
   */
  async getUrlStats(shortCode: string): Promise<UrlStats | null> {
    try {
      const result = await executeQuery<UrlStats>(
        `SELECT id, short_code, original_url, created_at, click_count, 
                is_active, payment_tx_hash, creator_address
         FROM urls 
         WHERE short_code = $1`,
        [shortCode],
      );

      return result.length > 0 ? result[0] : null;
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to get URL stats: ${error.message}`,
        undefined,
        error,
      );
    }
  }

  /**
   * Get URLs by creator address
   */
  async getUrlsByCreator(
    creatorAddress: string,
    limit: number = 50,
  ): Promise<DatabaseUrl[]> {
    try {
      const result = await executeQuery<DatabaseUrl>(
        `SELECT * FROM urls 
         WHERE creator_address = $1 
         ORDER BY created_at DESC 
         LIMIT $2`,
        [creatorAddress, limit],
      );

      return result;
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to get URLs by creator: ${error.message}`,
        undefined,
        error,
      );
    }
  }

  /**
   * Delete URL (soft delete by setting inactive)
   */
  async deleteUrl(shortCode: string): Promise<boolean> {
    try {
      const result = await executeQuery(
        `UPDATE urls SET is_active = false WHERE short_code = $1 RETURNING id`,
        [shortCode],
      );

      return result.length > 0;
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to delete URL: ${error.message}`,
        undefined,
        error,
      );
    }
  }

  /**
   * Check if short code exists
   */
  async shortCodeExists(shortCode: string): Promise<boolean> {
    try {
      const result = await executeQuery(
        `SELECT 1 FROM urls WHERE short_code = $1 LIMIT 1`,
        [shortCode],
      );

      return result.length > 0;
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to check short code existence: ${error.message}`,
        undefined,
        error,
      );
    }
  }

  /**
   * Get expired URLs for cleanup
   */
  async getExpiredUrls(): Promise<DatabaseUrl[]> {
    try {
      const result = await executeQuery<DatabaseUrl>(
        `SELECT * FROM urls 
         WHERE expires_at IS NOT NULL 
         AND expires_at < CURRENT_TIMESTAMP 
         AND is_active = true`,
        [],
      );

      return result;
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to get expired URLs: ${error.message}`,
        undefined,
        error,
      );
    }
  }

  /**
   * Cleanup expired URLs
   */
  async cleanupExpiredUrls(): Promise<number> {
    try {
      const result = await executeQuery(
        `UPDATE urls SET is_active = false 
         WHERE expires_at IS NOT NULL 
         AND expires_at < CURRENT_TIMESTAMP 
         AND is_active = true 
         RETURNING id`,
        [],
      );

      return result.length;
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to cleanup expired URLs: ${error.message}`,
        undefined,
        error,
      );
    }
  }
}
