import express from "express";
import { createClient } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 3000);
const dataDir = path.join(__dirname, "data");
const dbPath = path.join(dataDir, "trades.sqlite");
const databaseUrl = process.env.TURSO_DATABASE_URL || `file:${dbPath}`;
const databaseAuthToken = process.env.TURSO_AUTH_TOKEN;

if (!process.env.TURSO_DATABASE_URL) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = createClient({
  url: databaseUrl,
  authToken: databaseAuthToken,
});

await db.execute(`
  CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date TEXT NOT NULL,
    token TEXT NOT NULL,
    chain TEXT NOT NULL,
    narrative TEXT NOT NULL,
    entryMc REAL,
    liquidity REAL,
    volume REAL,
    entryPrice REAL NOT NULL,
    exitPrice REAL NOT NULL,
    modal REAL NOT NULL,
    profitPercent REAL NOT NULL,
    result TEXT NOT NULL,
    holdTime TEXT,
    entryReason TEXT,
    exitReason TEXT,
    notes TEXT
  )
`);

app.use(express.json());
app.use(express.static(__dirname));

app.get("/api/trades", async (req, res, next) => {
  try {
    const result = await db.execute("SELECT * FROM trades ORDER BY date ASC, id ASC");
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

app.post("/api/trades", async (req, res, next) => {
  try {
    const data = normalizePayload(req.body);

    if (req.body.id) {
      await updateTrade(Number(req.body.id), data);
      res.json({ success: true, message: "Trade updated" });
      return;
    }

    await createTrade(data);
    res.json({ success: true, message: "Trade saved" });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/trades/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ success: false, message: "ID trade tidak valid." });
      return;
    }

    await db.execute({
      sql: "DELETE FROM trades WHERE id = ?",
      args: [id],
    });
    res.json({ success: true, message: "Trade deleted" });
  } catch (error) {
    next(error);
  }
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: err.message || "Server error" });
});

app.listen(port, () => {
  console.log(`Micin Trade Journal running at http://127.0.0.1:${port}`);
  console.log(process.env.TURSO_DATABASE_URL ? "Database: Turso/libSQL remote" : "Database: local libSQL file");
});

async function createTrade(data) {
  await db.execute({
    sql: `
      INSERT INTO trades (
        date, token, chain, narrative, entryMc, liquidity, volume,
        entryPrice, exitPrice, modal, profitPercent, result, holdTime,
        entryReason, exitReason, notes
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?
      )
    `,
    args: payloadArgs(data),
  });
}

async function updateTrade(id, data) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("ID trade tidak valid.");
  }

  await db.execute({
    sql: `
      UPDATE trades SET
        date = ?,
        token = ?,
        chain = ?,
        narrative = ?,
        entryMc = ?,
        liquidity = ?,
        volume = ?,
        entryPrice = ?,
        exitPrice = ?,
        modal = ?,
        profitPercent = ?,
        result = ?,
        holdTime = ?,
        entryReason = ?,
        exitReason = ?,
        notes = ?
      WHERE id = ?
    `,
    args: [...payloadArgs(data), id],
  });
}

function payloadArgs(data) {
  return [
    data.date,
    data.token,
    data.chain,
    data.narrative,
    data.entryMc,
    data.liquidity,
    data.volume,
    data.entryPrice,
    data.exitPrice,
    data.modal,
    data.profitPercent,
    data.result,
    data.holdTime,
    data.entryReason,
    data.exitReason,
    data.notes,
  ];
}

function normalizePayload(payload) {
  const required = ["date", "token", "chain", "narrative", "entryPrice", "exitPrice", "modal", "profitPercent", "result"];

  for (const field of required) {
    if (payload[field] === undefined || payload[field] === "") {
      throw new Error(`Field ${field} wajib diisi.`);
    }
  }

  return {
    date: String(payload.date).trim(),
    token: String(payload.token).trim().toUpperCase(),
    chain: String(payload.chain).trim(),
    narrative: String(payload.narrative).trim(),
    entryMc: nullableNumber(payload.entryMc),
    liquidity: nullableNumber(payload.liquidity),
    volume: nullableNumber(payload.volume),
    entryPrice: Number(payload.entryPrice),
    exitPrice: Number(payload.exitPrice),
    modal: Number(payload.modal),
    profitPercent: Number(payload.profitPercent),
    result: String(payload.result).trim(),
    holdTime: String(payload.holdTime || "").trim(),
    entryReason: String(payload.entryReason || "").trim(),
    exitReason: String(payload.exitReason || "").trim(),
    notes: String(payload.notes || "").trim(),
  };
}

function nullableNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return Number(value);
}
