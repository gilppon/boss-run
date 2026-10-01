// React UI <-> Phaser 씬 사이의 아주 작은 이벤트 버스
/* eslint-disable @typescript-eslint/no-explicit-any */
type Handler = (...args: any[]) => void;

class Bus {
  private handlers = new Map<string, Set<Handler>>();

  on(event: string, fn: Handler): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(fn);
    return () => this.off(event, fn);
  }

  off(event: string, fn: Handler) {
    this.handlers.get(event)?.delete(fn);
  }

  emit(event: string, ...args: any[]) {
    this.handlers.get(event)?.forEach((fn) => fn(...args));
  }
}

export const bus = new Bus();
