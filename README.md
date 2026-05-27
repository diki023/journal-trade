# Micin Trade Journal

Sistem web untuk journal dan backtest trading koin micin/meme coin. Data disimpan lewat libSQL/Turso agar cocok untuk deploy di Vercel, dengan fallback database lokal untuk development.

## Stack

- HTML
- CSS
- JavaScript
- Bootstrap 5
- Chart.js
- Node.js
- Express
- libSQL / Turso

## Struktur Project

```text
.
|-- index.html
|-- server.js
|-- package.json
|-- package-lock.json
|-- css/
|   `-- styles.css
|-- js/
|   `-- app.js
|-- data/
|   `-- trades.sqlite
`-- README.md
```

Folder `data/` dan file `trades.sqlite` hanya dipakai untuk development lokal saat `TURSO_DATABASE_URL` belum diisi.

## Menjalankan Sistem

Install dependency sekali:

```bash
npm install
```

Jalankan server:

```bash
npm run dev
```

Buka di browser:

```text
http://localhost:3000
```

Jangan buka `index.html` langsung lewat file explorer, karena frontend perlu memanggil API Express.

## Fitur

- Dashboard ringkas
- Chart win/lose/rug
- Chart profit per trade
- Input trade
- Profit dan result otomatis dari entry price dan exit price
- History tanpa pindah halaman
- Filter History berdasarkan semua bulan atau bulan tertentu
- Sort History dari terbaru atau terlama
- Pagination History
- Tampilan History responsif untuk desktop dan handphone
- Edit trade dari History
- Hapus trade dari History
- Format MC/liquidity/volume ringkas seperti `100k`, `1m`, `2.5b`
- Modal tampil sebagai dollar
- Database libSQL/Turso

## Struktur Database

Tabel `trades`:

```text
id, created_at, date, token, chain, narrative, entryMc, liquidity,
volume, entryPrice, exitPrice, modal, profitPercent, result,
holdTime, entryReason, exitReason, notes
```

## Backup

Untuk development lokal, backup data dengan menyalin file:

```text
data/trades.sqlite
```

Untuk production di Turso, backup dan data management dilakukan dari dashboard/CLI Turso.

## Deploy ke Vercel

Di Vercel, gunakan preset `Express` dan root directory `./`.

Buat database di Turso, lalu isi environment variables di Vercel:

```text
TURSO_DATABASE_URL=libsql://DATABASE-NAME-ORG.turso.io
TURSO_AUTH_TOKEN=TOKEN_DARI_TURSO
```

Build/start command bisa mengikuti default Vercel untuk Express. Untuk lokal:

```bash
npm start
```

Tabel `trades` akan dibuat otomatis saat server pertama kali berjalan.
