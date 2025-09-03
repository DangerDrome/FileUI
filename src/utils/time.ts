// Time utilities for FileUI v005

/**
 * Format seconds as m:ss (e.g., 0:05, 2:37)
 */
export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
} 