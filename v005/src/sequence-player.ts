// Image sequence player component

import { FrameCache } from './frame-cache';
import { SequenceInfo, getFrameFilename } from './sequence-utils';

export class ImageSequencePlayer {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private frameCache: FrameCache;
  
  private sequence: SequenceInfo | null = null;
  private frameUrls: string[] = [];
  private currentFrame: number = 0;
  private isPlaying: boolean = false;
  private fps: number = 24;
  private lastFrameTime: number = 0;
  private animationId: number | null = null;
  
  // UI Elements
  private playBtn: HTMLButtonElement | null = null;
  private timelineElement: HTMLElement | null = null;
  private timelineHandle: HTMLElement | null = null;
  private frameLabel: HTMLElement | null = null;
  private fpsSelector: HTMLSelectElement | null = null;
  
  // Callbacks
  private onFrameChange?: (frame: number) => void;
  
  constructor(container: HTMLElement) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.frameCache = new FrameCache(100, 5);
    
    this.setupUI();
    this.setupEventListeners();
  }
  
  // Set up the player UI
  private setupUI(): void {
    this.container.innerHTML = `
      <div class="video-player" style="display: flex; flex-direction: column; height: 100%;">
        <div class="sequence-viewport" style="flex: 1; width: 100%; background: #000; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative;">
          <canvas class="sequence-canvas" style="max-width: 100%; max-height: 100%; object-fit: contain;"></canvas>
          <div class="sequence-loading" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; display: none;">
            Loading frame...
          </div>
        </div>
        <div class="video-controls" style="display: flex; align-items: center; padding: 8px; background: var(--bg-secondary); border-top: 1px solid var(--border-color);">
          <button class="btn btn-sm" data-action="play">
            <i data-lucide="play" width="16" height="16"></i>
          </button>
          <button class="btn btn-sm" data-action="prev-frame" title="Previous Frame (Left Arrow)">
            <i data-lucide="skip-back" width="16" height="16"></i>
          </button>
          <button class="btn btn-sm" data-action="next-frame" title="Next Frame (Right Arrow)">
            <i data-lucide="skip-forward" width="16" height="16"></i>
          </button>
          <div class="timeline" style="flex: 1; margin: 0 12px;">
            <div class="timeline-ticks"></div>
            <div class="timeline-track">
              <div class="timeline-progress"></div>
              <div class="timeline-handle" style="left: 0%;">
                <div class="timeline-playhead-label">0:00</div>
                <div class="timeline-playhead-line"></div>
              </div>
            </div>
          </div>
          <span class="video-time-label" style="font-size: 12px; color: var(--color-text-secondary); min-width: 120px; margin: 0 8px;">0:00 / 0:00</span>
          <select class="form-select form-select-sm" data-action="fps" style="width: 80px;">
            <option value="12">12 fps</option>
            <option value="24" selected>24 fps</option>
            <option value="25">25 fps</option>
            <option value="30">30 fps</option>
            <option value="48">48 fps</option>
            <option value="60">60 fps</option>
          </select>
          <button class="btn btn-sm" data-action="loop" title="Loop">
            <i data-lucide="repeat" width="16" height="16"></i>
          </button>
        </div>
      </div>
    `;
    
    // Get canvas reference
    const canvasElement = this.container.querySelector('.sequence-canvas') as HTMLCanvasElement;
    if (canvasElement) {
      this.canvas = canvasElement;
      this.ctx = this.canvas.getContext('2d')!;
    }
    
    // Get UI element references
    this.playBtn = this.container.querySelector('[data-action="play"]');
    this.timelineElement = this.container.querySelector('.timeline');
    this.timelineHandle = this.container.querySelector('.timeline-handle');
    this.frameLabel = this.container.querySelector('.video-time-label');
    this.fpsSelector = this.container.querySelector('[data-action="fps"]');
  }
  
  // Set up event listeners
  private setupEventListeners(): void {
    // Play/pause button
    this.playBtn?.addEventListener('click', () => {
      if (this.isPlaying) {
        this.pause();
      } else {
        this.play();
      }
    });
    
    // Frame navigation
    this.container.querySelector('[data-action="prev-frame"]')?.addEventListener('click', () => {
      this.previousFrame();
    });
    
    this.container.querySelector('[data-action="next-frame"]')?.addEventListener('click', () => {
      this.nextFrame();
    });
    
    // FPS selector
    this.fpsSelector?.addEventListener('change', (e) => {
      this.fps = parseInt((e.target as HTMLSelectElement).value);
    });
    
    // Timeline scrubbing
    let isDragging = false;
    
    this.timelineElement?.addEventListener('mousedown', (e) => {
      isDragging = true;
      this.handleTimelineClick(e as MouseEvent);
    });
    
    document.addEventListener('mousemove', (e) => {
      if (isDragging && this.timelineElement) {
        this.handleTimelineClick(e);
      }
    });
    
    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
    
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
      // Only handle if sequence player is visible
      if (!this.container.offsetParent) return;
      
      switch(e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          this.previousFrame();
          break;
        case 'ArrowRight':
          e.preventDefault();
          this.nextFrame();
          break;
        case ' ':
          e.preventDefault();
          if (this.isPlaying) {
            this.pause();
          } else {
            this.play();
          }
          break;
        case 'Home':
          e.preventDefault();
          this.goToFrame(0);
          break;
        case 'End':
          e.preventDefault();
          if (this.sequence) {
            this.goToFrame(this.sequence.frameCount - 1);
          }
          break;
      }
    });
  }
  
  // Load a sequence
  async loadSequence(sequence: SequenceInfo, baseUrl: string = '', providedUrls?: string[]): Promise<void> {
    this.sequence = sequence;
    this.currentFrame = 0;
    this.frameUrls = [];
    
    // Clear cache for new sequence
    this.frameCache.clear();
    
    if (providedUrls) {
      // Use provided URLs (e.g., blob URLs from dropped files)
      this.frameUrls = providedUrls;
    } else {
      // Generate frame URLs from sequence info
      for (let i = sequence.startFrame; i <= sequence.endFrame; i++) {
        const filename = getFrameFilename(sequence, i);
        const url = baseUrl ? `${baseUrl}/${filename}` : filename;
        this.frameUrls.push(url);
      }
    }
    
    // Load and display first frame
    await this.displayFrame(0);
    
    // Start preloading nearby frames
    this.frameCache.preloadFrames(this.frameUrls, 0);
    
    // Update UI
    this.updateUI();
    
    // Generate timeline ticks
    this.generateTimelineTicks();
  }
  
  // Display a specific frame
  private async displayFrame(frameIndex: number): Promise<void> {
    if (!this.sequence || frameIndex < 0 || frameIndex >= this.frameUrls.length) {
      return;
    }
    
    const url = this.frameUrls[frameIndex];
    
    // Show loading indicator
    const loadingElement = this.container.querySelector('.sequence-loading') as HTMLElement;
    if (loadingElement) {
      loadingElement.style.display = 'block';
    }
    
    try {
      const img = await this.frameCache.getFrame(url);
      
      // Set canvas size to match image
      if (this.canvas.width !== img.width || this.canvas.height !== img.height) {
        this.canvas.width = img.width;
        this.canvas.height = img.height;
      }
      
      // Clear and draw new frame
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(img, 0, 0);
      
      // Hide loading indicator
      if (loadingElement) {
        loadingElement.style.display = 'none';
      }
      
      // Preload nearby frames
      this.frameCache.preloadFrames(this.frameUrls, frameIndex);
      
      // Update current frame
      this.currentFrame = frameIndex;
      this.updateUI();
      
      // Call callback if set
      if (this.onFrameChange) {
        this.onFrameChange(this.sequence.startFrame + frameIndex);
      }
    } catch (error) {
      if (loadingElement) {
        loadingElement.textContent = 'Error loading frame';
      }
    }
  }
  
  // Play the sequence
  play(): void {
    if (this.isPlaying || !this.sequence) return;
    
    this.isPlaying = true;
    this.lastFrameTime = performance.now();
    
    // Update play button icon
    if (this.playBtn) {
      this.playBtn.innerHTML = '<i data-lucide="pause" width="16" height="16"></i>';
      // Re-initialize Lucide icons
      if (typeof (window as any).lucide !== 'undefined') {
        (window as any).lucide.createIcons();
      }
    }
    
    this.animate();
  }
  
  // Pause playback
  pause(): void {
    this.isPlaying = false;
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    // Update play button icon
    if (this.playBtn) {
      this.playBtn.innerHTML = '<i data-lucide="play" width="16" height="16"></i>';
      // Re-initialize Lucide icons
      if (typeof (window as any).lucide !== 'undefined') {
        (window as any).lucide.createIcons();
      }
    }
  }
  
  // Animation loop
  private animate(): void {
    if (!this.isPlaying || !this.sequence) return;
    
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;
    const frameDuration = 1000 / this.fps;
    
    if (deltaTime >= frameDuration) {
      // Time for next frame
      this.nextFrame(true);
      this.lastFrameTime = currentTime - (deltaTime % frameDuration);
    }
    
    this.animationId = requestAnimationFrame(() => this.animate());
  }
  
  // Go to next frame
  nextFrame(isPlaying: boolean = false): void {
    if (!this.sequence) return;
    
    let nextFrame = this.currentFrame + 1;
    
    if (nextFrame >= this.sequence.frameCount) {
      // Check if loop is enabled
      const loopBtn = this.container.querySelector('[data-action="loop"]') as HTMLElement;
      if (loopBtn?.classList.contains('active') || isPlaying) {
        nextFrame = 0; // Loop back to start
      } else {
        if (isPlaying) {
          this.pause(); // Stop at end if not looping
        }
        return;
      }
    }
    
    this.displayFrame(nextFrame);
  }
  
  // Go to previous frame
  previousFrame(): void {
    if (!this.sequence) return;
    
    let prevFrame = this.currentFrame - 1;
    
    if (prevFrame < 0) {
      // Check if loop is enabled
      const loopBtn = this.container.querySelector('[data-action="loop"]') as HTMLElement;
      if (loopBtn?.classList.contains('active')) {
        prevFrame = this.sequence.frameCount - 1; // Loop to end
      } else {
        return;
      }
    }
    
    this.displayFrame(prevFrame);
  }
  
  // Go to specific frame
  goToFrame(frameIndex: number): void {
    if (!this.sequence) return;
    
    frameIndex = Math.max(0, Math.min(this.sequence.frameCount - 1, frameIndex));
    this.displayFrame(frameIndex);
  }
  
  // Handle timeline click/drag
  private handleTimelineClick(e: MouseEvent): void {
    if (!this.timelineElement || !this.sequence) return;
    
    const rect = this.timelineElement.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const frameIndex = Math.floor((percentage / 100) * this.sequence.frameCount);
    
    this.goToFrame(frameIndex);
  }
  
  // Update UI elements
  private updateUI(): void {
    if (!this.sequence) return;
    
    // Update time label to match video style (mm:ss / mm:ss)
    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (this.frameLabel) {
      const currentSeconds = this.currentFrame / Math.max(1, this.fps);
      const totalSeconds = (Math.max(1, this.sequence.frameCount) - 1) / Math.max(1, this.fps);
      this.frameLabel.textContent = `${formatTime(currentSeconds)} / ${formatTime(totalSeconds)}`;
    }
    
    // Update timeline position
    if (this.timelineHandle) {
      const percentage = (this.currentFrame / Math.max(1, this.sequence.frameCount - 1)) * 100;
      this.timelineHandle.style.left = `${percentage}%`;
      
      // Update playhead label (time)
      const label = this.timelineHandle.querySelector('.timeline-playhead-label');
      if (label) {
        const currentSeconds = this.currentFrame / Math.max(1, this.fps);
        (label as HTMLElement).textContent = formatTime(currentSeconds);
      }
    }
    
    // Update progress bar
    const progress = this.timelineElement?.querySelector('.timeline-progress') as HTMLElement;
    if (progress) {
      const percentage = (this.currentFrame / Math.max(1, this.sequence.frameCount - 1)) * 100;
      progress.style.width = `${percentage}%`;
    }
  }
  
  // Generate timeline ticks
  private generateTimelineTicks(): void {
    const ticksContainer = this.container.querySelector('.timeline-ticks') as HTMLElement;
    if (!ticksContainer || !this.sequence) return;
    
    ticksContainer.innerHTML = '';
    
    // Determine tick interval based on sequence length
    const frameCount = this.sequence.frameCount;
    let tickInterval = 1;
    
    if (frameCount > 1000) tickInterval = 100;
    else if (frameCount > 500) tickInterval = 50;
    else if (frameCount > 200) tickInterval = 25;
    else if (frameCount > 100) tickInterval = 10;
    else if (frameCount > 50) tickInterval = 5;
    
    // Generate ticks
    for (let i = 0; i < frameCount; i += tickInterval) {
      const tick = document.createElement('div');
      tick.className = 'timeline-tick';
      const percentage = (i / (frameCount - 1)) * 100;
      tick.style.left = `${percentage}%`;
      
      // Major tick every 10 intervals
      if (i % (tickInterval * 10) === 0) {
        tick.classList.add('major');
        
        // Add frame number label
        const label = document.createElement('span');
        label.className = 'tick-label';
        label.textContent = (this.sequence.startFrame + i).toString();
        tick.appendChild(label);
      }
      
      ticksContainer.appendChild(tick);
    }
  }
  
  // Clean up
  destroy(): void {
    this.pause();
    this.frameCache.clear();
    this.container.innerHTML = '';
  }
}