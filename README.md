eSports Tournament Hub — Local Tournament App

This folder contains a static eSports tournament app for local use.
Open `index.html`, `table.html`, or `admin.html` directly in your browser from this folder.

Local use instructions:
1. Open the desired HTML file directly in your browser.
2. If your browser blocks local JavaScript, run a local web server instead:
   - In PowerShell: `python -m http.server 8000`
   - Open `http://localhost:8000`

Local state behavior:
- The app saves `teams` and `matches` to `localStorage` in the browser.
- Changes made via `admin.html` are private to that browser and machine.
- Use "Export State" and "Import State" in `admin.html` to move tournament data between browsers or computers.

Files in this folder:
- `index.html` — home page with match schedule and standings preview.
- `table.html` — full tournament standings table.
- `admin.html` — admin panel for adding and managing match data.
- `data.js`, `admin.js`, `style.css` — application logic and styling.

This is intentionally local-only; do not publish to a public hosting service if you want it private.