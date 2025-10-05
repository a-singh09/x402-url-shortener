import {
  executeQuery,
  executeTransaction,
  DatabaseClick,
  DatabaseError,
} from "../database";
import { PoolClient } from "pg";

export interface CreateClickData {
  urlId: string;
  ipAddress?: string;
  userAgent?: string;
  referer?: string;
  paymentRequired?: boolean;
  paymentId?: string;
}

export interface ClickStats {
  totalClicks: number;
  uniqueIps: number;
  recentClicks: DatabaseClick[];
}

export class ClickTrackingService {
  /**
   * Record a click/access attempt
   */
  async recordClick(data: CreateClickData): Promise<DatabaseClick> {
    try {
      const result = await executeQuery<DatabaseClick>(
        `INSERT INTO clicks (url_id, ip_address, user_agent, referer, payment_required, payment_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          data.urlId,
          data.ipAddress,
          data.userAgent,
          data.referer,
          data.paymentRequired || false,
          data.paymentId,
        ],
      );

      if (result.length === 0) {
        throw new DatabaseError("Failed to record click");
      }

      return result[0];
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to record click: ${error.message}`,
        undefined,
        error,
      );
    }
  }

  /**
   * Get click statistics for a URL
   */
  async getClickStats(urlId: string, limit: number = 10): Promise<ClickStats> {
    try {
      return await executeTransaction(async (client: PoolClient) => {
        // Get total clicks
        const totalResult = await client.query(
          `SELECT COUNT(*) as total FROM clicks WHERE url_id = $1`,
          [urlId],
        );

        // Get unique IPs
        const uniqueResult = await client.query(
          `SELECT COUNT(DISTINCT ip_address) as unique_ips 
           FROM clicks 
           WHERE url_id = $1 AND ip_address IS NOT NULL`,
          [urlId],
        );

        // Get recent clicks
        const recentResult = await client.query(
          `SELECT * FROM clicks 
           WHERE url_id = $1 
           ORDER BY accessed_at DESC 
           LIMIT $2`,
          [urlId, limit],
        );

        return {
          totalClicks: parseInt(totalResult.rows[0].total),
          uniqueIps: parseInt(uniqueResult.rows[0].unique_ips),
          recentClicks: recentResult.rows,
        };
      });
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to get click stats: ${error.message}`,
        undefined,
        error,
      );
    }
  }

  /**
   * Get clicks by URL ID with pagination
   */
  async getClicksByUrl(
    urlId: string,
    offset: number = 0,
    limit: number = 50,
  ): Promise<DatabaseClick[]> {
    try {
      const result = await executeQuery<DatabaseClick>(
        `SELECT * FROM clicks 
         WHERE url_id = $1 
         ORDER BY accessed_at DESC 
         OFFSET $2 LIMIT $3`,
        [urlId, offset, limit],
      );

      return result;
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to get clicks by URL: ${error.message}`,
        undefined,
        error,
      );
    }
  }

  /**
   * Get clicks that required payment
   */
  async getPaymentRequiredClicks(urlId: string): Promise<DatabaseClick[]> {
    try {
      const result = await executeQuery<DatabaseClick>(
        `SELECT * FROM clicks 
         WHERE url_id = $1 AND payment_required = true 
         ORDER BY accessed_at DESC`,
        [urlId],
      );

      return result;
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to get payment required clicks: ${error.message}`,
        undefined,
        error,
      );
    }
  }

  /**
   * Delete old click records (for cleanup)
   */
  async deleteOldClicks(daysOld: number = 90): Promise<number> {
    try {
      const result = await executeQuery(
        `DELETE FROM clicks 
         WHERE accessed_at < CURRENT_TIMESTAMP - INTERVAL '${daysOld} days' 
         RETURNING id`,
        [],
      );

      return result.length;
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to delete old clicks: ${error.message}`,
        undefined,
        error,
      );
    }
  }
}
