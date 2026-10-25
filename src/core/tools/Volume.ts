import * as THREE from 'three';
import { TextSprite } from './TextSprite.js';

export interface VolumeArgs {
	clip?: boolean;
	modifiable?: boolean;
	[key: string]: any;
}

export class Volume extends THREE.Object3D {
	public _clip: boolean = false;
	public _volumeVisible: boolean = true;
	public showVolumeLabel: boolean = true;
	public _modifiable: boolean = true;
	public label: TextSprite;
	public boundingBox?: THREE.Box3;
	public boundingSphere?: THREE.Sphere;

	constructor(args: VolumeArgs = {}) {
		super();

		if (this.constructor.name === 'Volume') {
			console.warn("Can't create object of class Volume directly. Use classes BoxVolume or SphereVolume instead.");
		}

		this._clip = args.clip || false;
		this._volumeVisible = true;
		this.showVolumeLabel = true;
		this._modifiable = args.modifiable !== undefined ? args.modifiable : true;

		this.label = new TextSprite('0');
		this.label.setBorderColor({ r: 0, g: 255, b: 0, a: 0.0 });
		this.label.setBackgroundColor({ r: 0, g: 255, b: 0, a: 0.0 });
		this.label.material.depthTest = false;
		this.label.material.depthWrite = false;
		this.label.material.transparent = true;
		this.label.position.y -= 0.5;
		this.add(this.label);

		this.label.updateMatrixWorld = (_force?: boolean) => {
			const volumeWorldPos = new THREE.Vector3();
			volumeWorldPos.setFromMatrixPosition(this.matrixWorld);
			this.label.position.copy(volumeWorldPos);
			this.label.updateMatrix();
			this.label.matrixWorld.copy(this.label.matrix);
			(this.label as any).matrixWorldNeedsUpdate = false;

			for (let i = 0, l = this.label.children.length; i < l; i++) {
				this.label.children[i].updateMatrixWorld(true);
			}
		};

		// Define visible property without violating Object3D inheritance
		Object.defineProperty(this, 'visible', {
			get: () => this._volumeVisible,
			set: (value: boolean) => {
				if (this._volumeVisible !== value) {
					this._volumeVisible = value;
					this.dispatchEvent({ type: 'visibility_changed', object: this });
				}
			},
			configurable: true,
			enumerable: true
		});
	}

	getVolume(): number {
		console.warn('override getVolume in subclass');
		return 0;
	}

	update(): void {}

	raycast(_raycaster: THREE.Raycaster, _intersects: THREE.Intersection[]): void {}

	get clip(): boolean {
		return this._clip;
	}

	set clip(value: boolean) {
		if (this._clip !== value) {
			this._clip = value;
			this.update();
			this.dispatchEvent({
				type: 'clip_changed',
				object: this
			});
		}
	}

	get modifiable(): boolean {
		return this._modifiable;
	}

	set modifiable(value: boolean) {
		this._modifiable = value;
		this.update();
	}

	get modifieable(): boolean {
		return this.modifiable;
	}

	set modifieable(value: boolean) {
		this.modifiable = value;
	}
}

export class BoxVolume extends Volume {
	public static counter: number = 0;
	public box: THREE.Mesh;
	public frame: THREE.LineSegments;
	public material: THREE.MeshBasicMaterial;

	constructor(args: VolumeArgs = {}) {
		super(args);

		BoxVolume.counter = (BoxVolume.counter === undefined) ? 0 : BoxVolume.counter + 1;
		this.name = 'box_' + BoxVolume.counter;

		const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
		boxGeometry.computeBoundingBox();

		const positions: number[] = [
			// bottom
			-0.5, -0.5, 0.5,   0.5, -0.5, 0.5,
			 0.5, -0.5, 0.5,   0.5, -0.5, -0.5,
			 0.5, -0.5, -0.5, -0.5, -0.5, -0.5,
			-0.5, -0.5, -0.5, -0.5, -0.5, 0.5,
			// top
			-0.5, 0.5, 0.5,    0.5, 0.5, 0.5,
			 0.5, 0.5, 0.5,    0.5, 0.5, -0.5,
			 0.5, 0.5, -0.5,  -0.5, 0.5, -0.5,
			-0.5, 0.5, -0.5,  -0.5, 0.5, 0.5,
			// sides
			-0.5, -0.5, 0.5,  -0.5, 0.5, 0.5,
			 0.5, -0.5, 0.5,   0.5, 0.5, 0.5,
			 0.5, -0.5, -0.5,  0.5, 0.5, -0.5,
			-0.5, -0.5, -0.5, -0.5, 0.5, -0.5,
		];

		const boxFrameGeometry = new THREE.BufferGeometry();
		boxFrameGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

		this.material = new THREE.MeshBasicMaterial({
			color: 0x00ff00,
			transparent: true,
			opacity: 0.3,
			depthTest: true,
			depthWrite: false
		});

		this.box = new THREE.Mesh(boxGeometry, this.material);
		this.box.geometry.computeBoundingBox();
		this.boundingBox = this.box.geometry.boundingBox || undefined;
		this.add(this.box);

		this.frame = new THREE.LineSegments(boxFrameGeometry, new THREE.LineBasicMaterial({ color: 0x000000 }));
		this.add(this.frame);

		this.update();
	}

	update(): void {
		this.boundingBox = this.box.geometry.boundingBox || undefined;
		if (this.boundingBox) {
			this.boundingSphere = this.boundingBox.getBoundingSphere(new THREE.Sphere());
		}

		if (this._clip) {
			this.box.visible = false;
			this.label.visible = false;
		} else {
			this.box.visible = true;
			this.label.visible = this.showVolumeLabel;
		}
	}

	raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]): void {
		const is: THREE.Intersection[] = [];
		this.box.raycast(raycaster, is);

		if (is.length > 0) {
			const I = is[0];
			intersects.push({
				distance: I.distance,
				object: this,
				point: I.point.clone()
			});
		}
	}

	getVolume(): number {
		return Math.abs(this.scale.x * this.scale.y * this.scale.z);
	}
}

export class SphereVolume extends Volume {
	public static counter: number = 0;
	public sphere: THREE.Mesh;
	public frame: THREE.Mesh;
	public material: THREE.MeshBasicMaterial;

	constructor(args: VolumeArgs = {}) {
		super(args);

		SphereVolume.counter = (SphereVolume.counter === undefined) ? 0 : SphereVolume.counter + 1;
		this.name = 'sphere_' + SphereVolume.counter;

		const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
		sphereGeometry.computeBoundingBox();

		this.material = new THREE.MeshBasicMaterial({
			color: 0x00ff00,
			transparent: true,
			opacity: 0.3,
			depthTest: true,
			depthWrite: false
		});
		this.sphere = new THREE.Mesh(sphereGeometry, this.material);
		this.sphere.visible = false;
		this.boundingBox = this.sphere.geometry.boundingBox || undefined;
		this.add(this.sphere);

		this.label.visible = false;

		const frameMaterial = new THREE.MeshBasicMaterial({ wireframe: true, color: 0x000000 });
		this.frame = new THREE.Mesh(sphereGeometry, frameMaterial);
		this.add(this.frame);

		this.update();
	}

	update(): void {
		this.boundingBox = this.sphere.geometry.boundingBox || undefined;
		if (this.boundingBox) {
			this.boundingSphere = this.boundingBox.getBoundingSphere(new THREE.Sphere());
		}
	}

	raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]): void {
		const is: THREE.Intersection[] = [];
		this.sphere.raycast(raycaster, is);

		if (is.length > 0) {
			const I = is[0];
			intersects.push({
				distance: I.distance,
				object: this,
				point: I.point.clone()
			});
		}
	}

	getVolume(): number {
		return (4 / 3) * Math.PI * Math.abs(this.scale.x * this.scale.y * this.scale.z);
	}
}
