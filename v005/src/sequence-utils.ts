// Utility functions for detecting and handling image sequences

export interface SequenceInfo {
  baseName: string;
  padding: number;
  startFrame: number;
  endFrame: number;
  frameCount: number;
  extension: string;
  delimiter: string;
  pattern: string;
  files: string[];
}

export interface ParsedFrame {
  baseName: string;
  frameNumber: number;
  padding: number;
  delimiter: string;
  extension: string;
  fullPath: string;
}

// Parse a filename to extract sequence components
export function parseSequenceFrame(filename: string): ParsedFrame | null {
  // Try different common VFX naming patterns
  // The order matters - more specific patterns first
  const patterns = [
    // VFX pattern with version: name_v##.####.ext or name.v##.####.ext
    /^(.+?[._]v\d+)([._])(\d{3,6})\.(\w+)$/,
    // Standard pattern: filename.0001.ext or filename_0001.ext
    /^(.+?)([._])(\d{3,6})\.(\w+)$/,
    // filename0001.ext (no delimiter)
    /^(.+?)(\d{3,6})\.(\w+)$/,
    // Special case for single frame that might be part of sequence
    /^(.+?)([._])(\d{1,2})\.(\w+)$/,
  ];

  for (const pattern of patterns) {
    const match = filename.match(pattern);
    if (match) {
      if (match.length === 5) {
        // Pattern with delimiter
        return {
          baseName: match[1],
          delimiter: match[2],
          frameNumber: parseInt(match[3], 10),
          padding: match[3].length,
          extension: match[4],
          fullPath: filename
        };
      } else if (match.length === 4) {
        // Pattern without delimiter
        // Need to be careful to separate base name from number
        const fullBase = match[1];
        const frameStr = match[2];
        const ext = match[3];
        
        // Try to intelligently split base name
        // Look for common patterns like "render", "comp", "shot", etc.
        let actualBase = fullBase;
        
        // If the base ends with underscore or period, use that as delimiter
        if (fullBase.endsWith('_') || fullBase.endsWith('.')) {
          actualBase = fullBase.slice(0, -1);
          const delimiter = fullBase.slice(-1);
          return {
            baseName: actualBase,
            delimiter: delimiter,
            frameNumber: parseInt(frameStr, 10),
            padding: frameStr.length,
            extension: ext,
            fullPath: filename
          };
        }
        
        // Otherwise no delimiter
        return {
          baseName: fullBase,
          delimiter: '',
          frameNumber: parseInt(frameStr, 10),
          padding: frameStr.length,
          extension: ext,
          fullPath: filename
        };
      }
    }
  }
  
  return null;
}

// Group files into sequences
export function detectSequences(files: string[]): Map<string, SequenceInfo> {
  const sequences = new Map<string, SequenceInfo>();
  const nonSequenceFiles: string[] = [];
  
  // First pass: parse all files
  const parsedFrames: ParsedFrame[] = [];
  for (const file of files) {
    const parsed = parseSequenceFrame(file);
    if (parsed) {
      parsedFrames.push(parsed);
    } else {
      nonSequenceFiles.push(file);
    }
  }
  
  // Group by base name, delimiter, padding, and extension
  const groups = new Map<string, ParsedFrame[]>();
  for (const frame of parsedFrames) {
    const key = `${frame.baseName}|${frame.delimiter}|${frame.padding}|${frame.extension}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(frame);
  }
  
  // Check each group to see if it forms a valid sequence
  for (const [key, frames] of groups) {
    if (frames.length < 2) {
      // Single frame, not a sequence
      nonSequenceFiles.push(frames[0].fullPath);
      continue;
    }
    
    // Sort frames by frame number
    frames.sort((a, b) => a.frameNumber - b.frameNumber);
    
    // Check if frames form a reasonable sequence
    // Allow for missing frames but warn if gaps are too large
    const startFrame = frames[0].frameNumber;
    const endFrame = frames[frames.length - 1].frameNumber;
    const expectedCount = endFrame - startFrame + 1;
    const actualCount = frames.length;
    
    
    // If we have at least 50% of expected frames, consider it a sequence
    // Or if we have at least 3 consecutive frames
    const isSequence = (actualCount >= expectedCount * 0.5 && actualCount >= 3) ||
                       hasConsecutiveFrames(frames, 3);
    
    
    if (isSequence) {
      const firstFrame = frames[0];
      const sequenceInfo: SequenceInfo = {
        baseName: firstFrame.baseName,
        padding: firstFrame.padding,
        startFrame: startFrame,
        endFrame: endFrame,
        frameCount: actualCount,
        extension: firstFrame.extension,
        delimiter: firstFrame.delimiter,
        pattern: buildPattern(firstFrame),
        files: frames.map(f => f.fullPath)
      };
      
      // Create a display key for the sequence
      const displayKey = formatSequenceName(sequenceInfo);
      sequences.set(displayKey, sequenceInfo);
    } else {
      // Not a valid sequence, add to non-sequence files
      frames.forEach(f => nonSequenceFiles.push(f.fullPath));
    }
  }
  
  return sequences;
}

// Check if there are at least N consecutive frames
function hasConsecutiveFrames(frames: ParsedFrame[], n: number): boolean {
  let consecutiveCount = 1;
  for (let i = 1; i < frames.length; i++) {
    if (frames[i].frameNumber === frames[i-1].frameNumber + 1) {
      consecutiveCount++;
      if (consecutiveCount >= n) {
        return true;
      }
    } else {
      consecutiveCount = 1;
    }
  }
  return false;
}

// Build a pattern string for the sequence
function buildPattern(frame: ParsedFrame): string {
  const paddingStr = '#'.repeat(frame.padding);
  return `${frame.baseName}${frame.delimiter}${paddingStr}.${frame.extension}`;
}

// Format sequence name for display
export function formatSequenceName(sequence: SequenceInfo): string {
  const range = `[${sequence.startFrame.toString().padStart(sequence.padding, '0')}-${sequence.endFrame.toString().padStart(sequence.padding, '0')}]`;
  return `${sequence.baseName}${sequence.delimiter}${range}.${sequence.extension}`;
}

// Get frame filename from sequence and frame number
export function getFrameFilename(sequence: SequenceInfo, frameNumber: number): string {
  const paddedFrame = frameNumber.toString().padStart(sequence.padding, '0');
  return `${sequence.baseName}${sequence.delimiter}${paddedFrame}.${sequence.extension}`;
}

// Check if a file is an image that could be part of a sequence
export function isSequenceableImage(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase();
  const isSequenceable = ['jpg', 'jpeg', 'png', 'tga', 'exr', 'tif', 'tiff', 'dpx', 'txt'].includes(ext || '');
  // Including .txt for testing sequences
  return isSequenceable;
}