import express from "express";
import multer from "multer";
import { readFileSync, unlinkSync, mkdirSync } from "fs";
import { join } from "path";
import { ingestCSV } from "../../../packages/core/src/ingest.js";

const router = express.Router();

// Ensure tmp directory exists
const tmpDir = join(process.cwd(), "tmp");
try {
  mkdirSync(tmpDir, { recursive: true });
} catch (err) {
  // Directory might already exist
}

// Configure multer for file uploads
const upload = multer({
  dest: tmpDir,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check if file is CSV
    if (file.mimetype === "text/csv" || file.originalname.toLowerCase().endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  },
});

/**
 * POST /api/ingest - Upload and process CSV file
 */
router.post("/", upload.single("csv"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const tempFilePath = req.file.path;
  const sourceFilename = req.file.originalname || "uploaded.csv";
  const runLabel = `Weekly Snapshot — Uploaded CSV`;

  try {
    // Process the uploaded CSV using existing ingestion pipeline
    const result = ingestCSV(tempFilePath, {
      runLabel,
      sourceType: "upload",
      sourceFilename,
    });

    // Clean up temp file
    try {
      unlinkSync(tempFilePath);
    } catch (err) {
      console.warn("Failed to delete temp file:", err);
    }

    // Return runId for UI to auto-select
    res.json({
      runId: result.signals.runId,
      totalRows: result.totalRows,
      validRows: result.validRows,
      invalidRows: result.invalidRows,
    });
  } catch (error) {
    // Clean up temp file on error
    try {
      unlinkSync(tempFilePath);
    } catch (err) {
      console.warn("Failed to delete temp file:", err);
    }

    console.error("Ingestion error:", error);
    res.status(400).json({
      error: error instanceof Error ? error.message : "Failed to process CSV file",
    });
  }
});

export function createIngestRoutes(): express.Router {
  return router;
}
