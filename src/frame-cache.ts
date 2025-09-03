// Frame caching system for smooth sequence playback

export class FrameCache {
  private cache: Map<string, HTMLImageElement>;
  private loadingFrames: Set<string>;
  private maxCacheSize: number;
  private accessOrder: string[];
  private preloadRadius: number;
  
  constructor(maxCacheSize = 100, preloadRadius = 5) {
    this.cache = new Map();
    this.loadingFrames = new Set();
    this.maxCacheSize = maxCacheSize;
    this.accessOrder = [];
    this.preloadRadius = preloadRadius;
  }
  
  // Get a frame from cache or load it
  async getFrame(url: string): Promise<HTMLImageElement> {
    // Update access order
    this.updateAccessOrder(url);
    
    // Check if already cached
    if (this.cache.has(url)) {
      return this.cache.get(url)!;
    }
    
    // Check if already loading
    if (this.loadingFrames.has(url)) {
      // Wait for it to finish loading
      return this.waitForFrame(url);
    }
    
    // Load the frame
    return this.loadFrame(url);
  }
  
  // Preload frames around the current frame
  async preloadFrames(urls: string[], currentIndex: number): Promise<void> {
    const start = Math.max(0, currentIndex - this.preloadRadius);
    const end = Math.min(urls.length - 1, currentIndex + this.preloadRadius);
    
    const preloadPromises: Promise<void>[] = [];
    
    for (let i = start; i <= end; i++) {
      if (i === currentIndex) continue; // Skip current frame (already loading)
      
      const url = urls[i];
      if (!this.cache.has(url) && !this.loadingFrames.has(url)) {
        preloadPromises.push(this.loadFrame(url).then(() => {}));
      }
    }
    
    // Don't await all promises, let them load in background
    Promise.all(preloadPromises).catch(err => {
    });
  }
  
  // Load a single frame
  private async loadFrame(url: string): Promise<HTMLImageElement> {
    this.loadingFrames.add(url);
    
    try {
      const img = new Image();
      
      return new Promise((resolve, reject) => {
        img.onload = () => {
          this.addToCache(url, img);
          this.loadingFrames.delete(url);
          resolve(img);
        };
        
        img.onerror = (err) => {
          this.loadingFrames.delete(url);
          reject(new Error(`Failed to load frame: ${url}`));
        };
        
        // Start loading
        img.src = url;
      });
    } catch (error) {
      this.loadingFrames.delete(url);
      throw error;
    }
  }
  
  // Wait for a frame that's already loading
  private async waitForFrame(url: string): Promise<HTMLImageElement> {
    const maxWait = 10000; // 10 seconds
    const checkInterval = 50; // Check every 50ms
    let waited = 0;
    
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        // Check if loaded
        if (this.cache.has(url)) {
          clearInterval(interval);
          resolve(this.cache.get(url)!);
          return;
        }
        
        // Check if no longer loading (error occurred)
        if (!this.loadingFrames.has(url)) {
          clearInterval(interval);
          // Try loading it ourselves
          this.loadFrame(url).then(resolve).catch(reject);
          return;
        }
        
        // Check timeout
        waited += checkInterval;
        if (waited >= maxWait) {
          clearInterval(interval);
          reject(new Error(`Timeout waiting for frame: ${url}`));
        }
      }, checkInterval);
    });
  }
  
  // Add frame to cache with LRU eviction
  private addToCache(url: string, img: HTMLImageElement): void {
    // Check cache size limit
    if (this.cache.size >= this.maxCacheSize) {
      // Remove least recently used frame
      const lruUrl = this.accessOrder[0];
      this.cache.delete(lruUrl);
      this.accessOrder.shift();
    }
    
    this.cache.set(url, img);
    this.updateAccessOrder(url);
  }
  
  // Update access order for LRU
  private updateAccessOrder(url: string): void {
    const index = this.accessOrder.indexOf(url);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(url);
  }
  
  // Clear the cache
  clear(): void {
    this.cache.clear();
    this.loadingFrames.clear();
    this.accessOrder = [];
  }
  
  // Get cache statistics
  getStats(): { cached: number; loading: number; maxSize: number } {
    return {
      cached: this.cache.size,
      loading: this.loadingFrames.size,
      maxSize: this.maxCacheSize
    };
  }
  
  // Adjust preload radius based on playback speed
  setPreloadRadius(radius: number): void {
    this.preloadRadius = Math.max(1, Math.min(20, radius));
  }
}