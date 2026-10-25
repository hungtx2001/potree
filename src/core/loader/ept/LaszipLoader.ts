import * as THREE from 'three';
import { workerPool, runtime } from '../../runtime/runtime.js';
import { Key, Bounds, Las } from 'copc';

export class EptLazBatcher {
	node: any;

	constructor(node: any) {
		this.node = node;
	}

	push(las: any): void {
		const { isFullFile, compressed, header, eb, pointCount, nodemin } = las;

		const workerPath = runtime.scriptPath + '/workers/EptLaszipDecoderWorker.js';
		const worker = workerPool.getWorker(workerPath);
		const pointAttributes = this.node.owner.pointAttributes;

		worker.onmessage = (e: MessageEvent) => {
			const g = new THREE.BufferGeometry();

			const positions = new Float32Array(e.data.position);
			const colors = new Uint8Array(e.data.color);
			const intensities = new Float32Array(e.data.intensity);
			const classifications = new Uint8Array(e.data.classification);
			const returnNumbers = new Uint8Array(e.data.returnNumber);
			const numberOfReturns = new Uint8Array(e.data.numberOfReturns);
			const pointSourceIds = new Uint16Array(e.data.pointSourceId);
			const indices = new Uint8Array(e.data.indices);
			const gpsTime = new Float32Array(e.data.gpsTime);

			g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
			g.setAttribute('rgba', new THREE.BufferAttribute(colors, 4, true));
			g.setAttribute('intensity', new THREE.BufferAttribute(intensities, 1));
			g.setAttribute('classification', new THREE.BufferAttribute(classifications, 1));
			g.setAttribute('return number', new THREE.BufferAttribute(returnNumbers, 1));
			g.setAttribute('number of returns', new THREE.BufferAttribute(numberOfReturns, 1));
			g.setAttribute('source id', new THREE.BufferAttribute(pointSourceIds, 1));
			g.setAttribute('indices', new THREE.BufferAttribute(indices, 4, true));
			g.setAttribute('gps-time', new THREE.BufferAttribute(gpsTime, 1));
			this.node.gpsTime = e.data.gpsMeta;

			for (const key in e.data.ranges) {
				const range = e.data.ranges[key];
				const attribute = pointAttributes?.attributes?.find((a: any) => a.name === key);
				if (attribute) {
					attribute.range[0] = Math.min(attribute.range[0], range[0]);
					attribute.range[1] = Math.max(attribute.range[1], range[1]);

					if (!attribute.initialRange) {
						attribute.initialRange = attribute.range;
					}
				}
			}

			const tightBoundingBox = new THREE.Box3(
				new THREE.Vector3().fromArray(e.data.tightBoundingBox.min),
				new THREE.Vector3().fromArray(e.data.tightBoundingBox.max)
			);

			this.node.doneLoading(
				g,
				tightBoundingBox,
				pointCount,
				new THREE.Vector3(...e.data.mean)
			);

			workerPool.returnWorker(workerPath, worker);
		};

		const message = { isFullFile, compressed, header, eb, pointCount, nodemin };
		worker.postMessage(message, [message.compressed]);
	}
}

export class EptLaszipLoader {
	async load(node: any): Promise<void> {
		if (node.loaded) return;

		const url = `${node.owner.base}/ept-data/${Key.toString(node.key)}.laz`;
		const response = await fetch(url);
		const buffer = await response.arrayBuffer();
		this.parse(node, buffer);
	}

	async parse(node: any, compressed: ArrayBuffer): Promise<void> {
		const handler = new EptLazBatcher(node);

		try {
			const get = async (begin: number, end: number) => new Uint8Array(compressed, begin, end - begin);
			const header = Las.Header.parse(new Uint8Array(compressed));
			const vlrs = await Las.Vlr.walk(get, header);
			let eb: any[] = [];
			const ebVlr = Las.Vlr.find(vlrs, 'LASF_Spec', 4);
			if (ebVlr) eb = Las.ExtraBytes.parse(await Las.Vlr.fetch(get, ebVlr));

			const message = {
				isFullFile: true,
				compressed,
				header,
				eb,
				pointCount: header.pointCount,
				nodemin: Bounds.min(node.bounds)
			};
			handler.push(message);
		} catch (e) {
			console.log('Failed:', e);
		}
	}
}

export class CopcLaszipLoader {
	async load(node: any): Promise<void> {
		if (node.loaded) return;

		const { pointCount, pointDataOffset, pointDataLength } = node.nodeinfo;
		if (!pointCount) return this.parse(node, new ArrayBuffer(0));

		const compressed = await node.owner.getter(pointDataOffset, pointDataOffset + pointDataLength);
		this.parse(node, compressed.buffer);
	}

	async parse(node: any, compressed: ArrayBuffer): Promise<void> {
		const handler = new EptLazBatcher(node);

		try {
			handler.push({
				isFullFile: false,
				compressed,
				header: node.owner.copc.header,
				eb: node.owner.copc.eb,
				pointCount: node.nodeinfo.pointCount,
				nodemin: node.bounds.slice(0, 3)
			});
		} catch (e) {
			console.log('Failed:', e);
		}
	}
}
