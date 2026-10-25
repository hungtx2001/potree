import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { Utils } from '../utils/Utils.js';
import { runtime } from '../runtime/runtime.js';

const defaultColors: Record<string, [number, number, number]> = {
	landuse:   [0.5, 0.5, 0.5],
	natural:   [0.0, 1.0, 0.0],
	places:    [1.0, 0.0, 1.0],
	points:    [0.0, 1.0, 1.0],
	roads:     [1.0, 1.0, 0.0],
	waterways: [0.0, 0.0, 1.0],
	default:   [0.9, 0.6, 0.1],
};

function getColor(feature: string): [number, number, number] {
	return defaultColors[feature] || defaultColors.default;
}

export class Geopackage {
	path: string | null;
	node: THREE.Object3D | null;

	constructor() {
		this.path = null;
		this.node = null;
	}
}

export class GeoPackageLoader {
	static async loadUrl(url: string, params: any = {}): Promise<Geopackage> {
		const result = await fetch(url);
		const buffer = await result.arrayBuffer();

		params = params || {};
		params.source = url;

		return GeoPackageLoader.loadBuffer(buffer, params);
	}

	static async loadBuffer(buffer: ArrayBuffer, params: any = {}): Promise<Geopackage> {
		params = params || {};

		const resolver = async (resolve: (geo: Geopackage) => void) => {
			let transform = params.transform;
			if (!transform) {
				transform = { forward: (arg: any) => arg };
			}

			const u8 = new Uint8Array(buffer);
			let openGeoPackage: any = (typeof (window as any) !== 'undefined' && (window as any).geopackage) ? (window as any).geopackage.open : null;
			if (!openGeoPackage) {
				try {
					const gpkg = await import('@ngageoint/geopackage');
					if (gpkg && (gpkg as any).GeoPackageAPI && (gpkg as any).GeoPackageAPI.open) {
						openGeoPackage = (gpkg as any).GeoPackageAPI.open;
					}
				} catch {
					// Fall through to script loader
				}
			}

			let data: any;
			if (openGeoPackage) {
				data = await openGeoPackage(u8);
			} else {
				await Promise.all([
					Utils.loadScript(`${runtime.scriptPath}/lazylibs/geopackage/geopackage.js`),
					Utils.loadScript(`${runtime.scriptPath}/lazylibs/sql.js/sql-wasm.js`),
				]);
				const wasmPath = `${runtime.scriptPath}/lazylibs/sql.js/sql-wasm.wasm`;
				if ((window as any).initSqlJs) {
					await (window as any).initSqlJs({ locateFile: () => wasmPath });
				}
				data = await (window as any).geopackage.open(u8);
			}

			const geopackageNode = new THREE.Object3D();
			geopackageNode.name = params.source;
			(geopackageNode as any).potree = {
				source: params.source,
			};

			const geo = new Geopackage();
			geo.path = params.source;
			geo.node = geopackageNode;

			const tables = data.getTables();

			for (const table of tables.features) {
				const dao = data.getFeatureDao(table);

				let boundingBox = dao.getBoundingBox();
				boundingBox = boundingBox.projectBoundingBox(dao.projection, 'EPSG:4326');
				const geoJson = data.queryForGeoJSONFeaturesInTable(table, boundingBox);

				const colorRGB = getColor(table);
				const matLine = new LineMaterial({
					color: new THREE.Color(colorRGB[0], colorRGB[1], colorRGB[2]).getHex(),
					linewidth: 2,
					resolution: new THREE.Vector2(1000, 1000),
					dashed: false
				});

				const node = new THREE.Object3D();
				node.name = table;
				geo.node.add(node);

				for (const [, feature] of Object.entries(geoJson)) {
					const featureNode = GeoPackageLoader.featureToSceneNode(feature, matLine, dao.projection, transform);
					if (featureNode) {
						node.add(featureNode);
					}
				}
			}

			resolve(geo);
		};

		return new Promise(resolver);
	}

	static featureToSceneNode(feature: any, matLine: LineMaterial, geopackageProjection: any, transform: any): THREE.Object3D | undefined {
		const geometry = feature.geometry;

		if (feature.geometry.type === 'Point') {
			const sg = new THREE.SphereGeometry(1, 18, 18);
			const sm = new THREE.MeshNormalMaterial();
			const s = new THREE.Mesh(sg, sm);

			const [long, lat] = geometry.coordinates;
			const pos = transform.forward(geopackageProjection.forward([long, lat]));

			s.position.set(pos[0], pos[1], 20);
			s.scale.set(10, 10, 10);

			return s;
		} else if (geometry.type === 'LineString') {
			const coordinates: number[] = [];
			const min = new THREE.Vector3(Infinity, Infinity, Infinity);

			for (let i = 0; i < geometry.coordinates.length; i++) {
				const [long, lat] = geometry.coordinates[i];
				const pos = transform.forward(geopackageProjection.forward([long, lat]));

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
					const pos = transform.forward(geopackageProjection.forward([long, lat]));

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
}
