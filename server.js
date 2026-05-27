import express from "express";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 3000);
const dataDir = path.join(__dirname, "data");
const dbPath = path.join(dataDir, "trades.sqlite");

fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
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

const createTradeStatement = db.prepare(`
  INSERT INTO trades (
    date, token, chain, narrative, entryMc, liquidity, volume,
    entryPrice, exitPrice, modal, profitPercent, result, holdTime,
    entryReason, exitReason, notes
  ) VALUES (
    @date, @token, @chain, @narrative, @entryMc, @liquidity, @volume,
    @entryPrice, @exitPrice, @modal, @profitPercent, @result, @holdTime,
    @entryReason, @exitReason, @notes
  )
`);

const updateTradeStatement = db.prepare(`
  UPDATE trades SET
    date = @date,
    token = @token,
    chain = @chain,
    narrative = @narrative,
    entryMc = @entryMc,
    liquidity = @liquidity,
    volume = @volume,
    entryPrice = @entryPrice,
    exitPrice = @exitPrice,
    modal = @modal,
    profitPercent = @profitPercent,
    result = @result,
    holdTime = @holdTime,
    entryReason = @entryReason,
    exitReason = @exitReason,
    notes = @notes
  WHERE id = @id
`);

app.use(express.json());
app.use(express.static(__dirname));

app.get("/api/trades", (req, res) => {
  const trades = db.prepare("SELECT * FROM trades ORDER BY date ASC, id ASC").all();
  res.json({ success: true, data: trades });
});

app.post("/api/trades", (req, res) => {
  const data = normalizePayload(req.body);

  if (req.body.id) {
    updateTradeStatement.run({ ...data, id: Number(req.body.id) });
    res.json({ success: true, message: "Trade updated" });
    return;
  }

  createTradeStatement.run(data);
  res.json({ success: true, message: "Trade saved" });
});

app.delete("/api/trades/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ success: false, message: "ID trade tidak valid." });
    return;
  }

  db.prepare("DELETE FROM trades WHERE id = ?").run(id);
  res.json({ success: true, message: "Trade deleted" });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: err.message || "Server error" });
});

app.listen(port, () => {
  console.log(`Micin Trade Journal running at http://127.0.0.1:${port}`);
});

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
