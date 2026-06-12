Local use only

This folder is now intended for local use only. Do not publish it to GitHub Pages or any public hosting service if you want the site to remain private.

Local use instructions:
1. Open `index.html`, `table.html`, or `admin.html` directly in your browser.
2. If your browser blocks local JavaScript, run a simple local server:
   - PowerShell: `python -m http.server 8000`
   - Visit `http://localhost:8000`

Notes:
- `admin.html` is the admin panel and should be used only on your local machine.
- State is stored in browser `localStorage`, so changes are local to that browser.
- Use "Export State" and "Import State" to move league data between browsers or computers.
