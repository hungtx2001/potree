
import { createBlobDecoderWorker } from './workers/embeddedWorkers.js';

export class WorkerPool{
	constructor(){
		this.workers = {};
		this.workerUrls = {};
		this.workerFactories = {};
	}

	registerWorkerFactory(name, factory){
		this.workerFactories[name] = factory;
	}

	setWorkerUrl(name, url){
		this.workerUrls[name] = url;
	}

	getWorker(urlOrType){
		const key = urlOrType;
		if (!this.workers[key]){
			this.workers[key] = [];
		}

		if (this.workers[key].length === 0){
			let worker;
			const baseName = typeof key === 'string' ? key.split('/').pop().replace(/\.c?js$/, '') : '';
			const factory = this.workerFactories[key] || this.workerFactories[baseName];

			if (factory) {
				try {
					worker = factory();
				} catch (err) {
					// Fall through to URL or embedded
				}
			}

			if (!worker) {
				const target = this.workerUrls[key] || this.workerUrls[baseName];
				if (target) {
					try {
						worker = new Worker(target, { type: 'module' });
					} catch (e) {
						try {
							worker = new Worker(target);
						} catch (err) {}
					}
				}
			}

			// Embedded in-memory worker fallback (zero-config, zero-404, offline)
			if (!worker && (baseName === 'DecoderWorker' || key === 'DecoderWorker')) {
				worker = createBlobDecoderWorker();
			}

			if (!worker) {
				const target = key;
				try {
					worker = new Worker(target, { type: 'module' });
				} catch (e) {
					worker = new Worker(target);
				}
			}
			this.workers[key].push(worker);
		}

		let worker = this.workers[key].pop();

		return worker;
	}

	returnWorker(urlOrType, worker){
		if (!this.workers[urlOrType]){
			this.workers[urlOrType] = [];
		}
		this.workers[urlOrType].push(worker);
	}
};

//Potree.workerPool = new Potree.WorkerPool();
