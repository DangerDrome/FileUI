#!/usr/bin/env python3
"""
FileUI v005 - Simple Python Server
Provides RESTful API for file operations and metadata extraction
"""

import os
import json
import mimetypes
from datetime import datetime
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import argparse

class FileAPIHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        """Handle GET requests"""
        parsed_path = urlparse(self.path)
        
        # Enable CORS
        self.send_cors_headers()
        
        if parsed_path.path == '/api/files':
            self.handle_list_files(parsed_path)
        elif parsed_path.path == '/api/file':
            self.handle_read_file(parsed_path)
        elif parsed_path.path == '/api/metadata':
            self.handle_get_metadata(parsed_path)
        else:
            self.send_error(404, "Not Found")
    
    def do_PUT(self):
        """Handle PUT requests"""
        self.send_cors_headers()
        
        parsed_path = urlparse(self.path)
        if parsed_path.path == '/api/file':
            self.handle_write_file()
        else:
            self.send_error(404, "Not Found")
    
    def do_OPTIONS(self):
        """Handle preflight CORS requests"""
        self.send_cors_headers()
        self.end_headers()
    
    def send_cors_headers(self):
        """Send CORS headers to allow Vite dev server access"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
    
    def handle_list_files(self, parsed_path):
        """List files in a directory"""
        query_params = parse_qs(parsed_path.query)
        path = query_params.get('path', ['.'])[0]
        
        try:
            # Ensure path is safe
            safe_path = Path(path).resolve()
            base_path = Path('.').resolve()
            
            if not str(safe_path).startswith(str(base_path)):
                self.send_error(403, "Access Denied")
                return
            
            files = []
            for item in safe_path.iterdir():
                file_info = {
                    'name': item.name,
                    'path': str(item),
                    'type': 'directory' if item.is_dir() else 'file'
                }
                
                if item.is_file():
                    stat = item.stat()
                    file_info['size'] = stat.st_size
                    file_info['modified'] = datetime.fromtimestamp(stat.st_mtime).isoformat()
                    file_info['extension'] = item.suffix[1:] if item.suffix else ''
                
                files.append(file_info)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(files).encode())
            
        except Exception as e:
            self.send_error(500, str(e))
    
    def handle_read_file(self, parsed_path):
        """Read file contents"""
        query_params = parse_qs(parsed_path.query)
        path = query_params.get('path', [''])[0]
        
        if not path:
            self.send_error(400, "Path parameter required")
            return
        
        try:
            safe_path = Path(path).resolve()
            base_path = Path('.').resolve()
            
            if not str(safe_path).startswith(str(base_path)):
                self.send_error(403, "Access Denied")
                return
            
            if not safe_path.exists() or not safe_path.is_file():
                self.send_error(404, "File not found")
                return
            
            content = safe_path.read_text()
            
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain; charset=utf-8')
            self.end_headers()
            self.wfile.write(content.encode())
            
        except Exception as e:
            self.send_error(500, str(e))
    
    def handle_write_file(self):
        """Write file contents"""
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            data = json.loads(post_data.decode())
            path = data.get('path')
            content = data.get('content')
            
            if not path or content is None:
                self.send_error(400, "Path and content required")
                return
            
            safe_path = Path(path).resolve()
            base_path = Path('.').resolve()
            
            if not str(safe_path).startswith(str(base_path)):
                self.send_error(403, "Access Denied")
                return
            
            # Create parent directories if needed
            safe_path.parent.mkdir(parents=True, exist_ok=True)
            
            safe_path.write_text(content)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': True}).encode())
            
        except Exception as e:
            self.send_error(500, str(e))
    
    def handle_get_metadata(self, parsed_path):
        """Get file metadata (placeholder for VFX metadata extraction)"""
        query_params = parse_qs(parsed_path.query)
        path = query_params.get('path', [''])[0]
        
        if not path:
            self.send_error(400, "Path parameter required")
            return
        
        try:
            safe_path = Path(path).resolve()
            base_path = Path('.').resolve()
            
            if not str(safe_path).startswith(str(base_path)):
                self.send_error(403, "Access Denied")
                return
            
            if not safe_path.exists():
                self.send_error(404, "File not found")
                return
            
            stat = safe_path.stat()
            mime_type, _ = mimetypes.guess_type(str(safe_path))
            
            metadata = {
                'name': safe_path.name,
                'size': stat.st_size,
                'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                'created': datetime.fromtimestamp(stat.st_ctime).isoformat(),
                'mime_type': mime_type,
                'extension': safe_path.suffix[1:] if safe_path.suffix else ''
            }
            
            # TODO: Add VFX-specific metadata extraction here
            # For example: frame range, resolution, color space for EXR files
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(metadata).encode())
            
        except Exception as e:
            self.send_error(500, str(e))
    
    def log_message(self, format, *args):
        """Override to customize logging"""
        print(f"{self.address_string()} - {format % args}")

def main():
    parser = argparse.ArgumentParser(description='FileUI v005 Server')
    parser.add_argument('--port', type=int, default=8000, help='Port to run server on')
    parser.add_argument('--host', default='localhost', help='Host to bind to')
    args = parser.parse_args()
    
    server_address = (args.host, args.port)
    httpd = HTTPServer(server_address, FileAPIHandler)
    
    print(f"FileUI Server running on http://{args.host}:{args.port}")
    print("API endpoints:")
    print("  GET  /api/files     - List files in directory")
    print("  GET  /api/file      - Read file contents")
    print("  PUT  /api/file      - Write file contents")
    print("  GET  /api/metadata  - Get file metadata")
    print("\nPress Ctrl+C to stop the server")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped")

if __name__ == '__main__':
    main()