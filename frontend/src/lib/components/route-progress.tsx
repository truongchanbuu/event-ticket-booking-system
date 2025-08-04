type Listener = (active: boolean) => void;

class RouteProgress {
  private listeners = new Set<Listener>();
  private active = false;
  private minVisible = 250;
  private startAt = 0;
  private hideTimer: any = null;

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    fn(this.active);
    return () => {
      this.listeners.delete(fn);
    };
  }

  start() {
    if (this.active) return;
    this.active = true;
    this.startAt = Date.now();
    this.emit();
  }

  done() {
    if (!this.active) return;
    const elapsed = Date.now() - this.startAt;
    const left = this.minVisible - elapsed;
    if (left > 0) {
      clearTimeout(this.hideTimer);
      this.hideTimer = setTimeout(() => {
        this.active = false;
        this.emit();
      }, left);
    } else {
      this.active = false;
      this.emit();
    }
  }

  private emit() {
    this.listeners.forEach((l) => l(this.active));
  }
}

export const routeProgress = new RouteProgress();
