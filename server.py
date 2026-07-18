#!/usr/bin/env python3
"""Dashboard server — static file serving + POST /api/save for dashboard-data.json."""
import json
import os
from http.server import HTTPServer, SimpleHTTPRequestHandler

SAVE_FILE = "dashboard-data.json"

class DashboardHandler(SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == "/api/save":
            try:
                content_length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(content_length)
                data = json.loads(body)
                # Write atomically: temp → rename
                tmp = SAVE_FILE + ".tmp"
                with open(tmp, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                os.replace(tmp, SAVE_FILE)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"ok":true,"lastUpdated":"%s"}' % data.get("lastUpdated", "").encode())
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": False, "error": str(e)}).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_GET(self):
        # API routes that don't need a real backend — return graceful responses
        if self.path.startswith("/api/"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"ok":false,"msg":"no backend - use OpenCode for this"}')
            return
        super().do_GET()

    def log_message(self, format, *args):
        # Suppress log noise — only show POST saves
        if "POST" in str(args):
            super().log_message(format, *args)


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    server = HTTPServer(("0.0.0.0", 4600), DashboardHandler)
    print("📊 Dashboard server → http://localhost:4600")
    print("   /api/save  — POST to persist dashboard-data.json")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Server stopped")
        server.server_close()
