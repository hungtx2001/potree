import { Copc, Getter } from 'copc';
import { PointCloudEptGeometry, PointCloudCopcGeometry, PointCloudCopcGeometryNode } from '../octree/PointCloudEptGeometry.js';

export class EptLoader {
	static async load(file: string, callback: (geometry: PointCloudEptGeometry) => void): Promise<void> {
		const response = await fetch(file);
		const json = await response.json();

		const url = file.substring(0, file.lastIndexOf('/ept.json'));
		const geometry = new PointCloudEptGeometry(url, json);
		const root = new PointCloudCopcGeometryNode(geometry as any);

		geometry.root = root;
		geometry.root.load();

		callback(geometry);
	}
}

export class CopcLoader {
	static async load(file: string, callback: (geometry: PointCloudCopcGeometry) => void): Promise<void> {
		const url = file;
		const getter = Getter.http(url);
		const copc = await Copc.create(getter);

		const geometry = new PointCloudCopcGeometry(getter, copc);
		const root = new PointCloudCopcGeometryNode(geometry);

		geometry.root = root;
		geometry.root.load();

		callback(geometry);
	}
}
