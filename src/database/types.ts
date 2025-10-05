// Database type definitions

export interface DatabaseUrl {
  id: string;
  short_code: string;
  original_url: string;
  created_at: Date;
  expires_at?: Date;
  click_count: number;
  is_active: boolean;
  payment_tx_hash?: string;
  creator_address?: string;
}

export interface DatabasePayment {
  id: string;
  url_id: string;
  transaction_hash?: string;
  amount: string; // Decimal as string to avoid precision issues
  currency: string;
  payer_address?: string;
  status: "pending" | "confirmed" | "failed";
  created_at: Date;
  confirmed_at?: Date;
}

export interface DatabaseClick {
  id: string;
  url_id: string;
  ip_address?: string;
  user_agent?: string;
  referer?: string;
  payment_required: boolean;
  payment_id?: string;
  accessed_at: Date;
}

// Error types for database operations
export class DatabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public originalError?: Error,
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

export class ConnectionError extends DatabaseError {
  constructor(message: string, originalError?: Error) {
    super(message, "CONNECTION_ERROR", originalError);
    this.name = "ConnectionError";
  }
}

export class QueryError extends DatabaseError {
  constructor(message: string, originalError?: Error) {
    super(message, "QUERY_ERROR", originalError);
    this.name = "QueryError";
  }
}

export class UniqueConstraintError extends DatabaseError {
  constructor(
    message: string,
    public field: string,
  ) {
    super(message, "UNIQUE_CONSTRAINT", undefined);
    this.name = "UniqueConstraintError";
  }
}
