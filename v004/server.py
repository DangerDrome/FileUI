#!/usr/bin/env python3
"""
Simple HTTP server for FileUI
Works with Python 3.x
"""

import http.server
import socketserver
import os
import sys
from urllib.parse import urlparse

PORT = 8000

class FileUIHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add headers to support ES6 modules
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        
        # Ensure proper MIME type for JavaScript modules
        if self.path.endswith('.js'):
            self.send_header('Content-Type', 'text/javascript')
        elif self.path.endswith('.mjs'):
            self.send_header('Content-Type', 'text/javascript')
            
        super().end_headers()
    
    def do_GET(self):
        # Log requests
        print(f"{self.command} {self.path}")
        
        # Serve index.html for root
        if self.path == '/':
            self.path = '/index.html'
            
        return super().do_GET()

def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    print(f"""
╔═══════════════════════════════════════════╗
║         FileUI v4 Python Server           ║
╠═══════════════════════════════════════════╣
║  Server starting at:                      ║
║  http://localhost:{PORT}                     ║
║                                           ║
║  Open in browser:                         ║
║  http://localhost:{PORT}/panels4.html        ║
║                                           ║
║  Press Ctrl+C to stop                     ║
╚═══════════════════════════════════════════╝
    """)
    
    with socketserver.TCPServer(("", PORT), FileUIHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
            sys.exit(0)

if __name__ == "__main__":
    main()