import { Request, Response } from "express";
import { UrlValidator } from "../services/url-validator";
import { ShortUrlGenerator } from "../services/short-url-generator";
import { UrlStorageService } from "../services/url-storage";

interface ShortenResponse {
  success: boolean;
  shortUrl: string;
  originalUrl: string;
  shortCode: string;
  paymentTxHash: string;
}

export async function handleShortenUrl(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { url } = req.body;

    // Validate input URL
    if (!url) {
      res.status(400).json({
        success: false,
        error: "URL is required",
        code: "MISSING_URL",
      });
      return;
    }

    // Validate URL format and security
    const validationResult = UrlValidator.validateUrl(url);

    if (!validationResult.isValid) {
      res.status(400).json({
        success: false,
        error: validationResult.error,
        code: "INVALID_URL",
      });
      return;
    }

    // If we reach here, payment has been verified by x402 middleware
    // Generate unique short code
    const urlStorage = new UrlStorageService();
    let shortCode: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      shortCode = ShortUrlGenerator.generateShortCode();
      attempts++;
    } while (
      (await urlStorage.shortCodeExists(shortCode)) &&
      attempts < maxAttempts
    );

    if (attempts >= maxAttempts) {
      throw new Error("Failed to generate unique short code");
    }

    // Store URL mapping in database
    await urlStorage.storeUrl({
      shortCode,
      originalUrl: validationResult.normalizedUrl || url,
      paymentTxHash: req.paymentData?.txHash,
      creatorAddress: req.paymentData?.creatorAddress,
    });

    // Construct full short URL
    const baseUrl =
      process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const shortUrl = `${baseUrl}/${shortCode}`;

    // Return success response
    const response: ShortenResponse = {
      success: true,
      shortUrl,
      originalUrl: validationResult.normalizedUrl || url,
      shortCode,
      paymentTxHash: req.paymentData?.txHash || "",
    };

    // Set payment confirmation in response header
    res.setHeader(
      "X-PAYMENT-RESPONSE",
      JSON.stringify({
        txHash: req.paymentData?.txHash || "",
        amount: req.paymentData?.amount || "",
        creatorAddress: req.paymentData?.creatorAddress || "",
      }),
    );

    res.status(200).json(response);
  } catch (error) {
    console.error("Error in URL shortening:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
}
