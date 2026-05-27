# Micin Trade Journal

Sistem web lokal untuk journal dan backtest trading koin micin/meme coin. Semua trade tersimpan di SQLite lokal lewat backend Node.js + Express sehingga bisa ditambah, diedit, dan dihapus langsung dari web.

## Stack

- HTML
- CSS
- JavaScript
- Bootstrap 5
- Chart.js
- Node.js
- Express
- SQLite

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

Folder `data/` dan file `trades.sqlite` dibuat otomatis saat server pertama kali dipanggil.

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
- Database lokal SQLite

## Struktur Database

Tabel `trades`:

```text
id, created_at, date, token, chain, narrative, entryMc, liquidity,
volume, entryPrice, exitPrice, modal, profitPercent, result,
holdTime, entryReason, exitReason, notes
```

## Backup

Untuk backup data, salin file:

```text
data/trades.sqlite
```

Untuk reset data, hentikan server lalu hapus file tersebut. Sistem akan membuat database baru saat dijalankan lagi.

## Deploy

Jangan upload `node_modules/` dan file database lokal. Jalankan `npm install` di server deploy, lalu start dengan:

```bash
npm start
```

Database akan dibuat otomatis di folder `data/` saat aplikasi berjalan.
