import { Router } from "express";
import { handleShortenUrl } from "./shorten";
import { handleRedirect, handleRedirectStats } from "./redirect";
import { asyncHandler } from "../middleware/error-handler";

const router = Router();

// URL shortening endpoint (POST /api/shorten)
router.post("/api/shorten", asyncHandler(handleShortenUrl));

// URL redirection endpoint (GET /:shortCode)
router.get("/:shortCode", asyncHandler(handleRedirect));

// URL statistics endpoint (GET /stats/:shortCode)
router.get("/stats/:shortCode", asyncHandler(handleRedirectStats));

// Health check endpoint
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "url-shortener-x402",
  });
});

export default router;
