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

  private getHeaders(): Headers {
    const headers = new Headers();
    headers.append('X-R2-Credentials', btoa(JSON.stringify(this.credentials)));
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

  async writeFile(path: string, content: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/write`, {
        method: 'PUT',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path, content }),
      });

      if (!response.ok) {
        throw new Error(`Failed to write file: ${response.statusText}`);
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