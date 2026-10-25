import * as THREE from 'three';
import { Utils } from '../utils/Utils.js';

export class Profile extends THREE.Object3D {
	public static counter: number = 0;
	public points: THREE.Vector3[] = [];
	public spheres: THREE.Mesh[] = [];
	public edges: THREE.Line[] = [];
	public boxes: THREE.Mesh[] = [];
	public width: number = 1;
	public height: number = 20;
	public _modifiable: boolean = true;
	public sphereGeometry: THREE.SphereGeometry;
	public color: THREE.Color = new THREE.Color(0xff0000);
	public lineColor: THREE.Color = new THREE.Color(0xff0000);

	constructor() {
		super();

		Profile.counter = (Profile.counter === undefined) ? 0 : Profile.counter + 1;
		this.name = 'Profile_' + Profile.counter;
		this.points = [];
		this.spheres = [];
		this.edges = [];
		this.boxes = [];
		this.width = 1;
		this.height = 20;
		this._modifiable = true;

		this.sphereGeometry = new THREE.SphereGeometry(0.4, 10, 10);
		this.color = new THREE.Color(0xff0000);
		this.lineColor = new THREE.Color(0xff0000);
	}

	createSphereMaterial(): THREE.MeshLambertMaterial {
		return new THREE.MeshLambertMaterial({
			color: 0xff0000,
			depthTest: false,
			depthWrite: false
		});
	}

	getSegments(): Array<{ start: THREE.Vector3; end: THREE.Vector3 }> {
		const segments: Array<{ start: THREE.Vector3; end: THREE.Vector3 }> = [];
		for (let i = 0; i < this.points.length - 1; i++) {
			const start = this.points[i].clone();
			const end = this.points[i + 1].clone();
			segments.push({ start, end });
		}
		return segments;
	}

	getSegmentMatrices(): THREE.Matrix4[] {
		const segments = this.getSegments();
		const matrices: THREE.Matrix4[] = [];

		for (const segment of segments) {
			const { start, end } = segment;
			const box = new THREE.Object3D();

			const length = start.clone().setZ(0).distanceTo(end.clone().setZ(0));
			box.scale.set(length, 10000, this.width);
			box.up.set(0, 0, 1);

			const center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
			const diff = new THREE.Vector3().subVectors(end, start);
			const target = new THREE.Vector3(diff.y, -diff.x, 0);

			box.position.set(0, 0, 0);
			box.lookAt(target);
			box.position.copy(center);

			box.updateMatrixWorld();
			matrices.push(box.matrixWorld);
		}

		return matrices;
	}

	addMarker(point: THREE.Vector3): void {
		this.points.push(point);

		const sphere = new THREE.Mesh(this.sphereGeometry, this.createSphereMaterial());
		this.add(sphere);
		this.spheres.push(sphere);

		if (this.points.length > 1) {
			const positions = new Float32Array([0, 0, 0, 0, 0, 0]);
			const lineGeometry = new THREE.BufferGeometry();
			lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

			const lineMaterial = new THREE.LineBasicMaterial({
				color: this.lineColor,
				linewidth: 2,
				transparent: true,
				opacity: 0.4,
				depthTest: false
			});
			const edge = new THREE.Line(lineGeometry, lineMaterial);
			edge.visible = false;
			this.add(edge);
			this.edges.push(edge);

			const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
			const boxMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.2 });
			const box = new THREE.Mesh(boxGeometry, boxMaterial);
			box.visible = false;
			this.add(box);
			this.boxes.push(box);
		}

		const drag = (e: any) => {
			const I = Utils.getMousePointCloudIntersection(
				e.drag.end,
				e.viewer.scene.getActiveCamera(),
				e.viewer,
				e.viewer.scene.pointclouds
			);

			if (I) {
				const i = this.spheres.indexOf(e.drag.object);
				if (i !== -1) {
					this.setPosition(i, I.location);
				}
			}
		};

		const drop = (e: any) => {
			const i = this.spheres.indexOf(e.drag.object);
			if (i !== -1) {
				this.dispatchEvent({
					type: 'marker_dropped',
					profile: this,
					index: i
				});
			}
		};

		const mouseover = (e: any) => (e.object.material as any).emissive?.setHex(0x888888);
		const mouseleave = (e: any) => (e.object.material as any).emissive?.setHex(0x000000);

		(sphere as any).addEventListener('drag', drag);
		(sphere as any).addEventListener('drop', drop);
		(sphere as any).addEventListener('mouseover', mouseover);
		(sphere as any).addEventListener('mouseleave', mouseleave);

		this.dispatchEvent({
			type: 'marker_added',
			profile: this,
			sphere: sphere
		});

		this.setPosition(this.points.length - 1, point);
	}

	removeMarker(index: number): void {
		this.points.splice(index, 1);
		this.remove(this.spheres[index]);

		const edgeIndex = (index === 0) ? 0 : (index - 1);
		if (this.edges[edgeIndex]) {
			this.remove(this.edges[edgeIndex]);
			this.edges.splice(edgeIndex, 1);
		}
		if (this.boxes[edgeIndex]) {
			this.remove(this.boxes[edgeIndex]);
			this.boxes.splice(edgeIndex, 1);
		}

		this.spheres.splice(index, 1);
		this.update();

		this.dispatchEvent({
			type: 'marker_removed',
			profile: this
		});
	}

	setPosition(index: number, position: THREE.Vector3): void {
		const point = this.points[index];
		point.copy(position);

		this.dispatchEvent({
			type: 'marker_moved',
			profile: this,
			index: index,
			position: point.clone()
		});

		this.update();
	}

	setWidth(width: number): void {
		this.width = width;
		this.dispatchEvent({
			type: 'width_changed',
			profile: this,
			width: width
		});
		this.update();
	}

	getWidth(): number {
		return this.width;
	}

	update(): void {
		if (this.points.length === 0) {
			return;
		} else if (this.points.length === 1) {
			this.spheres[0].position.copy(this.points[0]);
			return;
		}

		const min = this.points[0].clone();
		const max = this.points[0].clone();
		const centroid = new THREE.Vector3();
		const lastIndex = this.points.length - 1;

		for (let i = 0; i <= lastIndex; i++) {
			const point = this.points[i];
			const sphere = this.spheres[i];
			const leftIndex = (i === 0) ? lastIndex : i - 1;
			const leftVertex = this.points[leftIndex];
			const leftEdge = this.edges[leftIndex];
			const rightEdge = this.edges[i];
			const leftBox = this.boxes[leftIndex];

			sphere.position.copy(point);
			sphere.visible = this._modifiable;

			if (leftEdge) {
				const attr = (leftEdge.geometry as THREE.BufferGeometry).attributes.position as THREE.BufferAttribute;
				const arr = attr.array as Float32Array;
				arr[3] = point.x; arr[4] = point.y; arr[5] = point.z;
				attr.needsUpdate = true;
				leftEdge.geometry.computeBoundingSphere();
			}

			if (rightEdge) {
				const attr = (rightEdge.geometry as THREE.BufferGeometry).attributes.position as THREE.BufferAttribute;
				const arr = attr.array as Float32Array;
				arr[0] = point.x; arr[1] = point.y; arr[2] = point.z;
				attr.needsUpdate = true;
				rightEdge.geometry.computeBoundingSphere();
			}

			if (leftBox) {
				const start = leftVertex;
				const end = point;
				const length = start.clone().setZ(0).distanceTo(end.clone().setZ(0));
				leftBox.scale.set(length, 1000000, this.width);
				leftBox.up.set(0, 0, 1);

				const center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
				const diff = new THREE.Vector3().subVectors(end, start);
				const target = new THREE.Vector3(diff.y, -diff.x, 0);

				leftBox.position.set(0, 0, 0);
				leftBox.lookAt(target);
				leftBox.position.copy(center);
			}

			centroid.add(point);
			min.min(point);
			max.max(point);
		}

		centroid.multiplyScalar(1 / this.points.length);

		for (let i = 0; i < this.boxes.length; i++) {
			const box = this.boxes[i];
			box.position.z = min.z + (max.z - min.z) / 2;
		}
	}

	raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]): void {
		for (let i = 0; i < this.points.length; i++) {
			this.spheres[i].raycast(raycaster, intersects);
		}

		for (let i = 0; i < intersects.length; i++) {
			const I = intersects[i];
			I.distance = raycaster.ray.origin.distanceTo(I.point);
		}
		intersects.sort((a, b) => a.distance - b.distance);
	}

	get modifiable(): boolean {
		return this._modifiable;
	}

	set modifiable(value: boolean) {
		this._modifiable = value;
		this.update();
	}
}
