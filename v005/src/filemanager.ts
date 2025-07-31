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
    try {
      const response = await fetch(`${this.baseUrl}/files?path=${encodeURIComponent(path)}`);
      if (!response.ok) {
        throw new Error(`Failed to list files: ${response.statusText}`);
      }
      return response.json();
    } catch (error) {
      // Fallback to demo data if server is not available
      console.warn('Server not available, using demo data');
      return this.getDemoFiles(path);
    }
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

  private getDemoFiles(path: string): FileItem[] {
    // Demo file structure for Cloudflare Pages
    if (path === '.' || path === '/') {
      return [
        { name: 'project.blend', path: 'project.blend', type: 'file', size: 1024000 },
        { name: 'scenes', path: 'scenes', type: 'directory', size: 0 },
        { name: 'renders', path: 'renders', type: 'directory', size: 0 },
        { name: 'textures', path: 'textures', type: 'directory', size: 0 },
        { name: 'README.md', path: 'README.md', type: 'file', size: 2048 },
        { name: 'shot_001.nk', path: 'shot_001.nk', type: 'file', size: 512000 },
        { name: 'animation.ma', path: 'animation.ma', type: 'file', size: 768000 },
        { name: 'project_brief.pdf', path: 'project_brief.pdf', type: 'file', size: 1024000 },
      ];
    } else if (path === 'scenes') {
      return [
        { name: 'scene_001.blend', path: 'scenes/scene_001.blend', type: 'file', size: 2048000 },
        { name: 'scene_002.blend', path: 'scenes/scene_002.blend', type: 'file', size: 1536000 },
        { name: 'layout.hip', path: 'scenes/layout.hip', type: 'file', size: 1024000 },
      ];
    } else if (path === 'renders') {
      return [
        { name: 'frame_0001.exr', path: 'renders/frame_0001.exr', type: 'file', size: 8192000 },
        { name: 'frame_0002.exr', path: 'renders/frame_0002.exr', type: 'file', size: 8192000 },
        { name: 'preview.mov', path: 'renders/preview.mov', type: 'file', size: 20480000 },
      ];
    } else if (path === 'textures') {
      return [
        { name: 'metal_diffuse.png', path: 'textures/metal_diffuse.png', type: 'file', size: 4096000 },
        { name: 'metal_normal.png', path: 'textures/metal_normal.png', type: 'file', size: 4096000 },
        { name: 'wood_albedo.tiff', path: 'textures/wood_albedo.tiff', type: 'file', size: 16384000 },
      ];
    }
    return [];
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
  if (['exr', 'dpx', 'tiff', 'png', 'jpg', 'jpeg', 'psd', 'webp', 'gif', 'bmp', 'svg', 'ico', 'heic', 'heif', 'avif'].includes(ext)) {
    return 'file-image';
  }
  
  // Video files
  if (['mov', 'mp4', 'mxf', 'r3d', 'ari', 'webm', 'avi', 'mkv', 'm4v', 'flv', 'wmv', 'mpg', 'mpeg', 'm2v', 'f4v', 'ogg', 'ogv'].includes(ext)) {
    return 'file-video';
  }
  
  // Project files
  if (['prproj', 'drp', 'fcp'].includes(ext)) {
    return 'file-project';
  }
  
  // Audio files
  if (['mp3', 'wav', 'aac', 'm4a', 'flac', 'ogg', 'wma', 'aiff', 'ape', 'opus'].includes(ext)) {
    return 'file-audio';
  }
  
  // PDF files
  if (ext === 'pdf') {
    return 'file-pdf';
  }
  
  // Code files
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'cpp', 'c', 'h', 'java', 'cs', 'go', 'rs', 'php', 'rb', 'swift'].includes(ext)) {
    return 'file-code';
  }
  
  // Markdown
  if (ext === 'md') {
    return 'markdown';
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