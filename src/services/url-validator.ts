import { URL } from "url";

/**
 * Service for validating URLs with security and format checks
 */
export class UrlValidator {
  private static readonly MAX_URL_LENGTH = 2048;
  private static readonly ALLOWED_PROTOCOLS = ["http:", "https:"];

  // Private IP ranges and localhost patterns
  private static readonly BLOCKED_PATTERNS = [
    /^127\./, // 127.0.0.0/8 - localhost
    /^10\./, // 10.0.0.0/8 - private
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12 - private
    /^192\.168\./, // 192.168.0.0/16 - private
    /^169\.254\./, // 169.254.0.0/16 - link-local
    /^0\./, // 0.0.0.0/8 - invalid
    /^224\./, // 224.0.0.0/4 - multicast
    /^240\./, // 240.0.0.0/4 - reserved
  ];

  private static readonly BLOCKED_HOSTNAMES = [
    "localhost",
    "0.0.0.0",
    "::1",
    "::",
  ];

  // Common URL shortener domains to prevent chaining
  private static readonly SHORTENER_DOMAINS = [
    "bit.ly",
    "tinyurl.com",
    "short.link",
    "ow.ly",
    "t.co",
    "goo.gl",
    "is.gd",
    "buff.ly",
    "adf.ly",
  ];

  /**
   * Validates a URL for format, security, and policy compliance
   * @param urlString The URL string to validate
   * @returns Validation result with success status and error message if invalid
   */
  public static validateUrl(urlString: string): ValidationResult {
    // Check URL length
    if (urlString.length > this.MAX_URL_LENGTH) {
      return {
        isValid: false,
        error: `URL exceeds maximum length of ${this.MAX_URL_LENGTH} characters`,
        code: "URL_TOO_LONG",
      };
    }

    // Check for empty or whitespace-only URLs
    if (!urlString || urlString.trim().length === 0) {
      return {
        isValid: false,
        error: "URL cannot be empty",
        code: "URL_EMPTY",
      };
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(urlString.trim());
    } catch (error) {
      return {
        isValid: false,
        error: "Invalid URL format",
        code: "INVALID_FORMAT",
      };
    }

    // Check protocol
    if (!this.ALLOWED_PROTOCOLS.includes(parsedUrl.protocol)) {
      return {
        isValid: false,
        error: `Protocol ${parsedUrl.protocol} not allowed. Only HTTP and HTTPS are supported`,
        code: "INVALID_PROTOCOL",
      };
    }

    // Check for blocked hostnames
    const hostname = parsedUrl.hostname.toLowerCase();
    if (this.BLOCKED_HOSTNAMES.includes(hostname)) {
      return {
        isValid: false,
        error: "Cannot shorten localhost or invalid addresses",
        code: "BLOCKED_HOSTNAME",
      };
    }

    // Check for private IP addresses
    if (this.isPrivateOrLocalIP(hostname)) {
      return {
        isValid: false,
        error: "Cannot shorten private or local IP addresses",
        code: "PRIVATE_IP",
      };
    }

    // Check for URL shortener domains (prevent chaining)
    if (this.isShortenerDomain(hostname)) {
      return {
        isValid: false,
        error: "Cannot shorten URLs from other URL shortening services",
        code: "SHORTENER_CHAIN",
      };
    }

    // Additional security checks
    const securityCheck = this.performSecurityChecks(parsedUrl);
    if (!securityCheck.isValid) {
      return securityCheck;
    }

    return {
      isValid: true,
      normalizedUrl: parsedUrl.toString(),
    };
  }

  /**
   * Checks if a hostname is a private or local IP address
   * @param hostname The hostname to check
   * @returns true if it's a private/local IP
   */
  private static isPrivateOrLocalIP(hostname: string): boolean {
    // Check IPv4 patterns
    for (const pattern of this.BLOCKED_PATTERNS) {
      if (pattern.test(hostname)) {
        return true;
      }
    }

    // Check IPv6 localhost and private ranges
    if (
      hostname.startsWith("::1") ||
      hostname.startsWith("fe80:") ||
      hostname.startsWith("fc00:") ||
      hostname.startsWith("fd00:")
    ) {
      return true;
    }

    return false;
  }

  /**
   * Checks if a hostname belongs to a known URL shortener
   * @param hostname The hostname to check
   * @returns true if it's a known shortener domain
   */
  private static isShortenerDomain(hostname: string): boolean {
    return this.SHORTENER_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith("." + domain),
    );
  }

  /**
   * Performs additional security checks on the URL
   * @param url The parsed URL object
   * @returns Validation result
   */
  private static performSecurityChecks(url: URL): ValidationResult {
    // Check for suspicious patterns in the URL
    const fullUrl = url.toString();

    // Check for data URLs or javascript URLs
    if (url.protocol === "data:" || url.protocol === "javascript:") {
      return {
        isValid: false,
        error: "Data and JavaScript URLs are not allowed",
        code: "UNSAFE_PROTOCOL",
      };
    }

    // Check for excessively long paths that might indicate malicious intent
    if (url.pathname.length > 1000) {
      return {
        isValid: false,
        error: "URL path is too long",
        code: "PATH_TOO_LONG",
      };
    }

    // Check for suspicious query parameters
    if (url.search.length > 1000) {
      return {
        isValid: false,
        error: "URL query parameters are too long",
        code: "QUERY_TOO_LONG",
      };
    }

    return { isValid: true };
  }

  /**
   * Normalizes a URL by removing unnecessary components
   * @param urlString The URL to normalize
   * @returns Normalized URL string or null if invalid
   */
  public static normalizeUrl(urlString: string): string | null {
    const validation = this.validateUrl(urlString);
    return validation.isValid ? validation.normalizedUrl || urlString : null;
  }

  /**
   * Checks if a URL is safe to redirect to
   * @param urlString The URL to check
   * @returns true if safe for redirection
   */
  public static isSafeForRedirect(urlString: string): boolean {
    return this.validateUrl(urlString).isValid;
  }
}

/**
 * Result of URL validation
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  code?: string;
  normalizedUrl?: string;
}
