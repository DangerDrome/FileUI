// File Manager - Basic file operations for FileUI v005

export interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: Date;
  extension?: string;
  metadata?: Record<string, any>;
}

export interface FileSystemAPI {
  listFiles(path: string): Promise<FileItem[]>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  getMetadata(path: string): Promise<Record<string, any>>;
}

// Server-based file system implementation
export class ServerFileSystem implements FileSystemAPI {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  async listFiles(path: string): Promise<FileItem[]> {
    const response = await fetch(`${this.baseUrl}/files?path=${encodeURIComponent(path)}`);
    if (!response.ok) {
      throw new Error(`Failed to list files: ${response.statusText}`);
    }
    return response.json();
  }

  async readFile(path: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/file?path=${encodeURIComponent(path)}`);
    if (!response.ok) {
      throw new Error(`Failed to read file: ${response.statusText}`);
    }
    return response.text();
  }

  async writeFile(path: string, content: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/file`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify({ path, content }),
    });
    if (!response.ok) {
      throw new Error(`Failed to write file: ${response.statusText}`);
    }
  }

  async getMetadata(path: string): Promise<Record<string, any>> {
    const response = await fetch(`${this.baseUrl}/metadata?path=${encodeURIComponent(path)}`);
    if (!response.ok) {
      throw new Error(`Failed to get metadata: ${response.statusText}`);
    }
    return response.json();
  }
}

// File type detection based on extension
export function getFileType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  
  // VFX/3D file types
  if (['blend', 'ma', 'mb', 'hip', 'c4d', 'max', 'fbx', 'obj', 'usd'].includes(ext)) {
    return 'file-3d';
  }
  
  // Compositing files
  if (['nk', 'aep', 'comp'].includes(ext)) {
    return 'file-comp';
  }
  
  // Image files
  if (['exr', 'dpx', 'tiff', 'png', 'jpg', 'jpeg', 'psd'].includes(ext)) {
    return 'file-image';
  }
  
  // Video files
  if (['mov', 'mp4', 'mxf', 'r3d', 'ari'].includes(ext)) {
    return 'file-video';
  }
  
  // Project files
  if (['prproj', 'drp', 'fcp'].includes(ext)) {
    return 'file-project';
  }
  
  return 'file-generic';
}

// Format file size for display
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// Sort files by type and name
export function sortFiles(files: FileItem[]): FileItem[] {
  return files.sort((a, b) => {
    // Directories first
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }
    // Then by name
    return a.name.localeCompare(b.name);
  });
}