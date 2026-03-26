export class WorkerPool {
  constructor() {
    this.workers = {};
  }

  // Pre-warm the worker pool with multiple workers for a given script URL.
  // Call this once when first loading a point cloud to enable parallel decoding.
  warmup(url, count) {
    count = count || Math.min(navigator.hardwareConcurrency || 4, 8);
    if (!this.workers[url]) {
      this.workers[url] = [];
    }
    while (this.workers[url].length < count) {
      this.workers[url].push(new Worker(url));
    }
  }

  getWorker(url) {
    if ( !this.workers[url] ) {
      this.workers[url] = [];
    }

    if ( this.workers[url].length === 0 ) {
      let worker = new Worker(url);
      this.workers[url].push(worker);
    }

    let worker = this.workers[url].pop();

    return worker;
  }

  returnWorker(url, worker) {
    this.workers[url].push(worker);
  }
}

