import { createBlobDecoderWorker } from '../../workers/embeddedWorkers.js';

export type WorkerFactory = () => Worker;

export class WorkerPool {
	public workers: Record<string, Worker[]> = {};
	public workerUrls: Record<string, string> = {};
	public workerFactories: Record<string, WorkerFactory> = {};

	public registerWorkerFactory(name: string, factory: WorkerFactory): void {
		this.workerFactories[name] = factory;
	}

	public setWorkerUrl(name: string, url: string): void {
		this.workerUrls[name] = url;
	}

	public getWorker(urlOrType: string): Worker {
		const key = urlOrType;
		if (!this.workers[key]) {
			this.workers[key] = [];
		}

		if (this.workers[key].length === 0) {
			let worker: Worker | undefined;
			const baseName = typeof key === 'string' ? key.split('/').pop()?.replace(/\.c?js$/, '') || '' : '';
			const factory = this.workerFactories[key] || this.workerFactories[baseName];

			if (factory) {
				try {
					worker = factory();
				} catch (_err) {
					// Fall through to URL or embedded
				}
			}

			if (!worker) {
				const target = this.workerUrls[key] || this.workerUrls[baseName];
				if (target) {
					try {
						worker = new Worker(target, { type: 'module' });
					} catch (_e) {
						try {
							worker = new Worker(target);
						} catch (_err) {}
					}
				}
			}

			// Embedded in-memory worker fallback (zero-config, zero-404, offline)
			if (!worker && (baseName === 'DecoderWorker' || key === 'DecoderWorker')) {
				worker = createBlobDecoderWorker() || undefined;
			}

			if (!worker) {
				const target = key;
				try {
					worker = new Worker(target, { type: 'module' });
				} catch (_e) {
					worker = new Worker(target);
				}
			}
			this.workers[key].push(worker);
		}

		return this.workers[key].pop()!;
	}

	public returnWorker(urlOrType: string, worker: Worker): void {
		if (!this.workers[urlOrType]) {
			this.workers[urlOrType] = [];
		}
		this.workers[urlOrType].push(worker);
	}
}
