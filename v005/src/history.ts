// History management for undo/redo functionality
import { HistoryState } from './types';

export class History {
  private stack: HistoryState[] = [];
  private index: number = -1;
  private maxSize: number = 50;

  constructor(maxSize: number = 50) {
    this.maxSize = maxSize;
  }

  add(state: HistoryState): void {
    // Remove any states after current index
    this.stack = this.stack.slice(0, this.index + 1);
    
    // Add new state
    this.stack.push(state);
    this.index++;
    
    // Limit stack size
    if (this.stack.length > this.maxSize) {
      this.stack.shift();
      this.index--;
    }
    
    this.updateButtons();
  }

  undo(): HistoryState | null {
    if (!this.canUndo()) return null;
    this.index--;
    this.updateButtons();
    return this.stack[this.index];
  }

  redo(): HistoryState | null {
    if (!this.canRedo()) return null;
    this.index++;
    this.updateButtons();
    return this.stack[this.index];
  }

  canUndo(): boolean {
    return this.index > 0;
  }

  canRedo(): boolean {
    return this.index < this.stack.length - 1;
  }

  private updateButtons(): void {
    const undoBtn = document.getElementById('header-undo-btn') as HTMLButtonElement;
    const redoBtn = document.getElementById('header-redo-btn') as HTMLButtonElement;
    
    if (undoBtn) {
      undoBtn.disabled = !this.canUndo();
    }
    
    if (redoBtn) {
      redoBtn.disabled = !this.canRedo();
    }
  }

  getCurrentState(): HistoryState | null {
    return this.index >= 0 ? this.stack[this.index] : null;
  }

  clear(): void {
    this.stack = [];
    this.index = -1;
    this.updateButtons();
  }
}