import { FileSystemAPI, FileItem } from './filemanager';

export class GoogleDriveFileSystem implements FileSystemAPI {
  private credentials: any;

  constructor(credentials: any) {
    this.credentials = credentials;
  }

  async listFiles(path: string): Promise<FileItem[]> {
    try {
      const response = await fetch('/api/google-drive/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credentials: this.credentials,
          folderId: path || 'root'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.files || [];
    } catch (error) {
      console.error('Error listing Google Drive files:', error);
      return [];
    }
  }

  async readFile(path: string): Promise<string> {
    try {
      const response = await fetch('/api/google-drive/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credentials: this.credentials,
          fileId: path
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      console.error('Error reading Google Drive file:', error);
      throw error;
    }
  }

  async writeFile(path: string, content: string): Promise<void> {
    // Not implemented for Google Drive
    throw new Error('Write operations not supported for Google Drive');
  }

  async getMetadata(path: string): Promise<Record<string, any>> {
    try {
      const response = await fetch('/api/google-drive/metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credentials: this.credentials,
          fileId: path
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting Google Drive metadata:', error);
      return {};
    }
  }
}