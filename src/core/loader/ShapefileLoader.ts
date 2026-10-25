import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import * as shapefile from 'shapefile';

export interface ShapefileLoadResult {
	features: any[];
	node: THREE.Object3D;
	setResolution: (x: number, y: number) => void;
}

export class ShapefileLoader {
	transform: any;

	constructor() {
		this.transform = null;
	}

	async load(path: string): Promise<ShapefileLoadResult> {
		const matLine = new LineMaterial({
			color: 0xff0000,
			linewidth: 3,
			resolution: new THREE.Vector2(1000, 1000),
			dashed: false
		});

		const features = await this.loadShapefileFeatures(path);
		const node = new THREE.Object3D();

		for (const feature of features) {
			const fnode = this.featureToSceneNode(feature, matLine);
			if (fnode) {
				node.add(fnode);
			}
		}

		const setResolution = (x: number, y: number) => {
			matLine.resolution.set(x, y);
		};

		return {
			features,
			node,
			setResolution,
		};
	}

	featureToSceneNode(feature: any, matLine: LineMaterial): THREE.Object3D | undefined {
		const geometry = feature.geometry;
		let transform = this.transform;
		if (transform === null) {
			transform = { forward: (v: any) => v };
		}

		if (geometry.type === 'Point') {
			const sg = new THREE.SphereGeometry(1, 18, 18);
			const sm = new THREE.MeshNormalMaterial();
			const s = new THREE.Mesh(sg, sm);

			const [long, lat] = geometry.coordinates;
			const pos = transform.forward([long, lat]);

			s.position.set(pos[0], pos[1], 20);
			s.scale.set(10, 10, 10);

			return s;
		} else if (geometry.type === 'LineString') {
			const coordinates: number[] = [];
			const min = new THREE.Vector3(Infinity, Infinity, Infinity);

			for (let i = 0; i < geometry.coordinates.length; i++) {
				const [long, lat] = geometry.coordinates[i];
				const pos = transform.forward([long, lat]);

				min.x = Math.min(min.x, pos[0]);
				min.y = Math.min(min.y, pos[1]);
				min.z = Math.min(min.z, 20);

				coordinates.push(pos[0], pos[1], 20);
				if (i > 0 && i < geometry.coordinates.length - 1) {
					coordinates.push(pos[0], pos[1], 20);
				}
			}

			for (let i = 0; i < coordinates.length; i += 3) {
				coordinates[i + 0] -= min.x;
				coordinates[i + 1] -= min.y;
				coordinates[i + 2] -= min.z;
			}

			const lineGeometry = new LineGeometry();
			lineGeometry.setPositions(coordinates);

			const line = new Line2(lineGeometry, matLine);
			line.computeLineDistances();
			line.scale.set(1, 1, 1);
			line.position.copy(min);

			return line;
		} else if (geometry.type === 'Polygon') {
			for (const pc of geometry.coordinates) {
				const coordinates: number[] = [];
				const min = new THREE.Vector3(Infinity, Infinity, Infinity);

				for (let i = 0; i < pc.length; i++) {
					const [long, lat] = pc[i];
					const pos = transform.forward([long, lat]);

					min.x = Math.min(min.x, pos[0]);
					min.y = Math.min(min.y, pos[1]);
					min.z = Math.min(min.z, 20);

					coordinates.push(pos[0], pos[1], 20);
					if (i > 0 && i < pc.length - 1) {
						coordinates.push(pos[0], pos[1], 20);
					}
				}

				for (let i = 0; i < coordinates.length; i += 3) {
					coordinates[i + 0] -= min.x;
					coordinates[i + 1] -= min.y;
					coordinates[i + 2] -= min.z;
				}

				const lineGeometry = new LineGeometry();
				lineGeometry.setPositions(coordinates);

				const line = new Line2(lineGeometry, matLine);
				line.computeLineDistances();
				line.scale.set(1, 1, 1);
				line.position.copy(min);

				return line;
			}
		}
	}

	async loadShapefileFeatures(file: string): Promise<any[]> {
		const features: any[] = [];
		const source: any = await (shapefile as any).open(file);

		while (true) {
			const result = await source.read();
			if (result.done) {
				break;
			}

			if (result.value && result.value.type === 'Feature' && result.value.geometry !== undefined) {
				features.push(result.value);
			}
		}

		return features;
	}
}
