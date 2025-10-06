import { dbInitializer } from "./database/init";
import { getEnvironmentConfig, getDatabaseConfig } from "./config/environment";
import { app } from "./index";

/**
 * Application startup handler with database initialization and graceful shutdown
 */
export class ApplicationStartup {
  private server: any = null;
  private isShuttingDown = false;

  /**
   * Initialize the application with database setup
   */
  async initialize(): Promise<void> {
    try {
      console.log("🚀 Starting URL Shortener with x402 Payment Integration...");

      // Validate environment configuration
      console.log("📋 Validating environment configuration...");
      const config = getEnvironmentConfig();
      console.log(`✅ Environment: ${config.nodeEnv}`);
      console.log(`✅ Network: ${config.x402Network}`);
      console.log(
        `✅ Database: ${config.databaseUrl.replace(/\/\/.*@/, "//***@")}`,
      ); // Hide credentials

      // Initialize database
      console.log("🗄️  Initializing database...");
      await dbInitializer.initializeDatabase();
      console.log("✅ Database initialized successfully");

      // Setup graceful shutdown handlers
      this.setupGracefulShutdown();

      console.log("✅ Application initialization complete");
    } catch (error) {
      console.error("❌ Failed to initialize application:", error);
      process.exit(1);
    }
  }

  /**
   * Start the HTTP server
   */
  async start(): Promise<void> {
    const config = getEnvironmentConfig();

    return new Promise((resolve, reject) => {
      this.server = app.listen(config.port, (error?: Error) => {
        if (error) {
          console.error("❌ Failed to start server:", error);
          reject(error);
          return;
        }

        console.log(`🌐 Server running on port ${config.port}`);
        console.log(`🔗 Health check: http://localhost:${config.port}/health`);
        console.log("💳 x402 payment integration ready");
        console.log("🎯 Ready to accept URL shortening requests");
        resolve();
      });
    });
  }

  /**
   * Setup graceful shutdown handlers for SIGTERM and SIGINT
   */
  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      if (this.isShuttingDown) {
        console.log("⚠️  Force shutdown initiated");
        process.exit(1);
      }

      this.isShuttingDown = true;
      console.log(`\n🛑 Received ${signal}, starting graceful shutdown...`);

      try {
        // Close HTTP server
        if (this.server) {
          console.log("🔌 Closing HTTP server...");
          await new Promise<void>((resolve) => {
            this.server.close(() => {
              console.log("✅ HTTP server closed");
              resolve();
            });
          });
        }

        // Close database connections
        console.log("🗄️  Closing database connections...");
        // Database connection cleanup will be handled by the connection pool

        console.log("✅ Graceful shutdown complete");
        process.exit(0);
      } catch (error) {
        console.error("❌ Error during shutdown:", error);
        process.exit(1);
      }
    };

    // Handle different shutdown signals
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      console.error("❌ Uncaught Exception:", error);
      gracefulShutdown("UNCAUGHT_EXCEPTION");
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
      gracefulShutdown("UNHANDLED_REJECTION");
    });
  }

  /**
   * Health check method for monitoring
   */
  getHealthStatus() {
    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || "development",
      version: process.env.npm_package_version || "1.0.0",
    };
  }
}

/**
 * Main startup function
 */
export async function startApplication(): Promise<ApplicationStartup> {
  const startup = new ApplicationStartup();

  await startup.initialize();
  await startup.start();

  return startup;
}

// Auto-start if this file is run directly
if (require.main === module) {
  startApplication().catch((error) => {
    console.error("❌ Failed to start application:", error);
    process.exit(1);
  });
}
