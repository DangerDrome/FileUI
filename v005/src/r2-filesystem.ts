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
      headers.append('Content-Type', 'application/json');
      
      const response = await fetch(`${this.baseUrl}/write`, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify({ 
          path, 
          content,
          encoding: options?.encoding,
          contentType: options?.contentType
        }),
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