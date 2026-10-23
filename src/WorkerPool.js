
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
			if (this.workerFactories[key]) {
				worker = this.workerFactories[key]();
			} else {
				const target = this.workerUrls[key] || key;
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
