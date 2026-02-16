import express from "express";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createRunRoutes } from "./routes/runRoutes.js";
import { createIngestRoutes } from "./routes/ingestRoutes.js";
import { createDemoRoutes } from "./routes/demoRoutes.js";
import { createCleanupRoutes } from "./routes/cleanupRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === "production";

app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// API-prefixed routes (primary)
const runRoutes = createRunRoutes();
app.use("/api/runs", runRoutes);

// Ingest route
const ingestRoutes = createIngestRoutes();
app.use("/api/ingest", ingestRoutes);

// Demo run route
const demoRoutes = createDemoRoutes();
app.use("/api/demo-run", demoRoutes);

// Cleanup route
const cleanupRoutes = createCleanupRoutes();
app.use("/api/runs/cleanup", cleanupRoutes);

// Backwards-compatible routes (non-prefixed)
app.use("/runs", runRoutes);

// Serve static files in production
if (isProduction) {
  // From apps/api/dist, go up to root, then into apps/web/dist
  const webDistPath = join(__dirname, "..", "..", "web", "dist");
  app.use(express.static(webDistPath));
  
  // SPA fallback: serve index.html for all non-API routes
  app.get("*", (req, res) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith("/api")) {
      return res.status(404).json({ error: "Not found" });
    }
    res.sendFile(join(webDistPath, "index.html"));
  });
}

app.listen(PORT, () => {
  if (isProduction) {
    console.log(`🚀 Production server running on http://localhost:${PORT}`);
    console.log(`📦 Serving static files from apps/web/dist`);
  } else {
    console.log(`🚀 API server running on http://localhost:${PORT}`);
  }
});
