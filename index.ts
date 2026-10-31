import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { registerAccountRoutes } from "./account-routes";
import { registerBenchRoutes } from "./bench-routes";
import { createDatabaseHealthHandler } from "./database-readiness";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import { CLERK_PROXY_PATH, clerkProxyMiddleware, getClerkProxyHost } from "./middlewares/clerkProxyMiddleware";
import { accountStore } from "./auth/accounts";
import { apiOriginGuard } from "./middlewares/apiOriginGuard";
import { createDevelopmentDatabaseReadiness } from "./development-database-readiness";
import { db } from "./db";
import { deviceCredentialSchema } from "./device-schema";

const app = express();
const httpServer = createServer(app);
app.set("trust proxy", 1);
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use("/api", apiOriginGuard);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: "256kb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));
app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // Response bodies may contain contact data, readings or device credentials.
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

(async () => {
  const developmentReadiness = process.env.NODE_ENV === "development"
    ? createDevelopmentDatabaseReadiness()
    : undefined;
  // Report setup problems without delaying public tools on database availability.
  void developmentReadiness?.inspect();
  const routeDependencies = {
    databaseReady: developmentReadiness?.middleware,
    deviceSchemaReady: false,
  };
  const initializeDeviceSchema = async () => {
    try {
      await db.execute(deviceCredentialSchema);
      routeDependencies.deviceSchemaReady = true;
    } catch (error) {
      const code = (error as { code?: string; cause?: { code?: string } }).code
        ?? (error as { cause?: { code?: string } }).cause?.code;
      if (code !== "55000") throw error;
      console.error("Device ingestion unavailable: apply the account ownership schema with npm run db:push, then restart. Existing data has not been reassigned.");
    }
  };
  if (developmentReadiness) {
    void accountStore.initializeAccountRemovalProtection().catch(() => {
      console.warn("Account access unavailable: removal protection could not be initialized. Verify the development database connection and restart. Public local USB tools remain available.");
    }).then(async () => {
      if (!accountStore.removalProtectionReady) return;
      try {
        await initializeDeviceSchema();
      } catch {
        console.warn("Device ingestion unavailable: verify the development database connection and restart. Public local USB tools remain available.");
      }
    });
  } else {
    await accountStore.initializeAccountRemovalProtection();
    await initializeDeviceSchema();
  }
  registerAccountRoutes(app);
  registerBenchRoutes(app);
  await registerRoutes(httpServer, app, routeDependencies);
  app.get("/api/health", createDatabaseHealthHandler());
  // Unknown API routes must not be mistaken for a successful HTML sign-in page.
  app.use("/api", (_req, res) => res.status(404).json({ message: "API endpoint not found" }));

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const databaseCode = err.code ?? err.cause?.code;
    const setupRequired = databaseCode === "42703" || databaseCode === "42P01";
    const status = setupRequired ? 503 : err.status || err.statusCode || 500;
    const message = setupRequired
      ? "Database setup needs updating. Please contact your account administrator."
      : status >= 500 ? "The request could not be completed. Please try again or contact your account administrator." : err.message || "Request failed";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
