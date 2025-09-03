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
import boto3
from botocore.client import Config
import base64
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload, MediaFileUpload
import io
import tempfile

class FileAPIHandler(BaseHTTPRequestHandler):
    # Class variable to store root directory
    root_dir = Path('.')
    
    def do_GET(self):
        """Handle GET requests"""
        parsed_path = urlparse(self.path)
        
        if parsed_path.path == '/api/files':
            self.handle_list_files(parsed_path)
        elif parsed_path.path == '/api/file':
            self.handle_read_file(parsed_path)
        elif parsed_path.path == '/api/metadata':
            self.handle_get_metadata(parsed_path)
        elif parsed_path.path == '/api/sequence':
            self.handle_get_sequence(parsed_path)
        elif parsed_path.path == '/api/r2/list':
            self.handle_r2_list(parsed_path)
        elif parsed_path.path == '/api/r2/read':
            self.handle_r2_read(parsed_path)
        elif parsed_path.path == '/api/r2/test':
            self.handle_r2_test()
        elif parsed_path.path == '/api/gdrive/test':
            self.handle_gdrive_test()
        elif parsed_path.path == '/api/gdrive/list':
            self.handle_gdrive_list(parsed_path)
        elif parsed_path.path == '/api/gdrive/read':
            self.handle_gdrive_read(parsed_path)
        else:
            self.send_error(404, "Not Found")
    
    def do_PUT(self):
        """Handle PUT requests"""
        parsed_path = urlparse(self.path)
        if parsed_path.path == '/api/file':
            self.handle_write_file()
        elif parsed_path.path == '/api/r2/write':
            self.handle_r2_write()
        elif parsed_path.path == '/api/gdrive/write':
            self.handle_gdrive_write()
        elif parsed_path.path == '/api/gdrive/mkdir':
            self.handle_gdrive_mkdir()
        else:
            self.send_error(404, "Not Found")
    
    def do_DELETE(self):
        """Handle DELETE requests"""
        parsed_path = urlparse(self.path)
        if parsed_path.path == '/api/r2/delete':
            self.handle_r2_delete()
        elif parsed_path.path == '/api/gdrive/delete':
            self.handle_gdrive_delete()
        else:
            self.send_error(404, "Not Found")
    
    def do_OPTIONS(self):
        """Handle preflight CORS requests"""
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()
    
    def send_cors_headers(self):
        """Send CORS headers to allow Vite dev server access"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-R2-Credentials, X-GDrive-Credentials')
    
    def handle_list_files(self, parsed_path):
        """List files in a directory"""
        query_params = parse_qs(parsed_path.query)
        path = query_params.get('path', ['.'])[0]
        
        try:
            # Resolve path relative to root directory
            if path == '.':
                safe_path = self.root_dir.resolve()
            else:
                safe_path = (self.root_dir / path).resolve()
            
            # Ensure path is within root directory
            if not str(safe_path).startswith(str(self.root_dir.resolve())):
                self.send_response(403)
                self.send_header('Content-Type', 'text/plain')
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(b"Access Denied")
                return
            
            files = []
            for item in safe_path.iterdir():
                # Get path relative to root directory
                relative_path = str(item.relative_to(self.root_dir.resolve()))
                file_info = {
                    'name': item.name,
                    'path': relative_path,
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
            self.send_cors_headers()
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
            # Resolve path relative to root directory
            safe_path = (self.root_dir / path).resolve()
            
            # Ensure path is within root directory
            if not str(safe_path).startswith(str(self.root_dir.resolve())):
                self.send_response(403)
                self.send_header('Content-Type', 'text/plain')
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(b"Access Denied")
                return
            
            if not safe_path.exists() or not safe_path.is_file():
                self.send_response(404)
                self.send_header('Content-Type', 'text/plain')
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(b"File not found")
                return
            
            # Determine content type
            mime_type, _ = mimetypes.guess_type(str(safe_path))
            
            # For text files or unknown types, read as text
            if mime_type and (mime_type.startswith('text/') or mime_type in ['application/json', 'application/javascript']):
                content = safe_path.read_text()
                self.send_response(200)
                self.send_header('Content-Type', f'{mime_type}; charset=utf-8')
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(content.encode())
            else:
                # For binary files (images, videos, etc), read as bytes
                content = safe_path.read_bytes()
                self.send_response(200)
                self.send_header('Content-Type', mime_type or 'application/octet-stream')
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(content)
            
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
            self.send_cors_headers()
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
            # Resolve path relative to root directory
            safe_path = (self.root_dir / path).resolve()
            
            # Ensure path is within root directory
            if not str(safe_path).startswith(str(self.root_dir.resolve())):
                self.send_response(403)
                self.send_header('Content-Type', 'text/plain')
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(b"Access Denied")
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
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(metadata).encode())
            
        except Exception as e:
            self.send_error(500, str(e))
    
    def handle_get_sequence(self, parsed_path):
        """Detect if a file is part of a sequence and return all sequence files"""
        query_params = parse_qs(parsed_path.query)
        filepath = query_params.get('path', [''])[0]
        
        if not filepath:
            self.send_error(400, "Path parameter required")
            return
        
        try:
            import re
            
            # Parse the filename to detect sequence pattern
            file_path = Path(filepath)
            filename = file_path.name
            
            # Handle both absolute and relative paths
            if file_path.is_absolute():
                directory = file_path.parent
            else:
                # If relative, use the root directory
                full_path = self.root_dir / filepath
                directory = full_path.parent
                filename = full_path.name
            
            # Try different sequence patterns
            patterns = [
                r'^(.+?)([._])(\d{3,6})\.(\w+)$',  # name.0001.ext or name_0001.ext
                r'^(.+?)(\d{3,6})\.(\w+)$',         # name0001.ext
            ]
            
            match = None
            for pattern in patterns:
                match = re.match(pattern, filename)
                if match:
                    break
            
            if not match:
                # Not a sequence file
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({'is_sequence': False}).encode())
                return
            
            # Extract sequence components
            if len(match.groups()) == 4:
                base_name = match.group(1)
                delimiter = match.group(2)
                frame_num = match.group(3)
                extension = match.group(4)
            else:
                base_name = match.group(1)
                delimiter = ''
                frame_num = match.group(2)
                extension = match.group(3)
            
            padding = len(frame_num)
            
            # Scan directory for matching files
            # Directory is already an absolute Path or has been resolved
            if directory.is_absolute():
                safe_dir = directory.resolve()
            else:
                safe_dir = (self.root_dir / directory).resolve()
                
            if not str(safe_dir).startswith(str(self.root_dir.resolve())):
                self.send_error(403, "Access Denied")
                return
            
            sequence_files = []
            frame_numbers = []
            
            # Pattern to match all files in the sequence
            if delimiter:
                seq_pattern = re.compile(f'^{re.escape(base_name)}{re.escape(delimiter)}(\\d{{{padding},}})\.{re.escape(extension)}$')
            else:
                seq_pattern = re.compile(f'^{re.escape(base_name)}(\\d{{{padding},}})\.{re.escape(extension)}$')
            
            for item in safe_dir.iterdir():
                if item.is_file():
                    match = seq_pattern.match(item.name)
                    if match:
                        frame = int(match.group(1))
                        frame_numbers.append(frame)
                        sequence_files.append({
                            'name': item.name,
                            'path': str(item.relative_to(self.root_dir.resolve())),
                            'frame': frame
                        })
            
            if len(sequence_files) < 2:
                # Not enough files for a sequence
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({'is_sequence': False}).encode())
                return
            
            # Sort by frame number
            sequence_files.sort(key=lambda x: x['frame'])
            frame_numbers.sort()
            
            # Build sequence info
            sequence_info = {
                'is_sequence': True,
                'base_name': base_name,
                'delimiter': delimiter,
                'padding': padding,
                'extension': extension,
                'start_frame': frame_numbers[0],
                'end_frame': frame_numbers[-1],
                'frame_count': len(frame_numbers),
                'files': sequence_files,
                'missing_frames': []
            }
            
            # Check for missing frames
            for i in range(frame_numbers[0], frame_numbers[-1] + 1):
                if i not in frame_numbers:
                    sequence_info['missing_frames'].append(i)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(sequence_info).encode())
            
        except Exception as e:
            self.send_error(500, str(e))
    
    def handle_r2_test(self):
        """Test R2 connection"""
        try:
            credentials = self._get_r2_credentials()
            if not credentials:
                self.send_error(400, "R2 credentials required")
                return
            
            print(f"Testing R2 connection to: {credentials.get('endpoint')}")
            
            s3_client = self._create_s3_client(credentials)
            
            # If a bucket is specified, try to list its contents instead
            if credentials.get('bucket'):
                bucket = credentials['bucket']
                print(f"Testing access to specific bucket: {bucket}")
                try:
                    response = s3_client.list_objects_v2(
                        Bucket=bucket,
                        MaxKeys=1  # Just test with 1 object
                    )
                    print(f"R2 test successful for bucket '{bucket}'")
                except Exception as bucket_error:
                    # If bucket doesn't exist or no access, try to create a test object
                    print(f"List failed, trying to write test object: {bucket_error}")
                    try:
                        test_key = '.fileui-test-' + str(int(datetime.now().timestamp()))
                        s3_client.put_object(
                            Bucket=bucket,
                            Key=test_key,
                            Body=b'test',
                            ContentType='text/plain'
                        )
                        # Clean up test file
                        s3_client.delete_object(Bucket=bucket, Key=test_key)
                        print(f"R2 test successful - write/delete test passed")
                    except Exception as write_error:
                        raise write_error
            else:
                # Try to list buckets
                response = s3_client.list_buckets()
                print(f"R2 test successful, found {len(response.get('Buckets', []))} buckets")
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({'success': True}).encode())
            
        except Exception as e:
            print(f"R2 test failed: {type(e).__name__}: {str(e)}")
            
            # Check if it's just a permissions issue with ListBuckets
            if "Access Denied" in str(e) and "ListBuckets" in str(e):
                # This might be normal - some R2 tokens only have bucket-specific access
                print("Note: ListBuckets access denied is normal for bucket-specific tokens")
                # If no bucket specified, we can't proceed
                if not credentials.get('bucket'):
                    error_msg = "Access denied. Please specify a bucket name - your credentials may only have access to specific buckets, not all buckets."
                else:
                    error_msg = str(e)
            else:
                error_msg = str(e)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({'success': False, 'error': error_msg, 'type': type(e).__name__}).encode())
    
    def handle_r2_list(self, parsed_path):
        """List R2 bucket contents"""
        try:
            credentials = self._get_r2_credentials()
            if not credentials:
                self.send_error(400, "R2 credentials required")
                return
            
            query_params = parse_qs(parsed_path.query)
            path = query_params.get('path', [''])[0]
            
            s3_client = self._create_s3_client(credentials)
            
            # If no bucket specified, list buckets
            if not credentials.get('bucket') and not path:
                response = s3_client.list_buckets()
                files = []
                for bucket in response.get('Buckets', []):
                    files.append({
                        'name': bucket['Name'],
                        'path': bucket['Name'],
                        'type': 'directory',
                        'modified': bucket['CreationDate'].isoformat() if bucket.get('CreationDate') else None
                    })
            else:
                # List objects in bucket
                bucket = credentials.get('bucket') or path.split('/')[0]
                prefix = path[len(bucket)+1:] if path.startswith(bucket) else path
                
                response = s3_client.list_objects_v2(
                    Bucket=bucket,
                    Prefix=prefix,
                    Delimiter='/'
                )
                
                files = []
                
                # Add folders (CommonPrefixes)
                for prefix_info in response.get('CommonPrefixes', []):
                    prefix_path = prefix_info['Prefix']
                    name = prefix_path.rstrip('/').split('/')[-1]
                    files.append({
                        'name': name,
                        'path': prefix_path,
                        'type': 'directory'
                    })
                
                # Add files (Contents)
                for obj in response.get('Contents', []):
                    if obj['Key'] != prefix:  # Skip the prefix itself
                        name = obj['Key'][len(prefix):].split('/')[0]
                        if name:  # Skip empty names
                            files.append({
                                'name': name,
                                'path': obj['Key'],
                                'type': 'file',
                                'size': obj['Size'],
                                'modified': obj['LastModified'].isoformat() if obj.get('LastModified') else None,
                                'extension': name.split('.')[-1] if '.' in name else ''
                            })
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(files).encode())
            
        except Exception as e:
            self.send_error(500, str(e))
    
    def handle_r2_read(self, parsed_path):
        """Read file from R2"""
        try:
            credentials = self._get_r2_credentials()
            if not credentials:
                self.send_error(400, "R2 credentials required")
                return
            
            query_params = parse_qs(parsed_path.query)
            path = query_params.get('path', [''])[0]
            
            if not path:
                self.send_error(400, "Path parameter required")
                return
            
            s3_client = self._create_s3_client(credentials)
            
            bucket = credentials.get('bucket') or path.split('/')[0]
            key = path[len(bucket)+1:] if path.startswith(bucket) else path
            
            response = s3_client.get_object(Bucket=bucket, Key=key)
            content = response['Body'].read()
            
            # Determine content type
            content_type = response.get('ContentType', 'application/octet-stream')
            
            # If no content type, guess from file extension
            if content_type == 'application/octet-stream':
                import mimetypes
                guessed_type = mimetypes.guess_type(path)[0]
                if guessed_type:
                    content_type = guessed_type
            
            print(f"Serving R2 file: {path}, Content-Type: {content_type}, Size: {len(content)}")
            
            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(content)))
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(content)
            
        except Exception as e:
            self.send_error(500, str(e))
    
    def handle_r2_write(self):
        """Write file to R2"""
        try:
            credentials = self._get_r2_credentials()
            if not credentials:
                self.send_error(400, "R2 credentials required")
                return
            
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode())
            
            path = data.get('path')
            content = data.get('content')
            encoding = data.get('encoding')
            provided_content_type = data.get('contentType')
            
            if not path or content is None:
                self.send_error(400, "Path and content required")
                return
            
            s3_client = self._create_s3_client(credentials)
            
            bucket = credentials.get('bucket') or path.split('/')[0]
            key = path[len(bucket)+1:] if path.startswith(bucket) else path
            
            # Handle base64 encoded content
            if encoding == 'base64':
                import base64
                body = base64.b64decode(content)
            else:
                body = content.encode() if isinstance(content, str) else content
            
            # Use provided content type or determine from path
            content_type = provided_content_type or self._get_content_type(path)
            
            s3_client.put_object(
                Bucket=bucket,
                Key=key,
                Body=body,
                ContentType=content_type
            )
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({'success': True}).encode())
            
        except Exception as e:
            self.send_error(500, str(e))
    
    def handle_r2_delete(self):
        """Delete file from R2"""
        try:
            credentials = self._get_r2_credentials()
            if not credentials:
                self.send_error(400, "R2 credentials required")
                return
            
            # Get path from query parameter (matching Cloudflare API)
            parsed_path = urlparse(self.path)
            query_params = parse_qs(parsed_path.query)
            path = query_params.get('path', [None])[0]
            
            if not path:
                self.send_error(400, "Path parameter required")
                return
            
            s3_client = self._create_s3_client(credentials)
            
            bucket = credentials.get('bucket') or path.split('/')[0]
            key = path[len(bucket)+1:] if path.startswith(bucket) else path
            
            s3_client.delete_object(Bucket=bucket, Key=key)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({'success': True}).encode())
            
        except Exception as e:
            self.send_error(500, str(e))
    
    def _get_r2_credentials(self):
        """Extract R2 credentials from request header"""
        creds_header = self.headers.get('X-R2-Credentials')
        if not creds_header:
            return None
        
        try:
            # Decode base64 credentials
            decoded = base64.b64decode(creds_header).decode()
            return json.loads(decoded)
        except:
            return None
    
    def _create_s3_client(self, credentials):
        """Create boto3 S3 client with R2 configuration"""
        return boto3.client(
            's3',
            endpoint_url=credentials['endpoint'],
            aws_access_key_id=credentials['accessKey'],
            aws_secret_access_key=credentials['secretKey'],
            config=Config(
                signature_version='s3v4',
                region_name='auto'
            )
        )
    
    def _get_content_type(self, path):
        """Get content type for a file path"""
        mime_type, _ = mimetypes.guess_type(path)
        return mime_type or 'application/octet-stream'
    
    def handle_gdrive_test(self):
        """Test Google Drive connection"""
        try:
            credentials = self._get_gdrive_credentials()
            if not credentials:
                self.send_error(400, "Google Drive credentials required")
                return
            
            print(f"Testing Google Drive connection")
            
            try:
                # Create service using service account
                service = self._create_gdrive_service(credentials)
                
                # Test by getting drive info
                about = service.about().get(fields="user").execute()
                user = about.get('user', {})
                print(f"Google Drive test successful for: {user.get('emailAddress', 'Unknown')}")
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({
                    'success': True,
                    'user': user.get('emailAddress', 'Unknown')
                }).encode())
                
            except Exception as e:
                print(f"Google Drive test failed: {type(e).__name__}: {str(e)}")
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({
                    'success': False,
                    'error': str(e),
                    'type': type(e).__name__
                }).encode())
                
        except Exception as e:
            self.send_error(500, str(e))
    
    def handle_gdrive_list(self, parsed_path):
        """List Google Drive contents"""
        try:
            credentials = self._get_gdrive_credentials()
            if not credentials:
                self.send_error(400, "Google Drive credentials required")
                return
            
            query_params = parse_qs(parsed_path.query)
            folder_id = query_params.get('folderId', ['root'])[0]
            
            service = self._create_gdrive_service(credentials)
            
            # Build query for listing files
            query = f"'{folder_id}' in parents and trashed = false"
            
            response = service.files().list(
                q=query,
                fields="files(id, name, mimeType, size, modifiedTime, parents)",
                orderBy="folder,name"
            ).execute()
            
            files = []
            for item in response.get('files', []):
                file_type = 'directory' if item['mimeType'] == 'application/vnd.google-apps.folder' else 'file'
                
                file_info = {
                    'id': item['id'],
                    'name': item['name'],
                    'type': file_type,
                    'mimeType': item['mimeType']
                }
                
                if file_type == 'file':
                    file_info['size'] = int(item.get('size', 0))
                    file_info['modified'] = item.get('modifiedTime')
                    file_info['extension'] = item['name'].split('.')[-1] if '.' in item['name'] else ''
                
                files.append(file_info)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(files).encode())
            
        except Exception as e:
            self.send_error(500, str(e))
    
    def handle_gdrive_read(self, parsed_path):
        """Read file from Google Drive"""
        try:
            credentials = self._get_gdrive_credentials()
            if not credentials:
                self.send_error(400, "Google Drive credentials required")
                return
            
            query_params = parse_qs(parsed_path.query)
            file_id = query_params.get('fileId', [''])[0]
            
            if not file_id:
                self.send_error(400, "File ID required")
                return
            
            service = self._create_gdrive_service(credentials)
            
            # Get file metadata first
            file_metadata = service.files().get(fileId=file_id, fields="name, mimeType").execute()
            
            # Handle Google Docs/Sheets/Slides export
            if file_metadata['mimeType'].startswith('application/vnd.google-apps'):
                # Export Google Docs to appropriate format
                export_mime_type = self._get_export_mime_type(file_metadata['mimeType'])
                request = service.files().export_media(fileId=file_id, mimeType=export_mime_type)
            else:
                # Regular file download
                request = service.files().get_media(fileId=file_id)
            
            # Download file content
            fh = io.BytesIO()
            downloader = MediaIoBaseDownload(fh, request)
            done = False
            while not done:
                status, done = downloader.next_chunk()
            
            content = fh.getvalue()
            
            # Determine content type
            content_type = self._get_content_type(file_metadata['name'])
            
            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(content)))
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(content)
            
        except Exception as e:
            self.send_error(500, str(e))
    
    def handle_gdrive_write(self):
        """Write file to Google Drive"""
        try:
            credentials = self._get_gdrive_credentials()
            if not credentials:
                self.send_error(400, "Google Drive credentials required")
                return
            
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode())
            
            file_name = data.get('fileName')
            parent_id = data.get('parentId', 'root')
            content = data.get('content')
            encoding = data.get('encoding')
            
            if not file_name or content is None:
                self.send_error(400, "File name and content required")
                return
            
            service = self._create_gdrive_service(credentials)
            
            # Handle base64 encoded content
            if encoding == 'base64':
                import base64
                file_content = base64.b64decode(content)
            else:
                file_content = content.encode() if isinstance(content, str) else content
            
            # Write content to temporary file
            with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
                tmp_file.write(file_content)
                tmp_file_path = tmp_file.name
            
            try:
                # Prepare file metadata
                file_metadata = {
                    'name': file_name,
                    'parents': [parent_id]
                }
                
                # Determine MIME type
                mime_type = self._get_content_type(file_name)
                
                # Upload file
                media = MediaFileUpload(tmp_file_path, mimetype=mime_type)
                file = service.files().create(
                    body=file_metadata,
                    media_body=media,
                    fields='id'
                ).execute()
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({
                    'success': True,
                    'fileId': file.get('id')
                }).encode())
                
            finally:
                # Clean up temp file
                os.unlink(tmp_file_path)
                
        except Exception as e:
            self.send_error(500, str(e))
    
    def handle_gdrive_mkdir(self):
        """Create folder in Google Drive"""
        try:
            credentials = self._get_gdrive_credentials()
            if not credentials:
                self.send_error(400, "Google Drive credentials required")
                return
            
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode())
            
            folder_name = data.get('folderName')
            parent_id = data.get('parentId', 'root')
            
            if not folder_name:
                self.send_error(400, "Folder name required")
                return
            
            service = self._create_gdrive_service(credentials)
            
            # Create folder metadata
            file_metadata = {
                'name': folder_name,
                'mimeType': 'application/vnd.google-apps.folder',
                'parents': [parent_id]
            }
            
            # Create folder
            folder = service.files().create(
                body=file_metadata,
                fields='id'
            ).execute()
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({
                'success': True,
                'folderId': folder.get('id')
            }).encode())
            
        except Exception as e:
            self.send_error(500, str(e))
    
    def handle_gdrive_delete(self):
        """Delete file from Google Drive"""
        try:
            credentials = self._get_gdrive_credentials()
            if not credentials:
                self.send_error(400, "Google Drive credentials required")
                return
            
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode())
            
            file_id = data.get('fileId')
            if not file_id:
                self.send_error(400, "File ID required")
                return
            
            service = self._create_gdrive_service(credentials)
            
            # Move to trash instead of permanent delete
            service.files().update(
                fileId=file_id,
                body={'trashed': True}
            ).execute()
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({'success': True}).encode())
            
        except Exception as e:
            self.send_error(500, str(e))
    
    def _get_gdrive_credentials(self):
        """Extract Google Drive credentials from request header"""
        creds_header = self.headers.get('X-GDrive-Credentials')
        if not creds_header:
            return None
        
        try:
            # Decode base64 credentials
            decoded = base64.b64decode(creds_header).decode()
            return json.loads(decoded)
        except:
            return None
    
    def _create_gdrive_service(self, credentials):
        """Create Google Drive service using service account"""
        # Parse the service account JSON
        creds = service_account.Credentials.from_service_account_info(
            credentials,
            scopes=['https://www.googleapis.com/auth/drive']
        )
        
        return build('drive', 'v3', credentials=creds)
    
    def _get_export_mime_type(self, google_mime_type):
        """Get export MIME type for Google Docs formats"""
        export_formats = {
            'application/vnd.google-apps.document': 'application/pdf',
            'application/vnd.google-apps.spreadsheet': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.google-apps.presentation': 'application/pdf',
            'application/vnd.google-apps.drawing': 'image/png'
        }
        return export_formats.get(google_mime_type, 'application/pdf')
    
    def log_message(self, format, *args):
        """Override to customize logging"""
        print(f"{self.address_string()} - {format % args}")

def main():
    parser = argparse.ArgumentParser(description='FileUI v005 Server')
    parser.add_argument('--port', type=int, default=8000, help='Port to run server on')
    parser.add_argument('--host', default='localhost', help='Host to bind to')
    parser.add_argument('--root', default='.', help='Root directory to serve files from')
    args = parser.parse_args()
    
    # Set root directory for the handler
    FileAPIHandler.root_dir = Path(args.root).resolve()
    
    server_address = (args.host, args.port)
    httpd = HTTPServer(server_address, FileAPIHandler)
    
    print(f"FileUI Server running on http://{args.host}:{args.port}")
    print(f"Serving files from: {FileAPIHandler.root_dir}")
    print("API endpoints:")
    print("  GET  /api/files     - List files in directory")
    print("  GET  /api/file      - Read file contents")
    print("  PUT  /api/file      - Write file contents")
    print("  GET  /api/metadata  - Get file metadata")
    print("  GET  /api/r2/test   - Test R2 connection")
    print("  GET  /api/r2/list   - List R2 bucket contents")
    print("  GET  /api/r2/read   - Read R2 file")
    print("  PUT  /api/r2/write  - Write R2 file")
    print("  GET  /api/gdrive/test  - Test Google Drive connection")
    print("  GET  /api/gdrive/list  - List Google Drive contents")
    print("  GET  /api/gdrive/read  - Read Google Drive file")
    print("  PUT  /api/gdrive/write - Write Google Drive file")
    print("  PUT  /api/gdrive/mkdir - Create Google Drive folder")
    print("  DELETE /api/gdrive/delete - Delete Google Drive file")
    print("\nPress Ctrl+C to stop the server")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped")

if __name__ == '__main__':
    main()