import { Request, Response } from "express";
import { UrlStorageService } from "../services/url-storage";
import { ClickTrackingService } from "../services/click-tracking";

export async function handleRedirect(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const shortCode = req.params.shortCode;

    // Validate short code format
    if (!shortCode || shortCode.length !== 8) {
      res.status(404).json({
        success: false,
        error: "Short URL not found",
        code: "NOT_FOUND",
      });
      return;
    }

    // Retrieve URL from storage
    const urlStorage = new UrlStorageService();
    const urlRecord = await urlStorage.getUrl(shortCode);

    if (!urlRecord) {
      res.status(404).json({
        success: false,
        error: "Short URL not found",
        code: "NOT_FOUND",
      });
      return;
    }

    // Track the click/access
    const clickTracking = new ClickTrackingService();
    await clickTracking.recordClick({
      urlId: urlRecord.id,
      userAgent: req.headers["user-agent"] || "",
      referer: req.headers.referer || "",
      ipAddress: req.ip || req.connection.remoteAddress || "",
    });

    // Increment access count in storage
    await urlStorage.incrementAccessCount(shortCode);

    // Perform 301 redirect to original URL
    res.redirect(301, urlRecord.original_url);
  } catch (error) {
    console.error("Error in URL redirection:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
}

export async function handleRedirectStats(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const shortCode = req.params.shortCode;

    // Validate short code format
    if (!shortCode || shortCode.length !== 8) {
      res.status(404).json({
        success: false,
        error: "Short URL not found",
        code: "NOT_FOUND",
      });
      return;
    }

    // Get URL statistics
    const urlStorage = new UrlStorageService();
    const urlRecord = await urlStorage.getUrl(shortCode);

    if (!urlRecord) {
      res.status(404).json({
        success: false,
        error: "Short URL not found",
        code: "NOT_FOUND",
      });
      return;
    }

    // Get detailed click statistics
    const clickTracking = new ClickTrackingService();
    const clickStats = await clickTracking.getClickStats(urlRecord.id);

    res.status(200).json({
      success: true,
      shortCode,
      originalUrl: urlRecord.original_url,
      createdAt: urlRecord.created_at,
      accessCount: urlRecord.click_count,
      paymentTxHash: urlRecord.payment_tx_hash,
      creatorAddress: urlRecord.creator_address,
      clickStats,
    });
  } catch (error) {
    console.error("Error retrieving URL stats:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
}
