export function getFileIcon(fileType: string): string {
  switch (fileType) {
    case 'folder': return 'folder';
    case 'file-3d': return 'box';
    case 'file-comp': return 'layers';
    case 'file-image': return 'image';
    case 'file-video': return 'film';
    case 'file-project': return 'folder-open';
    case 'file-pdf': return 'file-text';
    case 'file-code':
    case 'javascript':
    case 'typescript': return 'file-code';
    case 'json': return 'file-json';
    case 'markdown': return 'file-text';
    default: return 'file';
  }
}

export function getFileIconColor(fileType: string): string {
  switch (fileType) {
    case 'folder': return 'var(--file-project)';
    case 'file-3d': return 'var(--file-3d)';
    case 'file-comp': return 'var(--file-comp)';
    case 'file-image': return 'var(--file-image)';
    case 'file-video': return 'var(--file-video)';
    case 'file-project': return 'var(--file-project)';
    case 'file-pdf': return 'var(--file-document)';
    case 'file-code':
    case 'javascript':
    case 'typescript': return 'var(--color-accent)';
    default: return 'var(--color-white-rgba-70)';
  }
} 