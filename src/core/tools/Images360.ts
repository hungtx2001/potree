import * as THREE from 'three';
import { EventDispatcher } from '../EventDispatcher.js';
import { Utils } from '../utils/Utils.js';

const sg = new THREE.SphereGeometry(1, 8, 8);
const sgHigh = new THREE.SphereGeometry(1, 128, 128);

const sm = new THREE.MeshBasicMaterial({ side: THREE.BackSide });
const smHovered = new THREE.MeshBasicMaterial({ side: THREE.BackSide, color: 0xff0000 });

const raycaster = new THREE.Raycaster();
let currentlyHovered: any = null;

export class Image360 {
	file: string;
	time: number;
	longitude: number;
	latitude: number;
	altitude: number;
	course: number;
	pitch: number;
	roll: number;
	mesh: THREE.Mesh | null;
	position!: [number, number, number];
	texture?: THREE.Texture;

	constructor(file: string, time: number, longitude: number, latitude: number, altitude: number, course: number, pitch: number, roll: number) {
		this.file = file;
		this.time = time;
		this.longitude = longitude;
		this.latitude = latitude;
		this.altitude = altitude;
		this.course = course;
		this.pitch = pitch;
		this.roll = roll;
		this.mesh = null;
	}
}

export class Images360 extends EventDispatcher {
	viewer: any;
	selectingEnabled: boolean;
	images: Image360[];
	node: THREE.Object3D;
	sphere: THREE.Mesh;
	private _visible: boolean;
	focusedImage: Image360 | null;
	elUnfocus: HTMLInputElement;
	domRoot: HTMLElement | null;
	previousView: { controls: any; position: THREE.Vector3 | null; target: THREE.Vector3 | null };

	constructor(viewer: any) {
		super();

		this.viewer = viewer;
		this.selectingEnabled = true;
		this.images = [];
		this.node = new THREE.Object3D();

		this.sphere = new THREE.Mesh(sgHigh, sm);
		this.sphere.visible = false;
		this.sphere.scale.set(1000, 1000, 1000);
		this.node.add(this.sphere);
		this._visible = true;

		this.focusedImage = null;
		this.previousView = { controls: null, position: null, target: null };

		const elUnfocus = document.createElement('input');
		elUnfocus.type = 'button';
		elUnfocus.value = 'unfocus';
		elUnfocus.style.position = 'absolute';
		elUnfocus.style.right = '10px';
		elUnfocus.style.bottom = '10px';
		elUnfocus.style.zIndex = '10000';
		elUnfocus.style.fontSize = '2em';
		elUnfocus.addEventListener('click', () => this.unfocus());
		this.elUnfocus = elUnfocus;

		this.domRoot = viewer.renderer?.domElement?.parentElement || null;
		if (this.domRoot) {
			this.domRoot.appendChild(elUnfocus);
		}
		this.elUnfocus.style.display = 'none';

		viewer.addEventListener('update', () => {
			this.update();
		});
		viewer.inputHandler?.addInputListener(this);

		this.addEventListener('mousedown', () => {
			if (currentlyHovered && currentlyHovered.image360) {
				this.focus(currentlyHovered.image360);
			}
		});
	}

	set visible(visible: boolean) {
		if (this._visible === visible) {
			return;
		}

		for (const image of this.images) {
			if (image.mesh) {
				image.mesh.visible = visible && (this.focusedImage == null);
			}
		}

		this.sphere.visible = visible && (this.focusedImage != null);
		this._visible = visible;
		this.dispatchEvent({
			type: 'visibility_changed',
			images: this,
		});
	}

	get visible(): boolean {
		return this._visible;
	}

	focus(image360: Image360): void {
		if (this.focusedImage !== null) {
			this.unfocus();
		}

		this.previousView = {
			controls: this.viewer.controls,
			position: this.viewer.scene.view.position.clone(),
			target: this.viewer.scene.view.getPivot(),
		};

		this.viewer.setControls?.(this.viewer.orbitControls);
		if (this.viewer.orbitControls) {
			this.viewer.orbitControls.doubleClockZoomEnabled = false;
		}

		for (const image of this.images) {
			if (image.mesh) image.mesh.visible = false;
		}

		this.selectingEnabled = false;
		this.sphere.visible = false;

		this.load(image360).then(() => {
			this.sphere.visible = true;
			(this.sphere.material as any).map = image360.texture;
			(this.sphere.material as any).needsUpdate = true;
		});

		// orientation
		const { course, pitch, roll } = image360;
		this.sphere.rotation.set(
			THREE.MathUtils.degToRad(+roll + 90),
			THREE.MathUtils.degToRad(-pitch),
			THREE.MathUtils.degToRad(-course + 90),
			'ZYX'
		);

		this.sphere.position.set(...image360.position);

		const target = new THREE.Vector3(...image360.position);
		const dir = target.clone().sub(this.viewer.scene.view.position).normalize();
		const move = dir.multiplyScalar(0.000001);
		const newCamPos = target.clone().sub(move);

		this.viewer.scene.view.setView(
			newCamPos,
			target,
			500
		);

		this.focusedImage = image360;
		this.elUnfocus.style.display = '';
	}

	unfocus(): void {
		this.selectingEnabled = true;

		for (const image of this.images) {
			if (image.mesh) image.mesh.visible = true;
		}

		const image = this.focusedImage;
		if (image === null) {
			return;
		}

		(this.sphere.material as any).map = null;
		(this.sphere.material as any).needsUpdate = true;
		this.sphere.visible = false;

		if (this.viewer.orbitControls) {
			this.viewer.orbitControls.doubleClockZoomEnabled = true;
		}
		if (this.previousView.controls) {
			this.viewer.setControls?.(this.previousView.controls);
		}

		if (this.previousView.position && this.previousView.target) {
			this.viewer.scene.view.setView(
				this.previousView.position,
				this.previousView.target,
				500
			);
		}

		this.focusedImage = null;
		this.elUnfocus.style.display = 'none';
	}

	load(image360: Image360): Promise<void> {
		return new Promise(resolve => {
			const texture = new THREE.TextureLoader().load(image360.file, () => resolve());
			texture.wrapS = THREE.RepeatWrapping;
			texture.repeat.x = -1;

			image360.texture = texture;
		});
	}

	handleHovering(): void {
		const mouse = this.viewer.inputHandler?.mouse;
		const camera = this.viewer.scene.getActiveCamera();
		const domElement = this.viewer.renderer.domElement;

		if (!mouse || !camera) return;

		const ray = Utils.mouseToRay(mouse, camera, domElement.clientWidth, domElement.clientHeight);

		raycaster.ray.copy(ray);
		const intersections = raycaster.intersectObjects(this.node.children);

		if (intersections.length === 0) {
			return;
		}

		const intersection = intersections[0];
		currentlyHovered = intersection.object;
		currentlyHovered.material = smHovered;
	}

	update(): void {
		if (currentlyHovered) {
			currentlyHovered.material = sm;
			currentlyHovered = null;
		}

		if (this.selectingEnabled) {
			this.handleHovering();
		}
	}
}

export class Images360Loader {
	static async load(url: string, viewer: any, params: any = {}): Promise<Images360> {
		if (!params.transform) {
			params.transform = {
				forward: (a: any) => a,
			};
		}

		const response = await fetch(`${url}/coordinates.txt`);
		const text = await response.text();

		const lines = text.split(/\r?\n/);
		const coordinateLines = lines.slice(1);

		const images360 = new Images360(viewer);

		for (const line of coordinateLines) {
			if (line.trim().length === 0) {
				continue;
			}

			const tokens = line.split(/\t/);
			const [rawFilename, rawTime, rawLong, rawLat, rawAlt, rawCourse, rawPitch, rawRoll] = tokens;
			const time = parseFloat(rawTime);
			const long = parseFloat(rawLong);
			const lat = parseFloat(rawLat);
			const alt = parseFloat(rawAlt);
			const course = parseFloat(rawCourse);
			const pitch = parseFloat(rawPitch);
			const roll = parseFloat(rawRoll);

			const filename = rawFilename.replace(/"/g, '');
			const file = `${url}/${filename}`;

			const image360 = new Image360(file, time, long, lat, alt, course, pitch, roll);

			const xy = params.transform.forward([long, lat]);
			const position: [number, number, number] = [xy[0], xy[1], alt];
			image360.position = position;

			images360.images.push(image360);
		}

		Images360Loader.createSceneNodes(images360, params.transform);

		return images360;
	}

	static createSceneNodes(images360: Images360, transform: any): void {
		for (const image360 of images360.images) {
			const { longitude, latitude, altitude } = image360;
			const xy = transform.forward([longitude, latitude]);

			const mesh: any = new THREE.Mesh(sg, sm);
			mesh.position.set(xy[0], xy[1], altitude);
			mesh.scale.set(1, 1, 1);
			mesh.material.transparent = true;
			mesh.material.opacity = 0.75;
			mesh.image360 = image360;

			// orientation
			const { course, pitch, roll } = image360;
			mesh.rotation.set(
				THREE.MathUtils.degToRad(+roll + 90),
				THREE.MathUtils.degToRad(-pitch),
				THREE.MathUtils.degToRad(-course + 90),
				'ZYX'
			);

			images360.node.add(mesh);
			image360.mesh = mesh;
		}
	}
}
