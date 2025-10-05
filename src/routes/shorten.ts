import { Request, Response } from "express";
import { UrlValidator } from "../services/url-validator";
import { ShortUrlGenerator } from "../services/short-url-generator";
import { UrlStorageService } from "../services/url-storage";
import { PaymentHandler } from "../services/payment-handler";

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

    // Extract payment data from x402 middleware
    // The x402 middleware should have already verified the payment
    const paymentHeader = req.headers["x-payment"];
    if (!paymentHeader) {
      res.status(402).json({
        success: false,
        error: "Payment required",
        code: "PAYMENT_REQUIRED",
      });
      return;
    }

    // Parse payment data - x402 middleware should have already processed this
    // For now, we'll extract basic payment info from the header
    let paymentData;
    try {
      const headerValue = Array.isArray(paymentHeader)
        ? paymentHeader[0]
        : paymentHeader;
      paymentData = JSON.parse(Buffer.from(headerValue, "base64").toString());
    } catch (error) {
      paymentData = null;
    }

    if (!paymentData) {
      res.status(402).json({
        success: false,
        error: "Invalid payment data",
        code: "INVALID_PAYMENT",
      });
      return;
    }

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
      paymentTxHash: paymentData?.txHash,
      creatorAddress: paymentData?.creatorAddress,
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
      paymentTxHash: paymentData?.txHash || "",
    };

    // Set payment confirmation in response header
    res.setHeader(
      "X-PAYMENT-RESPONSE",
      JSON.stringify({
        txHash: paymentData?.txHash || "",
        amount: paymentData?.amount || "",
        creatorAddress: paymentData?.creatorAddress || "",
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
