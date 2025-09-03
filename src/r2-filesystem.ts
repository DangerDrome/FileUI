import { FileSystemAPI, FileItem } from './filemanager';

interface R2Credentials {
  accessKey: string;
  secretKey: string;
  endpoint: string;
  bucket?: string;
}

export class R2FileSystem implements FileSystemAPI {
  private credentials: R2Credentials;
  private baseUrl: string = '/api/r2';
  
  constructor(credentials: R2Credentials) {
    this.credentials = credentials;
  }

  // Expose credentials for operations that need them
  public getCredentials(): R2Credentials {
    return this.credentials;
  }

  private getHeaders(): Headers {
    const headers = new Headers();
    const credString = btoa(JSON.stringify(this.credentials));
    headers.append('X-R2-Credentials', credString);
    console.log('Sending R2 credentials header:', credString.substring(0, 20) + '...');
    return headers;
  }

  async listFiles(path: string = ''): Promise<FileItem[]> {
    try {
      const response = await fetch(`${this.baseUrl}/list?path=${encodeURIComponent(path)}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to list files: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error listing R2 files:', error);
      throw error;
    }
  }

  async readFile(path: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/read?path=${encodeURIComponent(path)}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to read file: ${response.statusText}`);
      }

      return response.text();
    } catch (error) {
      console.error('Error reading R2 file:', error);
      throw error;
    }
  }

  async writeFile(path: string, content: string, options?: { encoding?: string; contentType?: string }): Promise<void> {
    try {
      const headers = this.getHeaders();
      
      // Check if we're running on Cloudflare Pages or local
      const isCloudflare = this.baseUrl.includes('api/r2');
      
      if (isCloudflare) {
        // Cloudflare Pages expects path as query param and binary body
        let body: ArrayBuffer;
        
        if (options?.encoding === 'base64') {
          // Decode base64 to binary
          const binaryString = atob(content);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          body = bytes.buffer;
        } else {
          // Convert string to ArrayBuffer
          body = new TextEncoder().encode(content).buffer;
        }
        
        headers.append('Content-Type', options?.contentType || 'application/octet-stream');
        
        const response = await fetch(`${this.baseUrl}/write?path=${encodeURIComponent(path)}`, {
          method: 'PUT',
          headers: headers,
          body: body,
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to write file: ${errorText}`);
        }
      } else {
        // Local Python server expects JSON
        headers.append('Content-Type', 'application/json');
        
        const payload = {
          path: path,
          content: content,
          encoding: options?.encoding,
          contentType: options?.contentType
        };
        
        const response = await fetch(`${this.baseUrl}/write`, {
          method: 'PUT',
          headers: headers,
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to write file: ${errorText}`);
        }
      }
    } catch (error) {
      console.error('Error writing R2 file:', error);
      throw error;
    }
  }

  async getMetadata(path: string): Promise<any> {
    // For now, return basic metadata from listFiles
    // Could be extended with a dedicated metadata endpoint
    const files = await this.listFiles(path);
    const file = files.find(f => f.path === path);
    return file || {};
  }

  // Test connection by calling the test endpoint
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/test`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        return false;
      }

      const result = await response.json();
      if (!result.success && result.error) {
        console.error('R2 test error:', result.error, 'Type:', result.type);
      }
      return result.success === true;
    } catch (error) {
      console.error('R2 connection test failed:', error);
      return false;
    }
  }
}