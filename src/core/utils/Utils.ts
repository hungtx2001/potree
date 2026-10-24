import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import proj4 from 'proj4';
import { XHRFactory } from './XHRFactory.js';
import { runtime } from '../runtime/runtime.js';

export class ScreenPass {
	public screenScene: THREE.Scene;
	public screenQuad: THREE.Mesh;
	public camera: THREE.Camera;

	constructor() {
		this.screenScene = new THREE.Scene();
		const geometry = new THREE.PlaneGeometry(2, 2, 1);
		const material = new THREE.MeshBasicMaterial({
			depthTest: true,
			depthWrite: true,
			transparent: true
		});
		this.screenQuad = new THREE.Mesh(geometry, material);
		this.screenScene.add(this.screenQuad);
		this.camera = new THREE.Camera();
	}

	render(renderer: THREE.WebGLRenderer, material: THREE.Material, target?: THREE.WebGLRenderTarget): void {
		this.screenQuad.material = material;

		if (typeof target === 'undefined') {
			renderer.render(this.screenScene, this.camera);
		} else {
			renderer.setRenderTarget(target);
			renderer.render(this.screenScene, this.camera);
			renderer.setRenderTarget(null);
		}
	}
}

export class Utils {
	static screenPass: ScreenPass = new ScreenPass();

	static async loadShapefileFeatures(file: string, callback: (features: any[]) => void): Promise<void> {
		const shapefile = await import('shapefile');
		const features: any[] = [];

		const handleFinish = () => {
			callback(features);
		};

		const source = await shapefile.open(file);

		while (true) {
			const result = await source.read();

			if (result.done) {
				handleFinish();
				break;
			}

			if (result.value && result.value.type === 'Feature' && result.value.geometry !== undefined) {
				features.push(result.value);
			}
		}
	}

	static toString(value: any): string {
		if (value && typeof value === 'object' && value.x != null && value.y != null && value.z != null) {
			return `${value.x.toFixed(2)}, ${value.y.toFixed(2)}, ${value.z.toFixed(2)}`;
		} else {
			return '' + value;
		}
	}

	static normalizeURL(url: string): string {
		const u = new URL(url);
		return u.protocol + '//' + u.hostname + u.pathname.replace(/\/+/g, '/');
	}

	static pathExists(url: string): boolean {
		try {
			const req = XHRFactory.createXMLHttpRequest();
			req.open('GET', url, false);
			req.send(null);
			return req.status === 200;
		} catch {
			return false;
		}
	}

	static debugSphere(parent: THREE.Object3D, position: THREE.Vector3, scale: number, color?: number | string | THREE.Color): THREE.Mesh {
		const geometry = new THREE.SphereGeometry(1, 8, 8);
		const material = color !== undefined
			? new THREE.MeshBasicMaterial({ color })
			: new THREE.MeshNormalMaterial();

		const sphere = new THREE.Mesh(geometry, material);
		sphere.position.copy(position);
		sphere.scale.set(scale, scale, scale);
		parent.add(sphere);

		return sphere;
	}

	static debugLine(parent: THREE.Object3D, start: THREE.Vector3, end: THREE.Vector3, color: number | string | THREE.Color = 0xffffff): { node: THREE.Line; set: (start: THREE.Vector3, end: THREE.Vector3) => void } {
		const material = new THREE.LineBasicMaterial({ color });
		const positions = new Float32Array([
			0, 0, 0,
			end.x - start.x, end.y - start.y, end.z - start.z
		]);

		const geometry = new THREE.BufferGeometry();
		geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

		const lineMesh = new THREE.Line(geometry, material);
		lineMesh.position.copy(start);

		parent.add(lineMesh);

		return {
			node: lineMesh,
			set: (newStart: THREE.Vector3, newEnd: THREE.Vector3) => {
				lineMesh.position.copy(newStart);
				const attr = geometry.attributes.position as THREE.BufferAttribute;
				const arr = attr.array as Float32Array;
				arr[0] = 0; arr[1] = 0; arr[2] = 0;
				arr[3] = newEnd.x - newStart.x;
				arr[4] = newEnd.y - newStart.y;
				arr[5] = newEnd.z - newStart.z;
				attr.needsUpdate = true;
			}
		};
	}

	static debugCircle(parent: THREE.Object3D, center: THREE.Vector3, radius: number, normal: THREE.Vector3, color: number | string | THREE.Color = 0x00ff00): void {
		const material = new THREE.LineBasicMaterial({ color });
		const n = 32;
		const positions: number[] = [];

		for (let i = 0; i <= n; i++) {
			const u = 2 * Math.PI * (i / n);
			positions.push(Math.cos(u) * radius, Math.sin(u) * radius, 0);
		}

		const geometry = new THREE.BufferGeometry();
		geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

		const line = new THREE.Line(geometry, material);
		line.position.copy(center);

		if (normal) {
			const defaultNormal = new THREE.Vector3(0, 0, 1);
			const quat = new THREE.Quaternion().setFromUnitVectors(defaultNormal, normal.clone().normalize());
			line.setRotationFromQuaternion(quat);
		}

		parent.add(line);
	}

	static debugBox(parent: THREE.Object3D, box: THREE.Box3, transform: THREE.Matrix4 = new THREE.Matrix4(), color: number | string | THREE.Color = 0xFFFF00): void {
		const vertices = [
			new THREE.Vector3(box.min.x, box.min.y, box.min.z),
			new THREE.Vector3(box.min.x, box.min.y, box.max.z),
			new THREE.Vector3(box.min.x, box.max.y, box.min.z),
			new THREE.Vector3(box.min.x, box.max.y, box.max.z),
			new THREE.Vector3(box.max.x, box.min.y, box.min.z),
			new THREE.Vector3(box.max.x, box.min.y, box.max.z),
			new THREE.Vector3(box.max.x, box.max.y, box.min.z),
			new THREE.Vector3(box.max.x, box.max.y, box.max.z)
		];

		const edges = [
			[0, 4], [4, 5], [5, 1], [1, 0],
			[2, 6], [6, 7], [7, 3], [3, 2],
			[0, 2], [4, 6], [5, 7], [1, 3]
		];

		const center = box.getCenter(new THREE.Vector3());

		const centroids = [
			{ position: [box.min.x, center.y, center.z], color: 0xFF0000 },
			{ position: [box.max.x, center.y, center.z], color: 0x880000 },
			{ position: [center.x, box.min.y, center.z], color: 0x00FF00 },
			{ position: [center.x, box.max.y, center.z], color: 0x008800 },
			{ position: [center.x, center.y, box.min.z], color: 0x0000FF },
			{ position: [center.x, center.y, box.max.z], color: 0x000088 }
		];

		for (const vertex of vertices) {
			const pos = vertex.clone().applyMatrix4(transform);
			Utils.debugSphere(parent, pos, 0.1, 0xFF0000);
		}

		for (const edge of edges) {
			const start = vertices[edge[0]].clone().applyMatrix4(transform);
			const end = vertices[edge[1]].clone().applyMatrix4(transform);
			Utils.debugLine(parent, start, end, color);
		}

		for (const centroid of centroids) {
			const pos = new THREE.Vector3(centroid.position[0], centroid.position[1], centroid.position[2]).applyMatrix4(transform);
			Utils.debugSphere(parent, pos, 0.1, centroid.color);
		}
	}

	static debugPlane(parent: THREE.Object3D, plane: THREE.Plane, size: number = 1, color: number = 0x0000FF): void {
		const planehelper = new THREE.PlaneHelper(plane, size, color);
		parent.add(planehelper);
	}

	static computeTransformedBoundingBox(box: THREE.Box3, transform: THREE.Matrix4): THREE.Box3 {
		const vertices = [
			new THREE.Vector3(box.min.x, box.min.y, box.min.z).applyMatrix4(transform),
			new THREE.Vector3(box.max.x, box.min.y, box.min.z).applyMatrix4(transform),
			new THREE.Vector3(box.min.x, box.max.y, box.min.z).applyMatrix4(transform),
			new THREE.Vector3(box.max.x, box.max.y, box.min.z).applyMatrix4(transform),
			new THREE.Vector3(box.min.x, box.min.y, box.max.z).applyMatrix4(transform),
			new THREE.Vector3(box.max.x, box.min.y, box.max.z).applyMatrix4(transform),
			new THREE.Vector3(box.min.x, box.max.y, box.max.z).applyMatrix4(transform),
			new THREE.Vector3(box.max.x, box.max.y, box.max.z).applyMatrix4(transform)
		];

		const boundingBox = new THREE.Box3();
		boundingBox.setFromPoints(vertices);
		return boundingBox;
	}

	static addCommas(nStr: string | number): string {
		let str = '' + nStr;
		const x = str.split('.');
		let x1 = x[0];
		const x2 = x.length > 1 ? '.' + x[1] : '';
		const rgx = /(\d+)(\d{3})/;
		while (rgx.test(x1)) {
			x1 = x1.replace(rgx, '$1' + ',' + '$2');
		}
		return x1 + x2;
	}

	static removeCommas(str: string): string {
		return str.replace(/,/g, '');
	}

	static createWorker(code: string): Worker {
		const blob = new Blob([code], { type: 'application/javascript' });
		return new Worker(URL.createObjectURL(blob));
	}

	static moveTo(scene: any, endPosition: THREE.Vector3, endTarget: THREE.Vector3): void {
		const view = scene.view;
		const camera = scene.getActiveCamera();
		const animationDuration = 500;
		const easing = TWEEN.Easing.Quartic.Out;

		{
			const tween = new TWEEN.Tween(view.position).to(endPosition, animationDuration);
			tween.easing(easing);
			tween.start();
		}

		{
			const camTargetDistance = camera.position.distanceTo(endTarget);
			const target = new THREE.Vector3().addVectors(
				camera.position,
				camera.getWorldDirection(new THREE.Vector3()).clone().multiplyScalar(camTargetDistance)
			);
			const tween = new TWEEN.Tween(target).to(endTarget, animationDuration);
			tween.easing(easing);
			tween.onUpdate(() => {
				view.lookAt(target);
			});
			tween.onComplete(() => {
				view.lookAt(target);
			});
			tween.start();
		}
	}

	static loadSkybox(path: string): { camera: THREE.PerspectiveCamera; scene: THREE.Scene; parent: THREE.Object3D } {
		const parent = new THREE.Object3D();
		parent.name = 'skybox_root';

		const aspect = typeof window !== 'undefined' && window.innerHeight ? (window.innerWidth / window.innerHeight) : 1;
		const camera = new THREE.PerspectiveCamera(75, aspect, 1, 100000);
		camera.up.set(0, 0, 1);
		const scene = new THREE.Scene();

		const format = '.jpg';
		const urls = [
			path + 'px' + format, path + 'nx' + format,
			path + 'py' + format, path + 'ny' + format,
			path + 'pz' + format, path + 'nz' + format
		];

		const materialArray: THREE.MeshBasicMaterial[] = [];
		for (let i = 0; i < 6; i++) {
			const material = new THREE.MeshBasicMaterial({
				map: null,
				side: THREE.BackSide,
				depthTest: false,
				depthWrite: false,
				color: 0x424556
			});
			materialArray.push(material);

			const loader = new THREE.TextureLoader();
			loader.load(
				urls[i],
				(texture) => {
					material.map = texture;
					material.needsUpdate = true;
					material.color.setHex(0xffffff);
				},
				undefined,
				(xhr) => {
					console.warn('Skybox texture error', xhr);
				}
			);
		}

		const skyGeometry = new THREE.BoxGeometry(700, 700, 700);
		const skybox = new THREE.Mesh(skyGeometry, materialArray);
		scene.add(skybox);
		scene.traverse((n) => { n.frustumCulled = false; });
		scene.rotation.x = Math.PI / 2;

		parent.add(camera);

		return { camera, scene, parent };
	}

	static createGrid(width: number, length: number, spacing: number, color: number | string | THREE.Color = 0x888888): THREE.LineSegments {
		const material = new THREE.LineBasicMaterial({ color });
		const positions: number[] = [];

		for (let i = 0; i <= length; i++) {
			positions.push(-(spacing * width) / 2, i * spacing - (spacing * length) / 2, 0);
			positions.push(+(spacing * width) / 2, i * spacing - (spacing * length) / 2, 0);
		}

		for (let i = 0; i <= width; i++) {
			positions.push(i * spacing - (spacing * width) / 2, -(spacing * length) / 2, 0);
			positions.push(i * spacing - (spacing * width) / 2, +(spacing * length) / 2, 0);
		}

		const geometry = new THREE.BufferGeometry();
		geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

		const line = new THREE.LineSegments(geometry, material);
		line.receiveShadow = true;
		return line;
	}

	static createBackgroundTexture(width: number, height: number): THREE.DataTexture {
		function gauss(x: number, y: number) {
			return (1 / (2 * Math.PI)) * Math.exp(-(x * x + y * y) / 2);
		}

		const size = width * height;
		const data = new Uint8Array(4 * size);
		const chroma = [1, 1.5, 1.7];
		const max = gauss(0, 0);

		for (let x = 0; x < width; x++) {
			for (let y = 0; y < height; y++) {
				const u = 2 * (x / width) - 1;
				const v = 2 * (y / height) - 1;
				const i = x + width * y;
				const d = gauss(2 * u, 2 * v) / max;
				let r = (Math.random() + Math.random() + Math.random()) / 3;
				r = (d * 0.5 + 0.5) * r * 0.03;
				r = r * 0.4;

				data[4 * i + 0] = Math.min(255, Math.floor(255 * (d / 15 + 0.05 + r) * chroma[0]));
				data[4 * i + 1] = Math.min(255, Math.floor(255 * (d / 15 + 0.05 + r) * chroma[1]));
				data[4 * i + 2] = Math.min(255, Math.floor(255 * (d / 15 + 0.05 + r) * chroma[2]));
				data[4 * i + 3] = 255;
			}
		}

		const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
		texture.needsUpdate = true;
		return texture;
	}

	static getMousePointCloudIntersection(
		mouse: { x: number; y: number },
		camera: THREE.Camera,
		viewer: any,
		pointclouds: any[],
		params: any = {}
	): { location: THREE.Vector3; distance: number; pointcloud: any; point: any } | null {
		const renderer = viewer.renderer;
		if (!renderer || !renderer.domElement) return null;

		const nmouse = {
			x: (mouse.x / renderer.domElement.clientWidth) * 2 - 1,
			y: -(mouse.y / renderer.domElement.clientHeight) * 2 + 1
		};

		const pickParams: any = {};
		if (params.pickClipped) {
			pickParams.pickClipped = params.pickClipped;
		}

		pickParams.x = mouse.x;
		pickParams.y = renderer.domElement.clientHeight - mouse.y;

		const raycaster = new THREE.Raycaster();
		raycaster.setFromCamera(nmouse as any, camera);
		const ray = raycaster.ray;

		let selectedPointcloud: any = null;
		let closestDistance = Infinity;
		let closestIntersection: THREE.Vector3 | null = null;
		let closestPoint: any = null;

		for (const pointcloud of pointclouds) {
			const point = pointcloud.pick(viewer, camera, ray, pickParams);
			if (!point) continue;

			const distance = camera.position.distanceTo(point.position);
			if (distance < closestDistance) {
				closestDistance = distance;
				selectedPointcloud = pointcloud;
				closestIntersection = point.position;
				closestPoint = point;
			}
		}

		if (selectedPointcloud && closestIntersection) {
			return {
				location: closestIntersection,
				distance: closestDistance,
				pointcloud: selectedPointcloud,
				point: closestPoint
			};
		}
		return null;
	}

	static pixelsArrayToCanvas(pixels: Uint8Array, width: number, height: number): HTMLCanvasElement {
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;

		const context = canvas.getContext('2d');
		if (!context) return canvas;

		const copy = new Uint8Array(pixels);
		const bytesPerLine = width * 4;
		const halfH = Math.floor(height / 2);

		for (let i = 0; i < halfH; i++) {
			const j = height - i - 1;
			const lineI = copy.slice(i * bytesPerLine, i * bytesPerLine + bytesPerLine);
			const lineJ = copy.slice(j * bytesPerLine, j * bytesPerLine + bytesPerLine);
			copy.set(lineJ, i * bytesPerLine);
			copy.set(lineI, j * bytesPerLine);
		}

		const imageData = context.createImageData(width, height);
		imageData.data.set(copy);
		context.putImageData(imageData, 0, 0);

		return canvas;
	}

	static pixelsArrayToImage(pixels: Uint8Array, width: number, height: number): HTMLImageElement {
		const canvas = Utils.pixelsArrayToCanvas(pixels, width, height);
		const img = new Image();
		img.src = canvas.toDataURL();
		return img;
	}

	static pixelsArrayToDataUrl(pixels: Uint8Array, width: number, height: number): string {
		const canvas = Utils.pixelsArrayToCanvas(pixels, width, height);
		return canvas.toDataURL();
	}

	static removeListeners(dispatcher: any, type: string): void {
		if (dispatcher._listeners === undefined) return;
		if (dispatcher._listeners[type]) {
			delete dispatcher._listeners[type];
		}
	}

	static mouseToRay(mouse: { x: number; y: number }, camera: THREE.Camera, width: number, height: number): THREE.Ray {
		const normalizedMouse = {
			x: (mouse.x / width) * 2 - 1,
			y: -(mouse.y / height) * 2 + 1
		};

		const vector = new THREE.Vector3(normalizedMouse.x, normalizedMouse.y, 0.5);
		const origin = camera.position.clone();
		vector.unproject(camera);
		const direction = new THREE.Vector3().subVectors(vector, origin).normalize();

		return new THREE.Ray(origin, direction);
	}

	static projectedRadius(radius: number, camera: THREE.Camera, distance: number, screenWidth: number, screenHeight: number): number {
		if (camera instanceof THREE.OrthographicCamera) {
			return Utils.projectedRadiusOrtho(radius, camera.projectionMatrix, screenWidth, screenHeight);
		} else if (camera instanceof THREE.PerspectiveCamera) {
			return Utils.projectedRadiusPerspective(radius, camera.fov * Math.PI / 180, distance, screenHeight);
		} else {
			throw new Error('invalid camera parameter');
		}
	}

	static projectedRadiusPerspective(radius: number, fov: number, distance: number, screenHeight: number): number {
		let projFactor = (1 / Math.tan(fov / 2)) / distance;
		projFactor = projFactor * screenHeight / 2;
		return radius * projFactor;
	}

	static projectedRadiusOrtho(radius: number, proj: THREE.Matrix4, screenWidth: number, screenHeight: number): number {
		const p1 = new THREE.Vector4(0, 0, 0, 1).applyMatrix4(proj);
		const p2 = new THREE.Vector4(radius, 0, 0, 1).applyMatrix4(proj);

		const v1 = new THREE.Vector3(
			(p1.x + 1.0) * 0.5 * screenWidth,
			(p1.y + 1.0) * 0.5 * screenHeight,
			p1.z
		);
		const v2 = new THREE.Vector3(
			(p2.x + 1.0) * 0.5 * screenWidth,
			(p2.y + 1.0) * 0.5 * screenHeight,
			p2.z
		);
		return v1.distanceTo(v2);
	}

	static topView(camera: any, node: any): void {
		camera.position.set(0, 1, 0);
		camera.rotation.set(-Math.PI / 2, 0, 0);
		if (typeof camera.zoomTo === 'function') camera.zoomTo(node, 1);
	}

	static frontView(camera: any, node: any): void {
		camera.position.set(0, 0, 1);
		camera.rotation.set(0, 0, 0);
		if (typeof camera.zoomTo === 'function') camera.zoomTo(node, 1);
	}

	static leftView(camera: any, node: any): void {
		camera.position.set(-1, 0, 0);
		camera.rotation.set(0, -Math.PI / 2, 0);
		if (typeof camera.zoomTo === 'function') camera.zoomTo(node, 1);
	}

	static rightView(camera: any, node: any): void {
		camera.position.set(1, 0, 0);
		camera.rotation.set(0, Math.PI / 2, 0);
		if (typeof camera.zoomTo === 'function') camera.zoomTo(node, 1);
	}

	static frustumSphereIntersection(frustum: THREE.Frustum, sphere: THREE.Sphere): number {
		const planes = frustum.planes;
		const center = sphere.center;
		const negRadius = -sphere.radius;
		let minDistance = Number.MAX_VALUE;

		for (let i = 0; i < 6; i++) {
			const distance = planes[i].distanceToPoint(center);
			if (distance < negRadius) {
				return 0; // outside
			}
			minDistance = Math.min(minDistance, distance);
		}

		return (minDistance >= sphere.radius) ? 2 : 1; // 2: fully inside, 1: intersecting
	}

	static generateDataTexture(width: number, height: number, color: THREE.Color): THREE.DataTexture {
		const size = width * height;
		const data = new Uint8Array(4 * size);
		const r = Math.floor(color.r * 255);
		const g = Math.floor(color.g * 255);
		const b = Math.floor(color.b * 255);

		for (let i = 0; i < size; i++) {
			data[i * 4 + 0] = r;
			data[i * 4 + 1] = g;
			data[i * 4 + 2] = b;
			data[i * 4 + 3] = 255;
		}

		const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
		texture.needsUpdate = true;
		texture.magFilter = THREE.NearestFilter;
		return texture;
	}

	static getParameterByName(name: string): string | null {
		if (typeof window === 'undefined' || !window.location) return null;
		const cleanName = name.replace(/[[]/, '\\[').replace(/[\]]/, '\\]');
		const regex = new RegExp('[\\?&]' + cleanName + '=([^&#]*)');
		const results = regex.exec(window.location.search);
		return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, ' '));
	}

	static setParameter(name: string, value: string): void {
		if (typeof window === 'undefined' || typeof document === 'undefined') return;
		const cleanName = name.replace(/[[]/, '\\[').replace(/[\]]/, '\\]');
		const regex = new RegExp('([\\?&])(' + cleanName + '=([^&#]*))');
		const results = regex.exec(window.location.search);

		let url = window.location.href;
		if (results === null) {
			const sep = window.location.search.length === 0 ? '?' : '&';
			url = url + sep + name + '=' + value;
		} else {
			url = url.replace(results[2], name + '=' + value);
		}
		window.history.replaceState({}, '', url);
	}

	static createChildAABB(aabb: THREE.Box3, index: number): THREE.Box3 {
		const min = aabb.min.clone();
		const max = aabb.max.clone();
		const size = new THREE.Vector3().subVectors(max, min);

		if ((index & 0b0001) > 0) {
			min.z += size.z / 2;
		} else {
			max.z -= size.z / 2;
		}

		if ((index & 0b0010) > 0) {
			min.y += size.y / 2;
		} else {
			max.y -= size.y / 2;
		}

		if ((index & 0b0100) > 0) {
			min.x += size.x / 2;
		} else {
			max.x -= size.x / 2;
		}

		return new THREE.Box3(min, max);
	}

	static clipboardCopy(text: string): void {
		if (typeof document === 'undefined') return;

		if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
			navigator.clipboard.writeText(text).catch(() => {});
			return;
		}

		const textArea = document.createElement('textarea');
		textArea.style.position = 'fixed';
		textArea.style.top = '0';
		textArea.style.left = '0';
		textArea.style.width = '2em';
		textArea.style.height = '2em';
		textArea.style.padding = '0';
		textArea.style.border = 'none';
		textArea.style.outline = 'none';
		textArea.style.boxShadow = 'none';
		textArea.style.background = 'transparent';
		textArea.value = text;

		document.body.appendChild(textArea);
		textArea.select();

		try {
			document.execCommand('copy');
		} catch (err) {
			console.warn('Copy to clipboard failed', err);
		}

		document.body.removeChild(textArea);
	}

	static lineToLineIntersection(P0: THREE.Vector3, P1: THREE.Vector3, P2: THREE.Vector3, P3: THREE.Vector3): THREE.Vector3 {
		const P = [P0, P1, P2, P3];

		const d = (m: number, n: number, o: number, p: number) => {
			return (P[m].x - P[n].x) * (P[o].x - P[p].x)
				+ (P[m].y - P[n].y) * (P[o].y - P[p].y)
				+ (P[m].z - P[n].z) * (P[o].z - P[p].z);
		};

		const mua = (d(0, 2, 3, 2) * d(3, 2, 1, 0) - d(0, 2, 1, 0) * d(3, 2, 3, 2))
			/ (d(1, 0, 1, 0) * d(3, 2, 3, 2) - d(3, 2, 1, 0) * d(3, 2, 1, 0));

		const mub = (d(0, 2, 3, 2) + mua * d(3, 2, 1, 0)) / d(3, 2, 3, 2);

		const P01 = P1.clone().sub(P0);
		const P23 = P3.clone().sub(P2);

		const Pa = P0.clone().add(P01.multiplyScalar(mua));
		const Pb = P2.clone().add(P23.multiplyScalar(mub));

		return Pa.clone().add(Pb).multiplyScalar(0.5);
	}

	static computeCircleCenter(A: THREE.Vector3, B: THREE.Vector3, C: THREE.Vector3): THREE.Vector3 {
		const AB = B.clone().sub(A);
		const AC = C.clone().sub(A);
		const N = AC.clone().cross(AB).normalize();

		const ab_dir = AB.clone().cross(N).normalize();
		const ac_dir = AC.clone().cross(N).normalize();

		const ab_origin = A.clone().add(B).multiplyScalar(0.5);
		const ac_origin = A.clone().add(C).multiplyScalar(0.5);

		const P0 = ab_origin;
		const P1 = ab_origin.clone().add(ab_dir);
		const P2 = ac_origin;
		const P3 = ac_origin.clone().add(ac_dir);

		return Utils.lineToLineIntersection(P0, P1, P2, P3);
	}

	static getNorthVec(p1: THREE.Vector3, distance: number, projection?: string): THREE.Vector3 {
		if (projection) {
			proj4.defs('pointcloud', projection);
			const transform = (proj4 as any)('pointcloud', 'WGS84');
			const llP1 = transform.forward(p1.toArray());
			let llP2 = transform.forward([p1.x, p1.y + distance]);
			const polarRadius = Math.sqrt((llP2[0] - llP1[0]) ** 2 + (llP2[1] - llP1[1]) ** 2);
			llP2 = [llP1[0], llP1[1] + polarRadius];

			const northVec = transform.inverse(llP2);
			return new THREE.Vector3(northVec[0], northVec[1], p1.z).sub(p1);
		} else {
			return new THREE.Vector3(0, 1, 0).multiplyScalar(distance);
		}
	}

	static computeAzimuth(p1: THREE.Vector3, p2: THREE.Vector3, projection?: string): number {
		let azimuth = 0;

		if (projection) {
			let transform: any;
			if (projection.includes('EPSG')) {
				transform = (proj4 as any)(projection, 'WGS84');
			} else {
				proj4.defs('pointcloud', projection);
				transform = (proj4 as any)('pointcloud', 'WGS84');
			}

			const llP1 = transform.forward(p1.toArray());
			const llP2 = transform.forward(p2.toArray());
			const dir = [
				llP2[0] - llP1[0],
				llP2[1] - llP1[1]
			];
			azimuth = Math.atan2(dir[1], dir[0]) - Math.PI / 2;
		} else {
			const dir = [p2.x - p1.x, p2.y - p1.y];
			azimuth = Math.atan2(dir[1], dir[0]) - Math.PI / 2;
		}

		return -azimuth;
	}

	static async loadScript(url: string): Promise<void> {
		if (typeof document === 'undefined') return;

		return new Promise<void>((resolve) => {
			const element = document.getElementById(url);
			if (element) {
				resolve();
			} else {
				const script = document.createElement('script');
				script.id = url;
				script.onload = () => resolve();
				script.src = url;
				document.body.appendChild(script);
			}
		});
	}

	static createSvgGradient(scheme: Array<[number, THREE.Color]>): SVGElement {
		const gradientId = `${Math.random()}_${Date.now()}`;
		const svgn = 'http://www.w3.org/2000/svg';
		const svg = document.createElementNS(svgn, 'svg');
		svg.setAttributeNS(null, 'width', '2em');
		svg.setAttributeNS(null, 'height', '3em');

		const defs = document.createElementNS(svgn, 'defs');
		const linearGradient = document.createElementNS(svgn, 'linearGradient');
		linearGradient.setAttributeNS(null, 'id', gradientId);
		linearGradient.setAttributeNS(null, 'gradientTransform', 'rotate(90)');

		for (let i = scheme.length - 1; i >= 0; i--) {
			const stopVal = scheme[i];
			const percent = parseInt('' + (100 - stopVal[0] * 100), 10);
			const r = Math.floor(stopVal[1].r * 255);
			const g = Math.floor(stopVal[1].g * 255);
			const b = Math.floor(stopVal[1].b * 255);

			const stop = document.createElementNS(svgn, 'stop');
			stop.setAttributeNS(null, 'offset', `${percent}%`);
			stop.setAttributeNS(null, 'stop-color', `rgb(${r}, ${g}, ${b})`);
			linearGradient.appendChild(stop);
		}

		defs.appendChild(linearGradient);
		svg.appendChild(defs);

		const rect = document.createElementNS(svgn, 'rect');
		rect.setAttributeNS(null, 'width', '100%');
		rect.setAttributeNS(null, 'height', '100%');
		rect.setAttributeNS(null, 'fill', `url("#${gradientId}")`);
		rect.setAttributeNS(null, 'stroke', 'black');
		rect.setAttributeNS(null, 'stroke-width', '0.1em');

		svg.appendChild(rect);
		return svg;
	}

	static async waitAny(promises: Promise<any>[]): Promise<void> {
		return new Promise<void>((resolve) => {
			promises.forEach((p) => {
				p.then(() => resolve()).catch(() => resolve());
			});
		});
	}
}
