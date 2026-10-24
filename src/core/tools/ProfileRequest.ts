import * as THREE from 'three';
import { Points } from '../octree/Points.js';
import { BinaryHeap } from '../utils/BinaryHeap.js';
import { lru } from '../runtime/runtime.js';

export interface ProfileSegment {
	start: THREE.Vector3;
	end: THREE.Vector3;
	cutPlane: THREE.Plane;
	halfPlane: THREE.Plane;
	length: number;
	points: Points;
}

export class ProfileData {
	public profile: any;
	public segments: ProfileSegment[] = [];
	public boundingBox: THREE.Box3 = new THREE.Box3();

	constructor(profile: any) {
		this.profile = profile;
		this.segments = [];
		this.boundingBox = new THREE.Box3();

		for (let i = 0; i < profile.points.length - 1; i++) {
			const start = profile.points[i];
			const end = profile.points[i + 1];

			const startGround = new THREE.Vector3(start.x, start.y, 0);
			const endGround = new THREE.Vector3(end.x, end.y, 0);

			const center = new THREE.Vector3().addVectors(endGround, startGround).multiplyScalar(0.5);
			const length = startGround.distanceTo(endGround);
			const side = new THREE.Vector3().subVectors(endGround, startGround).normalize();
			const up = new THREE.Vector3(0, 0, 1);
			const forward = new THREE.Vector3().crossVectors(side, up).normalize();
			const N = forward;
			const cutPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(N, startGround);
			const halfPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(side, center);

			const segment: ProfileSegment = {
				start: start,
				end: end,
				cutPlane: cutPlane,
				halfPlane: halfPlane,
				length: length,
				points: new Points()
			};

			this.segments.push(segment);
		}
	}

	size(): number {
		let size = 0;
		for (const segment of this.segments) {
			size += segment.points.numPoints;
		}
		return size;
	}
}

export class ProfileRequest {
	public pointcloud: any;
	public profile: any;
	public maxDepth: number;
	public callback: any;
	public temporaryResult: ProfileData;
	public pointsServed: number = 0;
	public highestLevelServed: number = 0;
	public priorityQueue: BinaryHeap<any>;
	public cancelRequested: boolean = false;
	private updateGeneratorInstance: Generator<boolean, void, unknown> | null = null;

	constructor(pointcloud: any, profile: any, maxDepth: number, callback: any) {
		this.pointcloud = pointcloud;
		this.profile = profile;
		this.maxDepth = maxDepth || Number.MAX_VALUE;
		this.callback = callback;
		this.temporaryResult = new ProfileData(this.profile);
		this.pointsServed = 0;
		this.highestLevelServed = 0;

		this.priorityQueue = new BinaryHeap((x: any) => 1 / x.weight);
		this.initialize();
	}

	initialize(): void {
		const root = this.pointcloud.pcoGeometry?.root || this.pointcloud.root;
		if (root) {
			this.priorityQueue.push({ node: root, weight: Infinity });
		}
	}

	traverse(node: any): void {
		const stack: any[] = [];
		for (let i = 0; i < 8; i++) {
			const child = node.children[i];
			if (child && this.pointcloud.nodeIntersectsProfile(child, this.profile)) {
				stack.push(child);
			}
		}

		while (stack.length > 0) {
			const n = stack.pop();
			const weight = n.boundingSphere.radius;
			this.priorityQueue.push({ node: n, weight: weight });

			if (n.level < this.maxDepth) {
				for (let i = 0; i < 8; i++) {
					const child = n.children[i];
					if (child && this.pointcloud.nodeIntersectsProfile(child, this.profile)) {
						stack.push(child);
					}
				}
			}
		}
	}

	update(): void {
		if (!this.updateGeneratorInstance) {
			this.updateGeneratorInstance = this.updateGenerator();
		}

		const result = this.updateGeneratorInstance.next();
		if (result.done) {
			this.updateGeneratorInstance = null;
		}
	}

	*updateGenerator(): Generator<boolean, void, unknown> {
		const maxNodesPerUpdate = 1;
		const intersectedNodes: any[] = [];

		for (let i = 0; i < Math.min(maxNodesPerUpdate, this.priorityQueue.size()); i++) {
			const element = this.priorityQueue.pop();
			if (!element) continue;
			const node = element.node;

			if (node.level > this.maxDepth) {
				continue;
			}

			if (node.loaded) {
				intersectedNodes.push(node);
				lru.touch(node);
				this.highestLevelServed = Math.max(node.getLevel ? node.getLevel() : node.level, this.highestLevelServed);

				const geom = node.pcoGeometry;
				const hierarchyStepSize = geom ? geom.hierarchyStepSize : 1;
				const doTraverse = (node.getLevel ? node.getLevel() : node.level) === 0 ||
					(node.level % hierarchyStepSize === 0 && node.hasChildren);

				if (doTraverse) {
					this.traverse(node);
				}
			} else {
				node.load();
				this.priorityQueue.push(element);
			}
		}

		if (intersectedNodes.length > 0) {
			for (const done of this.getPointsInsideProfile(intersectedNodes, this.temporaryResult)) {
				if (!done) {
					yield false;
				}
			}
			if (this.temporaryResult.size() > 100) {
				this.pointsServed += this.temporaryResult.size();
				this.callback.onProgress({ request: this, points: this.temporaryResult });
				this.temporaryResult = new ProfileData(this.profile);
			}
		}

		if (this.priorityQueue.size() === 0) {
			if (this.temporaryResult.size() > 0) {
				this.pointsServed += this.temporaryResult.size();
				this.callback.onProgress({ request: this, points: this.temporaryResult });
				this.temporaryResult = new ProfileData(this.profile);
			}

			this.callback.onFinish({ request: this });

			if (this.pointcloud.profileRequests) {
				const index = this.pointcloud.profileRequests.indexOf(this);
				if (index >= 0) {
					this.pointcloud.profileRequests.splice(index, 1);
				}
			}
		}

		yield true;
	}

	*getAccepted(
		numPoints: number,
		node: any,
		matrix: THREE.Matrix4,
		segment: ProfileSegment,
		segmentDir: THREE.Vector3,
		points: Points,
		totalMileage: number
	): Generator<boolean | [Uint32Array, Float64Array, Float32Array], void, unknown> {
		let checkpoint = performance.now();

		let accepted = new Uint32Array(numPoints);
		let mileage = new Float64Array(numPoints);
		let acceptedPositions = new Float32Array(numPoints * 3);
		let numAccepted = 0;

		const pos = new THREE.Vector3();
		const svp = new THREE.Vector3();
		const view = new Float32Array(node.geometry.attributes.position.array);

		for (let i = 0; i < numPoints; i++) {
			pos.set(view[i * 3 + 0], view[i * 3 + 1], view[i * 3 + 2]);
			pos.applyMatrix4(matrix);

			const distance = Math.abs(segment.cutPlane.distanceToPoint(pos));
			const centerDistance = Math.abs(segment.halfPlane.distanceToPoint(pos));

			if (distance < this.profile.width / 2 && centerDistance < segment.length / 2) {
				svp.subVectors(pos, segment.start);
				const localMileage = segmentDir.dot(svp);

				accepted[numAccepted] = i;
				mileage[numAccepted] = localMileage + totalMileage;
				points.boundingBox.expandByPoint(pos);

				pos.sub(this.pointcloud.position);
				acceptedPositions[3 * numAccepted + 0] = pos.x;
				acceptedPositions[3 * numAccepted + 1] = pos.y;
				acceptedPositions[3 * numAccepted + 2] = pos.z;

				numAccepted++;
			}

			if ((i % 1000) === 0) {
				const duration = performance.now() - checkpoint;
				if (duration > 4) {
					yield false;
					checkpoint = performance.now();
				}
			}
		}

		accepted = accepted.subarray(0, numAccepted);
		mileage = mileage.subarray(0, numAccepted);
		acceptedPositions = acceptedPositions.subarray(0, numAccepted * 3);

		yield [accepted, mileage, acceptedPositions];
	}

	*getPointsInsideProfile(nodes: any[], target: ProfileData): Generator<boolean, void, unknown> {
		let checkpoint = performance.now();
		let totalMileage = 0;

		for (const segment of target.segments) {
			for (const node of nodes) {
				const numPoints = node.numPoints;
				const geometry = node.geometry;

				if (!numPoints || !geometry) continue;

				{
					const bbWorld = node.boundingBox.clone().applyMatrix4(this.pointcloud.matrixWorld);
					const bsWorld = bbWorld.getBoundingSphere(new THREE.Sphere());

					const start = new THREE.Vector3(segment.start.x, segment.start.y, bsWorld.center.z);
					const end = new THREE.Vector3(segment.end.x, segment.end.y, bsWorld.center.z);

					const closest = new THREE.Line3(start, end).closestPointToPoint(bsWorld.center, true, new THREE.Vector3());
					const distance = closest.distanceTo(bsWorld.center);
					const intersects = distance < (bsWorld.radius + target.profile.width);

					if (!intersects) continue;
				}

				const sv = new THREE.Vector3().subVectors(segment.end, segment.start).setZ(0);
				const segmentDir = sv.clone().normalize();
				const points = new Points();

				const minPos = node.boundingBox.min;
				const nodeMatrix = new THREE.Matrix4().makeTranslation(minPos.x, minPos.y, minPos.z);
				const matrix = new THREE.Matrix4().multiplyMatrices(this.pointcloud.matrixWorld, nodeMatrix);

				let accepted: Uint32Array | null = null;
				let mileage: Float64Array | null = null;
				let acceptedPositions: Float32Array | null = null;

				for (const result of this.getAccepted(numPoints, node, matrix, segment, segmentDir, points, totalMileage)) {
					if (typeof result === 'boolean') {
						yield false;
						checkpoint = performance.now();
					} else {
						[accepted, mileage, acceptedPositions] = result;
					}
				}

				const duration = performance.now() - checkpoint;
				if (duration > 4) {
					yield false;
					checkpoint = performance.now();
				}

				if (!accepted || !mileage || !acceptedPositions) continue;

				points.data.position = acceptedPositions;

				const relevantAttributes = Object.keys(geometry.attributes).filter((a) => !['position', 'indices'].includes(a));
				for (const attributeName of relevantAttributes) {
					const attribute = geometry.attributes[attributeName];
					const numElements = attribute.array.length / numPoints;
					const Type = attribute.array.constructor as any;
					const filteredBuffer = new Type(numElements * accepted.length);
					const source = attribute.array;

					for (let i = 0; i < accepted.length; i++) {
						const index = accepted[i];
						const start = index * numElements;
						const end = start + numElements;
						const sub = source.subarray(start, end);
						filteredBuffer.set(sub, i * numElements);
					}

					points.data[attributeName] = filteredBuffer;
				}

				points.data['mileage'] = mileage;
				points.numPoints = accepted.length;

				segment.points.add(points);
			}

			totalMileage += segment.length;
		}

		for (const segment of target.segments) {
			target.boundingBox.union(segment.points.boundingBox);
		}

		yield true;
	}

	finishLevelThenCancel(): void {
		if (this.cancelRequested) return;
		this.maxDepth = this.highestLevelServed;
		this.cancelRequested = true;
	}

	cancel(): void {
		if (this.callback && this.callback.onCancel) {
			this.callback.onCancel();
		}

		this.priorityQueue = new BinaryHeap((x: any) => 1 / x.weight);

		if (this.pointcloud && this.pointcloud.profileRequests) {
			const index = this.pointcloud.profileRequests.indexOf(this);
			if (index >= 0) {
				this.pointcloud.profileRequests.splice(index, 1);
			}
		}
	}
}
