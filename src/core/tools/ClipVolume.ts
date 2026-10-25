import * as THREE from 'three';

export interface ClipVolumeArgs {
	alpha?: number;
	beta?: number;
	gamma?: number;
	[key: string]: any;
}

export class ClipVolume extends THREE.Object3D {
	public static counter: number = 0;
	public clipOffset: number = 0.001;
	public clipRotOffset: number = 1;
	public dimension: THREE.Vector3 = new THREE.Vector3(1, 1, 1);
	public material: THREE.MeshBasicMaterial;
	public box: THREE.Mesh;
	public frame: THREE.LineSegments;
	public planeFrame: THREE.LineSegments;
	public arrowX: THREE.Object3D;
	public arrowY: THREE.Object3D;
	public arrowZ: THREE.Object3D;
	public localX: THREE.Vector3 = new THREE.Vector3(1, 0, 0);
	public localY: THREE.Vector3 = new THREE.Vector3(0, 1, 0);
	public localZ: THREE.Vector3 = new THREE.Vector3(0, 0, 1);
	public boundingBox?: THREE.Box3;
	public boundingSphere?: THREE.Sphere;

	constructor(args: ClipVolumeArgs = {}) {
		super();

		ClipVolume.counter = (ClipVolume.counter === undefined) ? 0 : ClipVolume.counter + 1;
		this.name = 'clip_volume_' + ClipVolume.counter;

		const alpha = args.alpha || 0;
		const beta = args.beta || 0;
		const gamma = args.gamma || 0;

		this.rotation.x = alpha;
		this.rotation.y = beta;
		this.rotation.z = gamma;

		this.clipOffset = 0.001;
		this.clipRotOffset = 1;

		const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
		boxGeometry.computeBoundingBox();

		const boxFramePositions: number[] = [
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
		boxFrameGeometry.setAttribute('position', new THREE.Float32BufferAttribute(boxFramePositions, 3));

		const planeFramePositions: number[] = [
			-0.5, -0.5, 0.0,  -0.5, 0.5, 0.0,
			 0.5, 0.5, 0.0,    0.5, -0.5, 0.0,
			-0.5, 0.5, 0.0,    0.5, 0.5, 0.0,
			-0.5, -0.5, 0.0,   0.5, -0.5, 0.0,
		];

		const planeFrameGeometry = new THREE.BufferGeometry();
		planeFrameGeometry.setAttribute('position', new THREE.Float32BufferAttribute(planeFramePositions, 3));

		this.dimension = new THREE.Vector3(1, 1, 1);
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
		this.planeFrame = new THREE.LineSegments(planeFrameGeometry, new THREE.LineBasicMaterial({ color: 0xff0000 }));
		this.add(this.planeFrame);

		this.setScaleZ(0.1);

		const createArrow = (name: string, _direction: THREE.Vector3, color: number) => {
			const arrowMaterial = new THREE.MeshBasicMaterial({
				color: color,
				depthTest: false,
				depthWrite: false
			});

			const shaftPositions = [0, 0, 0, 0, 1, 0];
			const shaftGeometry = new THREE.BufferGeometry();
			shaftGeometry.setAttribute('position', new THREE.Float32BufferAttribute(shaftPositions, 3));

			const shaftMaterial = new THREE.LineBasicMaterial({
				color: color,
				depthTest: false,
				depthWrite: false,
				transparent: true
			});
			const shaft = new THREE.Line(shaftGeometry, shaftMaterial);
			shaft.name = name + '_shaft';

			const headGeometry = new THREE.CylinderGeometry(0, 0.04, 0.1, 10, 1, false);
			const head = new THREE.Mesh(headGeometry, arrowMaterial);
			head.name = name + '_head';
			head.position.y = 1;

			const arrow = new THREE.Object3D();
			arrow.name = name;
			arrow.add(shaft);
			arrow.add(head);

			return arrow;
		};

		this.arrowX = createArrow('arrow_x', new THREE.Vector3(1, 0, 0), 0xFF0000);
		this.arrowY = createArrow('arrow_y', new THREE.Vector3(0, 1, 0), 0x00FF00);
		this.arrowZ = createArrow('arrow_z', new THREE.Vector3(0, 0, 1), 0x0000FF);

		this.arrowX.rotation.z = -Math.PI / 2;
		this.arrowZ.rotation.x = Math.PI / 2;

		this.arrowX.visible = false;
		this.arrowY.visible = false;
		this.arrowZ.visible = false;

		this.add(this.arrowX);
		this.add(this.arrowY);
		this.add(this.arrowZ);

		this.update();
	}

	setClipOffset(offset: number): void {
		this.clipOffset = offset;
	}

	setClipRotOffset(offset: number): void {
		this.clipRotOffset = offset;
	}

	setScaleX(x: number): void {
		this.box.scale.x = x;
		this.frame.scale.x = x;
		this.planeFrame.scale.x = x;
	}

	setScaleY(y: number): void {
		this.box.scale.y = y;
		this.frame.scale.y = y;
		this.planeFrame.scale.y = y;
	}

	setScaleZ(z: number): void {
		this.box.scale.z = z;
		this.frame.scale.z = z;
		this.planeFrame.scale.z = z;
	}

	offset(args: { cs?: string; axis?: string; dir?: number; viewer?: any }): void {
		const cs = args.cs || null;
		const axis = args.axis || null;
		const dir = args.dir || 0;

		if (!cs || !axis || !dir) return;

		if (axis === 'x') {
			if (cs === 'local') {
				this.position.add(this.localX.clone().multiplyScalar(dir * this.clipOffset));
			} else if (cs === 'global') {
				this.position.x = this.position.x + dir * this.clipOffset;
			}
		} else if (axis === 'y') {
			if (cs === 'local') {
				this.position.add(this.localY.clone().multiplyScalar(dir * this.clipOffset));
			} else if (cs === 'global') {
				this.position.y = this.position.y + dir * this.clipOffset;
			}
		} else if (axis === 'z') {
			if (cs === 'local') {
				this.position.add(this.localZ.clone().multiplyScalar(dir * this.clipOffset));
			} else if (cs === 'global') {
				this.position.z = this.position.z + dir * this.clipOffset;
			}
		}

		this.dispatchEvent({ type: 'clip_volume_changed', volume: this });
	}

	rotate(args: { cs?: string; axis?: string; dir?: number; viewer?: any }): void {
		const cs = args.cs || null;
		const axis = args.axis || null;
		const dir = args.dir || 0;

		if (!cs || !axis || !dir) return;

		if (cs === 'local') {
			if (axis === 'x') {
				this.rotateOnAxis(new THREE.Vector3(1, 0, 0), dir * this.clipRotOffset * Math.PI / 180);
			} else if (axis === 'y') {
				this.rotateOnAxis(new THREE.Vector3(0, 1, 0), dir * this.clipRotOffset * Math.PI / 180);
			} else if (axis === 'z') {
				this.rotateOnAxis(new THREE.Vector3(0, 0, 1), dir * this.clipRotOffset * Math.PI / 180);
			}
		} else if (cs === 'global') {
			let rotaxis = new THREE.Vector4(1, 0, 0, 0);
			if (axis === 'y') {
				rotaxis = new THREE.Vector4(0, 1, 0, 0);
			} else if (axis === 'z') {
				rotaxis = new THREE.Vector4(0, 0, 1, 0);
			}
			this.updateMatrixWorld();
			const invM = this.matrixWorld.clone().invert();
			rotaxis = rotaxis.applyMatrix4(invM).normalize();
			const vRotAxis = new THREE.Vector3(rotaxis.x, rotaxis.y, rotaxis.z);
			this.rotateOnAxis(vRotAxis, dir * this.clipRotOffset * Math.PI / 180);
		}

		this.updateLocalSystem();
		this.dispatchEvent({ type: 'clip_volume_changed', volume: this });
	}

	update(): void {
		this.boundingBox = this.box.geometry.boundingBox || undefined;
		if (this.boundingBox) {
			this.boundingSphere = this.boundingBox.getBoundingSphere(new THREE.Sphere());
		}
		this.box.visible = false;
		this.updateLocalSystem();
	}

	updateLocalSystem(): void {
		const rotQuat = this.getWorldQuaternion(new THREE.Quaternion());
		this.localX = new THREE.Vector3(1, 0, 0).applyQuaternion(rotQuat).normalize();
		this.localY = new THREE.Vector3(0, 1, 0).applyQuaternion(rotQuat).normalize();
		this.localZ = new THREE.Vector3(0, 0, 1).applyQuaternion(rotQuat).normalize();
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
}
