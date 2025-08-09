// Image sequence player component

import { FrameCache } from './frame-cache';
import { SequenceInfo, getFrameFilename } from './sequence-utils';
// Removed timecode formatting since we display frames in UI

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
  private loopMode: 'single' | 'loop' | 'pingpong' = 'loop';
  private playDirection: 1 | -1 = 1;
  
  // UI Elements
  private playBtn: HTMLButtonElement | null = null;
  private timelineElement: HTMLElement | null = null;
  private timelineHandle: HTMLElement | null = null;
  private frameLabel: HTMLElement | null = null;
  private fpsSelector: HTMLSelectElement | null = null; // Legacy; not used with custom dropdown
  
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
                <div class="timeline-playhead-label">0</div>
                <div class="timeline-playhead-line"></div>
              </div>
            </div>
          </div>
          <span class="video-time-label" style="font-size: 12px; color: var(--color-text-secondary); min-width: 120px; margin: 0 8px;">0 / 0</span>
          <div class="fps-dropdown" data-action="fps" aria-haspopup="listbox" aria-expanded="false">
            <button class="fps-button" type="button" aria-label="Frames per second">
              <span class="fps-current">24 fps</span>
              <svg class="fps-caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 15 12 9 18 15"></polyline></svg>
            </button>
            <ul class="fps-menu" role="listbox" tabindex="-1" hidden>
              <li role="option" data-fps="12">12 fps</li>
              <li role="option" data-fps="24" aria-selected="true">24 fps</li>
              <li role="option" data-fps="25">25 fps</li>
              <li role="option" data-fps="30">30 fps</li>
              <li role="option" data-fps="48">48 fps</li>
              <li role="option" data-fps="60">60 fps</li>
            </ul>
          </div>
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
    this.fpsSelector = null;
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
    
    // FPS dropdown (custom)
    const fpsDropdown = this.container.querySelector('.fps-dropdown') as HTMLElement | null;
    const fpsButton = this.container.querySelector('.fps-button') as HTMLButtonElement | null;
    const fpsMenu = this.container.querySelector('.fps-menu') as HTMLElement | null;
    const fpsLabel = this.container.querySelector('.fps-current') as HTMLElement | null;

    const setFps = (value: number) => {
      if (Number.isFinite(value) && value > 0) {
        this.fps = value;
        if (fpsLabel) fpsLabel.textContent = `${value} fps`;
        // Update menu selection state
        fpsMenu?.querySelectorAll('[role="option"]').forEach((el) => {
          const opt = el as HTMLElement;
          if (opt.getAttribute('data-fps') === String(value)) {
            opt.setAttribute('aria-selected', 'true');
          } else {
            opt.removeAttribute('aria-selected');
          }
        });
      }
    };

    const openMenu = () => {
      if (!fpsDropdown || !fpsMenu) return;
      fpsMenu.hidden = false;
      fpsDropdown.setAttribute('aria-expanded', 'true');
      fpsMenu.focus();
    };
    const closeMenu = () => {
      if (!fpsDropdown || !fpsMenu) return;
      fpsMenu.hidden = true;
      fpsDropdown.setAttribute('aria-expanded', 'false');
    };

    fpsButton?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (fpsMenu?.hidden) openMenu(); else closeMenu();
    });

    fpsMenu?.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest('[role="option"]') as HTMLElement | null;
      if (!target) return;
      const value = parseInt(target.getAttribute('data-fps') || '24', 10);
      setFps(value);
      closeMenu();
    });

    document.addEventListener('click', (e) => {
      if (!fpsDropdown) return;
      if (!(e.target as HTMLElement).closest('.fps-dropdown')) closeMenu();
    });

    fpsMenu?.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMenu();
        fpsButton?.focus();
      }
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

    // Loop mode toggle
    const loopBtn = this.container.querySelector('[data-action="loop"]') as HTMLButtonElement | null;
    loopBtn?.addEventListener('click', () => {
      this.cycleLoopMode();
    });

    // Initialize loop button UI
    this.updateLoopButtonUI();
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

    // If in single-play mode and we're at the end, restart from the beginning
    const lastIndex = this.sequence.frameCount - 1;
    if (this.loopMode === 'single' && this.currentFrame >= lastIndex) {
      this.goToFrame(0);
    }
    // Always start forward when (re)playing
    this.playDirection = 1;
    
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
      // Advance by one frame honoring loop mode and direction
      this.stepFrame();
      this.lastFrameTime = currentTime - (deltaTime % frameDuration);
    }
    
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  // Advance one frame according to loop mode and play direction
  private stepFrame(): void {
    if (!this.sequence) return;
    const lastIndex = this.sequence.frameCount - 1;
    let nextIndex = this.currentFrame + this.playDirection;

    if (nextIndex > lastIndex) {
      if (this.loopMode === 'loop') {
        nextIndex = 0;
      } else if (this.loopMode === 'pingpong') {
        this.playDirection = -1;
        nextIndex = Math.max(0, lastIndex - 1);
      } else {
        this.pause();
        return;
      }
    } else if (nextIndex < 0) {
      if (this.loopMode === 'loop') {
        nextIndex = lastIndex;
      } else if (this.loopMode === 'pingpong') {
        this.playDirection = 1;
        nextIndex = Math.min(lastIndex, 1);
      } else {
        this.pause();
        return;
      }
    }

    this.displayFrame(nextIndex);
  }
  
  // Go to next frame
  nextFrame(): void {
    if (!this.sequence) return;
    
    let nextFrame = this.currentFrame + 1;
    
    if (nextFrame >= this.sequence.frameCount) {
      if (this.loopMode === 'loop') nextFrame = 0; else return;
    }
    
    this.displayFrame(nextFrame);
  }
  
  // Go to previous frame
  previousFrame(): void {
    if (!this.sequence) return;
    
    let prevFrame = this.currentFrame - 1;
    
    if (prevFrame < 0) {
      if (this.loopMode === 'loop') prevFrame = this.sequence.frameCount - 1; else return;
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

    if (this.frameLabel) {
      const currentFrameNumber = this.sequence.startFrame + this.currentFrame;
      const totalFrameNumber = this.sequence.endFrame;
      this.frameLabel.textContent = `${currentFrameNumber} / ${totalFrameNumber}`;
    }
    
    // Update timeline position
    if (this.timelineHandle) {
      const percentage = (this.currentFrame / Math.max(1, this.sequence.frameCount - 1)) * 100;
      this.timelineHandle.style.left = `${percentage}%`;
      
      // Update playhead label (time)
      const label = this.timelineHandle.querySelector('.timeline-playhead-label');
      if (label) {
        const frameNumber = (this.sequence?.startFrame ?? 0) + this.currentFrame;
        (label as HTMLElement).textContent = frameNumber.toString();
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
    
    // Subtle high-fidelity subticks: 1/5th of main interval (at least 1)
    let subTickInterval = Math.max(1, Math.floor(tickInterval / 5));
    if (tickInterval >= 50) subTickInterval = Math.max(1, Math.floor(tickInterval / 10));
    if (subTickInterval > 0) {
      for (let i = 0; i < frameCount; i += subTickInterval) {
        if (i % tickInterval === 0) continue; // skip where main ticks will render
        const sub = document.createElement('div');
        sub.className = 'timeline-subtick';
        const percentage = (i / (frameCount - 1)) * 100;
        sub.style.left = `${percentage}%`;
        ticksContainer.appendChild(sub);
      }
    }
    
    // Generate main ticks with labels at ~120px apart for readability
    const timelineWidth = (this.timelineElement as HTMLElement).getBoundingClientRect().width || 1;
    const approxLabelPx = 120;
    const labelEveryN = Math.max(1, Math.round((approxLabelPx / timelineWidth) * (frameCount - 1)));
    for (let i = 0; i < frameCount; i += tickInterval) {
      const tick = document.createElement('div');
      tick.className = 'timeline-tick';
      const percentage = (i / (frameCount - 1)) * 100;
      tick.style.left = `${percentage}%`;
      
      // Major tick roughly every labelEveryN frames
      if (i % Math.max(tickInterval, labelEveryN) === 0) {
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

  // Cycle loop modes: single -> loop -> pingpong -> single
  private cycleLoopMode(): void {
    if (this.loopMode === 'single') this.loopMode = 'loop';
    else if (this.loopMode === 'loop') this.loopMode = 'pingpong';
    else this.loopMode = 'single';
    this.updateLoopButtonUI();
  }

  // Update the loop button icon/title based on mode
  private updateLoopButtonUI(): void {
    const loopBtn = this.container.querySelector('[data-action="loop"]') as HTMLElement | null;
    if (!loopBtn) return;
    let icon = 'repeat';
    let title = 'Loop';
    if (this.loopMode === 'pingpong') { icon = 'arrow-right-left'; title = 'Ping-Pong'; }
    if (this.loopMode === 'single') { icon = 'move-right'; title = 'Single play'; }

    // Fallbacks if certain Lucide icons are unavailable
    const lucideGlobal = (window as any).lucide;
    const ensureIcon = (name: string, fallback: string): string => {
      try {
        return lucideGlobal?.icons && lucideGlobal.icons[name] ? name : fallback;
      } catch { return fallback; }
    };
    if (this.loopMode === 'pingpong') icon = ensureIcon(icon, 'arrow-left-right');
    if (this.loopMode === 'single') icon = ensureIcon(icon, 'move-right');

    loopBtn.innerHTML = `<i data-lucide="${icon}" width="16" height="16"></i>`;
    loopBtn.setAttribute('title', title);
    if (lucideGlobal) {
      lucideGlobal.createIcons();
    }
  }
  
  // Clean up
  destroy(): void {
    this.pause();
    this.frameCache.clear();
    this.container.innerHTML = '';
  }
}