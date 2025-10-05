import crypto from "crypto";

/**
 * Service for generating cryptographically secure short URL codes
 */
export class ShortUrlGenerator {
  private static readonly BASE62_CHARS =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  private static readonly CODE_LENGTH = 8;
  private static readonly MAX_RETRIES = 10;

  /**
   * Generates a cryptographically secure short URL code
   * @param existingCodes Set of existing codes to check for collisions
   * @returns A unique 8-character Base62 encoded string
   * @throws Error if unable to generate unique code after max retries
   */
  public static generateShortCode(existingCodes?: Set<string>): string {
    let attempts = 0;

    while (attempts < this.MAX_RETRIES) {
      const code = this.generateRandomCode();

      // Check for collision if existing codes provided
      if (!existingCodes || !existingCodes.has(code)) {
        return code;
      }

      attempts++;
    }

    throw new Error(
      `Failed to generate unique short code after ${this.MAX_RETRIES} attempts`,
    );
  }

  /**
   * Generates a single random Base62 encoded string
   * @returns 8-character Base62 string
   */
  private static generateRandomCode(): string {
    const bytes = crypto.randomBytes(this.CODE_LENGTH);
    let result = "";

    for (let i = 0; i < this.CODE_LENGTH; i++) {
      result += this.BASE62_CHARS[bytes[i] % this.BASE62_CHARS.length];
    }

    return result;
  }

  /**
   * Validates that a short code meets format requirements
   * @param code The code to validate
   * @returns true if valid, false otherwise
   */
  public static isValidShortCode(code: string): boolean {
    if (code.length !== this.CODE_LENGTH) {
      return false;
    }

    // Check that all characters are valid Base62 characters
    for (const char of code) {
      if (!this.BASE62_CHARS.includes(char)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Gets the character set used for encoding
   * @returns The Base62 character set
   */
  public static getCharacterSet(): string {
    return this.BASE62_CHARS;
  }

  /**
   * Gets the length of generated codes
   * @returns The code length
   */
  public static getCodeLength(): number {
    return this.CODE_LENGTH;
  }
}
