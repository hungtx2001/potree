import * as THREE from 'three';
import { OrientedImageControls } from '../navigation/OrientedImageControls.js';
import { EventDispatcher } from '../EventDispatcher.js';
import { PolygonClipVolume } from './PolygonClipVolume.js';
import { runtime } from '../runtime/runtime.js';

function createMaterial(): THREE.ShaderMaterial {
	const vertexShader = `
	uniform float uNear;
	varying vec2 vUV;
	varying vec4 vDebug;
	
	void main(){
		vDebug = vec4(0.0, 1.0, 0.0, 1.0);
		vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
		modelViewPosition.xyz += normalize(modelViewPosition.xyz) * uNear;
		gl_Position = projectionMatrix * modelViewPosition;
		vUV = uv;
	}
	`;

	const fragmentShader = `
	uniform sampler2D tColor;
	uniform float uOpacity;
	varying vec2 vUV;
	varying vec4 vDebug;
	void main(){
		vec4 color = texture2D(tColor, vUV);
		gl_FragColor = color;
		gl_FragColor.a = uOpacity;
	}
	`;

	const material = new THREE.ShaderMaterial({
		uniforms: {
			tColor: { value: new THREE.Texture() },
			uNear: { value: 0.0 },
			uOpacity: { value: 1.0 },
		},
		vertexShader,
		fragmentShader,
		side: THREE.DoubleSide,
	});

	return material;
}

const planeGeometry = new THREE.PlaneGeometry(1, 1);

// Modern BufferGeometry rectangle outline (replaces deprecated THREE.Geometry)
const lineGeometry = new THREE.BufferGeometry();
const lineVertices = new Float32Array([
	-0.5, -0.5, 0,
	 0.5, -0.5, 0,
	 0.5,  0.5, 0,
	-0.5,  0.5, 0,
	-0.5, -0.5, 0,
]);
lineGeometry.setAttribute('position', new THREE.BufferAttribute(lineVertices, 3));

export class OrientedImage {
	id: string;
	fov: number;
	position: THREE.Vector3;
	rotation: THREE.Vector3;
	width: number;
	height: number;
	mesh: THREE.Mesh;
	line: THREE.Line;
	texture: THREE.Texture | null;

	constructor(id: string) {
		this.id = id;
		this.fov = 1.0;
		this.position = new THREE.Vector3();
		this.rotation = new THREE.Vector3();
		this.width = 0;
		this.height = 0;

		const material = createMaterial();
		const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
		this.mesh = new THREE.Mesh(planeGeometry, material);
		this.line = new THREE.Line(lineGeometry, lineMaterial);
		this.texture = null;

		(this.mesh as any).orientedImage = this;
	}

	set(position: [number, number, number], rotation: [number, number, number], dimension: [number, number], fov: number): void {
		const radians = rotation.map(r => THREE.MathUtils.degToRad(r));

		this.position.set(...position);
		this.mesh.position.set(...position);

		this.rotation.set(radians[0], radians[1], radians[2]);
		this.mesh.rotation.set(radians[0], radians[1], radians[2]);

		[this.width, this.height] = dimension;
		this.mesh.scale.set(this.width / this.height, 1, 1);

		this.fov = fov;

		this.updateTransform();
	}

	updateTransform(): void {
		const { mesh, line, fov } = this;

		mesh.updateMatrixWorld();
		const dir = mesh.getWorldDirection(new THREE.Vector3());
		const alpha = THREE.MathUtils.degToRad(fov / 2);
		const d = -0.5 / Math.tan(alpha);
		const move = dir.clone().multiplyScalar(d);
		mesh.position.add(move);

		line.position.copy(mesh.position);
		line.scale.copy(mesh.scale);
		line.rotation.copy(mesh.rotation);
	}
}

export class OrientedImages extends EventDispatcher {
	node: THREE.Object3D | null;
	cameraParams: any;
	imageParams: any;
	images: OrientedImage[] | null;
	private _visible: boolean;
	cameraParamsPath?: string;
	imageParamsPath?: string;

	constructor() {
		super();

		this.node = null;
		this.cameraParams = null;
		this.imageParams = null;
		this.images = null;
		this._visible = true;
	}

	set visible(visible: boolean) {
		if (this._visible === visible) {
			return;
		}

		if (this.images) {
			for (const image of this.images) {
				image.mesh.visible = visible;
				image.line.visible = visible;
			}
		}

		this._visible = visible;
		this.dispatchEvent({
			type: 'visibility_changed',
			images: this,
		});
	}

	get visible(): boolean {
		return this._visible;
	}
}

export class OrientedImageLoader {
	static async loadCameraParams(path: string): Promise<any> {
		const res = await fetch(path);
		const text = await res.text();

		const parser = new DOMParser();
		const doc = parser.parseFromString(text, 'application/xml');

		const width = parseInt(doc.getElementsByTagName('width')[0].textContent || '0');
		const height = parseInt(doc.getElementsByTagName('height')[0].textContent || '0');
		const f = parseFloat(doc.getElementsByTagName('f')[0].textContent || '0');

		const a = (height / 2) / f;
		const fov = 2 * THREE.MathUtils.radToDeg(Math.atan(a));

		return {
			path,
			width,
			height,
			f,
			fov,
		};
	}

	static async loadImageParams(path: string): Promise<any[]> {
		const response = await fetch(path);
		if (!response.ok) {
			console.error(`failed to load ${path}`);
			return [];
		}

		const content = await response.text();
		const lines = content.split(/\r?\n/);
		const imageParams: any[] = [];

		for (let i = 1; i < lines.length; i++) {
			const line = lines[i];
			if (line.startsWith('#')) continue;

			const tokens = line.split(/\s+/);
			if (tokens.length < 6) continue;

			imageParams.push({
				id: tokens[0],
				x: Number.parseFloat(tokens[1]),
				y: Number.parseFloat(tokens[2]),
				z: Number.parseFloat(tokens[3]),
				omega: Number.parseFloat(tokens[4]),
				phi: Number.parseFloat(tokens[5]),
				kappa: Number.parseFloat(tokens[6]),
			});
		}

		return imageParams;
	}

	static async load(cameraParamsPath: string, imageParamsPath: string, viewer: any): Promise<OrientedImages> {
		const [cameraParams, imageParams] = await Promise.all([
			OrientedImageLoader.loadCameraParams(cameraParamsPath),
			OrientedImageLoader.loadImageParams(imageParamsPath),
		]);

		const orientedImageControls = new OrientedImageControls(viewer);
		const raycaster = new THREE.Raycaster();

		const { width, height } = cameraParams;
		const orientedImages: OrientedImage[] = [];
		const sceneNode = new THREE.Object3D();
		sceneNode.name = 'oriented_images';

		for (const params of imageParams) {
			const { x, y, z, omega, phi, kappa } = params;
			const orientedImage = new OrientedImage(params.id);
			const position: [number, number, number] = [x, y, z];
			const rotation: [number, number, number] = [omega, phi, kappa];
			const dimension: [number, number] = [width, height];
			orientedImage.set(position, rotation, dimension, cameraParams.fov);

			sceneNode.add(orientedImage.mesh);
			sceneNode.add(orientedImage.line);

			orientedImages.push(orientedImage);
		}

		let hoveredElement: any = null;
		let clipVolume: PolygonClipVolume | null = null;

		const onMouseMove = (evt: MouseEvent) => {
			if (hoveredElement) {
				(hoveredElement.line.material as any).color.setRGB(0, 1, 0);
			}
			evt.preventDefault();

			const rect = viewer.renderer.domElement.getBoundingClientRect();
			const [x, y] = [evt.clientX, evt.clientY];
			const array = [
				(x - rect.left) / rect.width,
				(y - rect.top) / rect.height
			];
			const onClickPosition = new THREE.Vector2(array[0], array[1]);
			const camera = viewer.scene.getActiveCamera();
			const mouse = new THREE.Vector3(
				+(onClickPosition.x * 2) - 1,
				-(onClickPosition.y * 2) + 1
			);
			const objects = orientedImages.map(i => i.mesh);
			raycaster.setFromCamera(mouse as any, camera);
			const intersects = raycaster.intersectObjects(objects);
			let selectionChanged = false;

			if (intersects.length > 0) {
				const intersection = intersects[0];
				const orientedImage = (intersection.object as any).orientedImage;
				(orientedImage.line.material as any).color.setRGB(1, 0, 0);
				selectionChanged = hoveredElement !== orientedImage;
				hoveredElement = orientedImage;
			} else {
				hoveredElement = null;
			}

			const shouldRemoveClipVolume = clipVolume !== null && hoveredElement === null;
			const shouldAddClipVolume = clipVolume === null && hoveredElement !== null;

			if (clipVolume !== null && (hoveredElement === null || selectionChanged)) {
				viewer.scene.removePolygonClipVolume(clipVolume);
				clipVolume = null;
			}

			if (shouldAddClipVolume || selectionChanged) {
				const img = hoveredElement;
				const fov = cameraParams.fov;
				const aspect = cameraParams.width / cameraParams.height;
				const near = 1.0;
				const far = 1000 * 1000;
				const cam = new THREE.PerspectiveCamera(fov, aspect, near, far);
				cam.rotation.order = viewer.scene.getActiveCamera().rotation.order;
				cam.rotation.copy(img.mesh.rotation);

				const mesh = img.mesh;
				const dir = mesh.getWorldDirection(new THREE.Vector3());
				const pos = mesh.position;
				const alpha = THREE.MathUtils.degToRad(fov / 2);
				const d = 0.5 / Math.tan(alpha);
				const newCamPos = pos.clone().add(dir.clone().multiplyScalar(d));
				const newCamDir = pos.clone().sub(newCamPos);
				cam.position.copy(newCamPos);

				const volume = new PolygonClipVolume(cam);
				const m0 = new THREE.Mesh();
				const m1 = new THREE.Mesh();
				const m2 = new THREE.Mesh();
				const m3 = new THREE.Mesh();
				m0.position.set(-1, -1, 0);
				m1.position.set(1, -1, 0);
				m2.position.set(1, 1, 0);
				m3.position.set(-1, 1, 0);
				volume.markers.push(m0, m1, m2, m3);
				volume.initialized = true;

				viewer.scene.addPolygonClipVolume(volume);
				clipVolume = volume;
			}
		};

		const moveToImage = (image: OrientedImage) => {
			const mesh = image.mesh;
			const newCamPos = image.position.clone();
			const newCamTarget = mesh.position.clone();

			viewer.scene.view.setView(newCamPos, newCamTarget, 500, () => {
				orientedImageControls.capture(image);
			});

			if (image.texture === null) {
				const target = image;
				const tmpImagePath = `${runtime.resourcePath}/images/loading.jpg`;
				new THREE.TextureLoader().load(tmpImagePath, (texture) => {
					if (target.texture === null) {
						target.texture = texture;
						(target.mesh.material as THREE.ShaderMaterial).uniforms.tColor.value = texture;
						(target.mesh.material as any).needsUpdate = true;
					}
				});

				const imagePath = `${imageParamsPath}/../${target.id}`;
				new THREE.TextureLoader().load(imagePath, (texture) => {
					target.texture = texture;
					(target.mesh.material as THREE.ShaderMaterial).uniforms.tColor.value = texture;
					(target.mesh.material as any).needsUpdate = true;
				});
			}
		};

		const onMouseClick = () => {
			if (orientedImageControls.hasSomethingCaptured()) {
				return;
			}
			if (hoveredElement) {
				moveToImage(hoveredElement);
			}
		};

		viewer.renderer.domElement.addEventListener('mousemove', onMouseMove, false);
		viewer.renderer.domElement.addEventListener('mousedown', onMouseClick, false);

		viewer.addEventListener('update', () => {
			for (const image of orientedImages) {
				const { width: imgW, height: imgH } = image;
				const aspect = imgW / imgH;
				const camera = viewer.scene.getActiveCamera();
				const imgPos = image.mesh.getWorldPosition(new THREE.Vector3());
				const camPos = camera.position;
				const d = camPos.distanceTo(imgPos);

				const minSize = 1;
				const a = THREE.MathUtils.degToRad(minSize);
				let r = d * Math.tan(a);
				r = Math.max(r, 1);

				image.mesh.scale.set(r * aspect, r, 1);
				image.line.scale.set(r * aspect, r, 1);
				(image.mesh.material as THREE.ShaderMaterial).uniforms.uNear.value = camera.near;
			}
		});

		const images = new OrientedImages();
		images.node = sceneNode;
		images.cameraParamsPath = cameraParamsPath;
		images.imageParamsPath = imageParamsPath;
		images.cameraParams = cameraParams;
		images.imageParams = imageParams;
		images.images = orientedImages;

		(runtime as any).debug = (runtime as any).debug || {};
		(runtime as any).debug.moveToImage = moveToImage;

		return images;
	}
}
