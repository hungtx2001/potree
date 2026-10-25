import * as THREE from 'three';
import { TextSprite } from './TextSprite.js';
import { Utils } from '../utils/Utils.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

export interface MeasurePoint {
	position: THREE.Vector3;
	[key: string]: any;
}

function createHeightLine(): Line2 {
	const lineGeometry = new LineGeometry();
	lineGeometry.setPositions([0, 0, 0, 0, 0, 0]);

	const lineMaterial = new LineMaterial({
		color: 0x00ff00,
		dashSize: 5,
		gapSize: 2,
		linewidth: 2,
		resolution: new THREE.Vector2(1000, 1000),
	});

	lineMaterial.depthTest = false;
	const heightEdge = new Line2(lineGeometry, lineMaterial);
	heightEdge.visible = false;
	return heightEdge;
}

function createHeightLabel(): TextSprite {
	const heightLabel = new TextSprite('');
	heightLabel.setTextColor({ r: 140, g: 250, b: 140, a: 1.0 });
	heightLabel.setBorderColor({ r: 0, g: 0, b: 0, a: 1.0 });
	heightLabel.setBackgroundColor({ r: 0, g: 0, b: 0, a: 1.0 });
	heightLabel.fontsize = 16;
	heightLabel.material.depthTest = false;
	heightLabel.material.opacity = 1;
	heightLabel.visible = false;
	return heightLabel;
}

function createAreaLabel(): TextSprite {
	const areaLabel = new TextSprite('');
	areaLabel.setTextColor({ r: 140, g: 250, b: 140, a: 1.0 });
	areaLabel.setBorderColor({ r: 0, g: 0, b: 0, a: 1.0 });
	areaLabel.setBackgroundColor({ r: 0, g: 0, b: 0, a: 1.0 });
	areaLabel.fontsize = 16;
	areaLabel.material.depthTest = false;
	areaLabel.material.opacity = 1;
	areaLabel.visible = false;
	return areaLabel;
}

function createCircleRadiusLabel(): TextSprite {
	const circleRadiusLabel = new TextSprite('');
	circleRadiusLabel.setTextColor({ r: 140, g: 250, b: 140, a: 1.0 });
	circleRadiusLabel.setBorderColor({ r: 0, g: 0, b: 0, a: 1.0 });
	circleRadiusLabel.setBackgroundColor({ r: 0, g: 0, b: 0, a: 1.0 });
	circleRadiusLabel.fontsize = 16;
	circleRadiusLabel.material.depthTest = false;
	circleRadiusLabel.material.opacity = 1;
	circleRadiusLabel.visible = false;
	return circleRadiusLabel;
}

function createCircleRadiusLine(): Line2 {
	const lineGeometry = new LineGeometry();
	lineGeometry.setPositions([0, 0, 0, 0, 0, 0]);

	const lineMaterial = new LineMaterial({
		color: 0xff0000,
		linewidth: 2,
		resolution: new THREE.Vector2(1000, 1000),
		gapSize: 1,
		dashed: true,
	});

	lineMaterial.depthTest = false;
	const circleRadiusLine = new Line2(lineGeometry, lineMaterial);
	circleRadiusLine.visible = false;
	return circleRadiusLine;
}

function createCircleLine(): Line2 {
	const coordinates: number[] = [];
	const n = 128;
	for (let i = 0; i <= n; i++) {
		const u0 = 2 * Math.PI * (i / n);
		const u1 = 2 * Math.PI * (i + 1) / n;

		const p0 = new THREE.Vector3(Math.cos(u0), Math.sin(u0), 0);
		const p1 = new THREE.Vector3(Math.cos(u1), Math.sin(u1), 0);

		coordinates.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
	}

	const geometry = new LineGeometry();
	geometry.setPositions(coordinates);

	const material = new LineMaterial({
		color: 0xff0000,
		dashSize: 5,
		gapSize: 2,
		linewidth: 2,
		resolution: new THREE.Vector2(1000, 1000),
	});

	material.depthTest = false;
	const circleLine = new Line2(geometry, material);
	circleLine.visible = false;
	circleLine.computeLineDistances();
	return circleLine;
}

function createCircleCenter(): THREE.Mesh {
	const sg = new THREE.SphereGeometry(1, 32, 32);
	const sm = new THREE.MeshNormalMaterial();
	const circleCenter = new THREE.Mesh(sg, sm);
	circleCenter.visible = false;
	return circleCenter;
}

function createLine(): Line2 {
	const geometry = new LineGeometry();
	geometry.setPositions([0, 0, 0, 0, 0, 0]);

	const material = new LineMaterial({
		color: 0xff0000,
		linewidth: 2,
		resolution: new THREE.Vector2(1000, 1000),
		gapSize: 1,
		dashed: true,
	});

	material.depthTest = false;
	return new Line2(geometry, material);
}

function createCircle(): Line2 {
	const coordinates: number[] = [];
	const n = 128;
	for (let i = 0; i <= n; i++) {
		const u0 = 2 * Math.PI * (i / n);
		const u1 = 2 * Math.PI * (i + 1) / n;
		const p0 = new THREE.Vector3(Math.cos(u0), Math.sin(u0), 0);
		const p1 = new THREE.Vector3(Math.cos(u1), Math.sin(u1), 0);
		coordinates.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
	}

	const geometry = new LineGeometry();
	geometry.setPositions(coordinates);

	const material = new LineMaterial({
		color: 0xff0000,
		dashSize: 5,
		gapSize: 2,
		linewidth: 2,
		resolution: new THREE.Vector2(1000, 1000),
	});

	material.depthTest = false;
	const line = new Line2(geometry, material);
	line.computeLineDistances();
	return line;
}

function createAzimuth(): any {
	const azimuth: any = {
		label: null,
		center: null,
		target: null,
		north: null,
		centerToNorth: null,
		centerToTarget: null,
		centerToTargetground: null,
		targetgroundToTarget: null,
		circle: null,
		node: null,
	};

	const sg = new THREE.SphereGeometry(1, 32, 32);
	const sm = new THREE.MeshNormalMaterial();

	const label = new TextSprite('');
	label.setTextColor({ r: 140, g: 250, b: 140, a: 1.0 });
	label.setBorderColor({ r: 0, g: 0, b: 0, a: 1.0 });
	label.setBackgroundColor({ r: 0, g: 0, b: 0, a: 1.0 });
	label.fontsize = 16;
	label.material.depthTest = false;
	label.material.opacity = 1;

	azimuth.label = label;
	azimuth.center = new THREE.Mesh(sg, sm);
	azimuth.target = new THREE.Mesh(sg, sm);
	azimuth.north = new THREE.Mesh(sg, sm);
	azimuth.centerToNorth = createLine();
	azimuth.centerToTarget = createLine();
	azimuth.centerToTargetground = createLine();
	azimuth.targetgroundToTarget = createLine();
	azimuth.circle = createCircle();

	azimuth.node = new THREE.Object3D();
	azimuth.node.add(
		azimuth.centerToNorth,
		azimuth.centerToTarget,
		azimuth.centerToTargetground,
		azimuth.targetgroundToTarget,
		azimuth.circle,
		azimuth.label,
		azimuth.center,
		azimuth.target,
		azimuth.north
	);

	return azimuth;
}

export class Measure extends THREE.Object3D {
	public static counter: number = 0;
	public points: MeasurePoint[] = [];
	public _showDistances: boolean = true;
	public _showCoordinates: boolean = false;
	public _showArea: boolean = false;
	public _closed: boolean = true;
	public _showAngles: boolean = false;
	public _showCircle: boolean = false;
	public _showHeight: boolean = false;
	public _showEdges: boolean = true;
	public _showAzimuth: boolean = false;
	public maxMarkers: number = Number.MAX_SAFE_INTEGER;

	public sphereGeometry: THREE.SphereGeometry;
	public color: THREE.Color = new THREE.Color(0xff0000);

	public spheres: THREE.Mesh[] = [];
	public edges: Line2[] = [];
	public sphereLabels: TextSprite[] = [];
	public edgeLabels: TextSprite[] = [];
	public angleLabels: TextSprite[] = [];
	public coordinateLabels: TextSprite[] = [];

	public heightEdge: Line2;
	public heightLabel: TextSprite;
	public areaLabel: TextSprite;
	public circleRadiusLabel: TextSprite;
	public circleRadiusLine: Line2;
	public circleLine: Line2;
	public circleCenter: THREE.Mesh;
	public azimuth: any;
	public lengthUnit: any = null;
	public lengthUnitDisplay: any = null;

	constructor() {
		super();

		Measure.counter = (Measure.counter === undefined) ? 0 : Measure.counter + 1;
		this.name = 'Measure_' + Measure.counter;
		this.points = [];
		this._showDistances = true;
		this._showCoordinates = false;
		this._showArea = false;
		this._closed = true;
		this._showAngles = false;
		this._showCircle = false;
		this._showHeight = false;
		this._showEdges = true;
		this._showAzimuth = false;
		this.maxMarkers = Number.MAX_SAFE_INTEGER;

		this.sphereGeometry = new THREE.SphereGeometry(0.4, 10, 10);
		this.color = new THREE.Color(0xff0000);

		this.spheres = [];
		this.edges = [];
		this.sphereLabels = [];
		this.edgeLabels = [];
		this.angleLabels = [];
		this.coordinateLabels = [];

		this.heightEdge = createHeightLine();
		this.heightLabel = createHeightLabel();
		this.areaLabel = createAreaLabel();
		this.circleRadiusLabel = createCircleRadiusLabel();
		this.circleRadiusLine = createCircleRadiusLine();
		this.circleLine = createCircleLine();
		this.circleCenter = createCircleCenter();

		this.azimuth = createAzimuth();

		this.add(this.heightEdge);
		this.add(this.heightLabel);
		this.add(this.areaLabel);
		this.add(this.circleRadiusLabel);
		this.add(this.circleRadiusLine);
		this.add(this.circleLine);
		this.add(this.circleCenter);
		this.add(this.azimuth.node);
	}

	createSphereMaterial(): THREE.MeshLambertMaterial {
		return new THREE.MeshLambertMaterial({
			color: this.color,
			depthTest: false,
			depthWrite: false
		});
	}

	addMarker(point: THREE.Vector3 | [number, number, number] | MeasurePoint): void {
		let pt: MeasurePoint;
		if (point instanceof THREE.Vector3) {
			pt = { position: point };
		} else if (Array.isArray(point)) {
			pt = { position: new THREE.Vector3(...point) };
		} else if (point && (point as any).position) {
			pt = point as MeasurePoint;
		} else {
			return;
		}

		this.points.push(pt);

		const sphere = new THREE.Mesh(this.sphereGeometry, this.createSphereMaterial());
		this.add(sphere);
		this.spheres.push(sphere);

		{ // edge
			const lineGeometry = new LineGeometry();
			lineGeometry.setPositions([0, 0, 0, 0, 0, 0]);

			const lineMaterial = new LineMaterial({
				color: 0xff0000,
				linewidth: 2,
				resolution: new THREE.Vector2(1000, 1000),
			});
			lineMaterial.depthTest = false;

			const edge = new Line2(lineGeometry, lineMaterial);
			edge.visible = true;
			this.add(edge);
			this.edges.push(edge);
		}

		{ // edge label
			const edgeLabel = new TextSprite();
			edgeLabel.setBorderColor({ r: 0, g: 0, b: 0, a: 1.0 });
			edgeLabel.setBackgroundColor({ r: 0, g: 0, b: 0, a: 1.0 });
			edgeLabel.material.depthTest = false;
			edgeLabel.visible = false;
			edgeLabel.fontsize = 16;
			this.edgeLabels.push(edgeLabel);
			this.add(edgeLabel);
		}

		{ // angle label
			const angleLabel = new TextSprite();
			angleLabel.setBorderColor({ r: 0, g: 0, b: 0, a: 1.0 });
			angleLabel.setBackgroundColor({ r: 0, g: 0, b: 0, a: 1.0 });
			angleLabel.fontsize = 16;
			angleLabel.material.depthTest = false;
			angleLabel.material.opacity = 1;
			angleLabel.visible = false;
			this.angleLabels.push(angleLabel);
			this.add(angleLabel);
		}

		{ // coordinate label
			const coordinateLabel = new TextSprite();
			coordinateLabel.setBorderColor({ r: 0, g: 0, b: 0, a: 1.0 });
			coordinateLabel.setBackgroundColor({ r: 0, g: 0, b: 0, a: 1.0 });
			coordinateLabel.fontsize = 16;
			coordinateLabel.material.depthTest = false;
			coordinateLabel.material.opacity = 1;
			coordinateLabel.visible = false;
			this.coordinateLabels.push(coordinateLabel);
			this.add(coordinateLabel);
		}

		const drag = (e: any) => {
			const I = Utils.getMousePointCloudIntersection(
				e.drag.end,
				e.viewer.scene.getActiveCamera(),
				e.viewer,
				e.viewer.scene.pointclouds,
				{ pickClipped: true }
			);

			if (I) {
				const i = this.spheres.indexOf(e.drag.object);
				if (i !== -1) {
					const currPoint = this.points[i];
					for (const key of Object.keys(currPoint)) {
						if (!I.point[key]) {
							delete currPoint[key];
						}
					}
					for (const key of Object.keys(I.point).filter((k) => k !== 'position')) {
						currPoint[key] = I.point[key];
					}
					this.setPosition(i, I.location);
				}
			}
		};

		const drop = (e: any) => {
			const i = this.spheres.indexOf(e.drag.object);
			if (i !== -1) {
				this.dispatchEvent({
					type: 'marker_dropped',
					measurement: this,
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
			measurement: this,
			sphere: sphere
		});

		this.setMarker(this.points.length - 1, pt);
	}

	removeMarker(index: number): void {
		this.points.splice(index, 1);
		this.remove(this.spheres[index]);

		const edgeIndex = (index === 0) ? 0 : (index - 1);
		if (this.edges[edgeIndex]) {
			this.remove(this.edges[edgeIndex]);
			this.edges.splice(edgeIndex, 1);
		}
		if (this.edgeLabels[edgeIndex]) {
			this.remove(this.edgeLabels[edgeIndex]);
			this.edgeLabels.splice(edgeIndex, 1);
		}
		this.coordinateLabels.splice(index, 1);

		if (this.angleLabels[index]) {
			this.remove(this.angleLabels[index]);
			this.angleLabels.splice(index, 1);
		}

		this.spheres.splice(index, 1);
		this.update();

		this.dispatchEvent({ type: 'marker_removed', measurement: this });
	}

	setMarker(index: number, point: MeasurePoint): void {
		this.points[index] = point;

		this.dispatchEvent({
			type: 'marker_moved',
			measure: this,
			index: index,
			position: point.position.clone()
		});

		this.update();
	}

	setPosition(index: number, position: THREE.Vector3): void {
		const point = this.points[index];
		point.position.copy(position);

		this.dispatchEvent({
			type: 'marker_moved',
			measure: this,
			index: index,
			position: position.clone()
		});

		this.update();
	}

	getArea(): number {
		let area = 0;
		let j = this.points.length - 1;

		for (let i = 0; i < this.points.length; i++) {
			const p1 = this.points[i].position;
			const p2 = this.points[j].position;
			area += (p2.x + p1.x) * (p1.y - p2.y);
			j = i;
		}

		return Math.abs(area / 2);
	}

	getTotalDistance(): number {
		if (this.points.length === 0) {
			return 0;
		}

		let distance = 0;
		for (let i = 1; i < this.points.length; i++) {
			const prev = this.points[i - 1].position;
			const curr = this.points[i].position;
			distance += prev.distanceTo(curr);
		}

		if (this.closed && this.points.length > 1) {
			const first = this.points[0].position;
			const last = this.points[this.points.length - 1].position;
			distance += last.distanceTo(first);
		}

		return distance;
	}

	getAngleBetweenLines(cornerPoint: MeasurePoint, point1: MeasurePoint, point2: MeasurePoint): number {
		const v1 = new THREE.Vector3().subVectors(point1.position, cornerPoint.position);
		const v2 = new THREE.Vector3().subVectors(point2.position, cornerPoint.position);
		const denominator = Math.sqrt(v1.lengthSq() * v2.lengthSq());
		if (denominator === 0) {
			return 0;
		} else {
			return v1.angleTo(v2);
		}
	}

	getAngle(index: number): number {
		if (this.points.length < 3 || index >= this.points.length) {
			return 0;
		}

		const previous = (index === 0) ? this.points[this.points.length - 1] : this.points[index - 1];
		const point = this.points[index];
		const next = this.points[(index + 1) % this.points.length];

		return this.getAngleBetweenLines(point, previous, next);
	}

	update(): void {
		if (this.points.length === 0) {
			return;
		} else if (this.points.length === 1) {
			const point = this.points[0];
			const position = point.position;
			this.spheres[0].position.copy(position);

			const coordinateLabel = this.coordinateLabels[0];
			if (coordinateLabel) {
				const msg = position.toArray().map((p) => Utils.addCommas(p.toFixed(2))).join(' / ');
				coordinateLabel.setText(msg);
				coordinateLabel.visible = this.showCoordinates;
			}
			return;
		}

		const lastIndex = this.points.length - 1;
		const centroid = new THREE.Vector3();
		for (let i = 0; i <= lastIndex; i++) {
			centroid.add(this.points[i].position);
		}
		centroid.divideScalar(this.points.length);

		for (let i = 0; i <= lastIndex; i++) {
			const index = i;
			const nextIndex = (i + 1 > lastIndex) ? 0 : i + 1;
			const previousIndex = (i === 0) ? lastIndex : i - 1;

			const point = this.points[index];
			const nextPoint = this.points[nextIndex];
			const previousPoint = this.points[previousIndex];
			const sphere = this.spheres[index];

			sphere.position.copy(point.position);
			(sphere.material as any).color = this.color;

			const edge = this.edges[index];
			if (edge) {
				(edge.material as any).color = this.color;
				edge.position.copy(point.position);
				const sub = nextPoint.position.clone().sub(point.position);
				edge.geometry.setPositions([0, 0, 0, sub.x, sub.y, sub.z]);
				edge.geometry.computeBoundingSphere();
				edge.computeLineDistances();
				edge.visible = (index < lastIndex || this.closed) && this.showEdges;
			}

			const edgeLabel = this.edgeLabels[i];
			if (edgeLabel) {
				const center = new THREE.Vector3().add(point.position).add(nextPoint.position).multiplyScalar(0.5);
				let distance = point.position.distanceTo(nextPoint.position);
				edgeLabel.position.copy(center);

				let suffix = '';
				if (this.lengthUnit != null && this.lengthUnitDisplay != null) {
					distance = distance / this.lengthUnit.unitspermeter * this.lengthUnitDisplay.unitspermeter;
					suffix = this.lengthUnitDisplay.code;
				}

				const txtLength = Utils.addCommas(distance.toFixed(2));
				edgeLabel.setText(`${txtLength} ${suffix}`);
				edgeLabel.visible = this.showDistances && (index < lastIndex || this.closed) && this.points.length >= 2 && distance > 0;
			}

			const angleLabel = this.angleLabels[i];
			if (angleLabel) {
				const angle = this.getAngleBetweenLines(point, previousPoint, nextPoint);
				const dir = nextPoint.position.clone().sub(previousPoint.position).multiplyScalar(0.5);
				const dirNorm = previousPoint.position.clone().add(dir).sub(point.position).normalize();
				const dist = Math.min(point.position.distanceTo(previousPoint.position), point.position.distanceTo(nextPoint.position)) / 9;
				const labelPos = point.position.clone().add(dirNorm.multiplyScalar(dist));
				angleLabel.position.copy(labelPos);

				const msg = Utils.addCommas((angle * (180.0 / Math.PI)).toFixed(1)) + '\u00B0';
				angleLabel.setText(msg);
				angleLabel.visible = this.showAngles && (index < lastIndex || this.closed) && this.points.length >= 3 && angle > 0;
			}
		}

		{ // update height
			const heightEdge = this.heightEdge;
			heightEdge.visible = this.showHeight;
			this.heightLabel.visible = this.showHeight;

			if (this.showHeight) {
				const sorted = this.points.slice().sort((a, b) => a.position.z - b.position.z);
				const lowPoint = sorted[0].position.clone();
				const highPoint = sorted[sorted.length - 1].position.clone();
				let height = highPoint.z - lowPoint.z;

				const start = new THREE.Vector3(highPoint.x, highPoint.y, lowPoint.z);
				const end = new THREE.Vector3(highPoint.x, highPoint.y, highPoint.z);

				heightEdge.position.copy(lowPoint);
				const sSub = start.clone().sub(lowPoint);
				const eSub = end.clone().sub(lowPoint);

				heightEdge.geometry.setPositions([0, 0, 0, sSub.x, sSub.y, sSub.z, sSub.x, sSub.y, sSub.z, eSub.x, eSub.y, eSub.z]);
				heightEdge.geometry.computeBoundingSphere();
				heightEdge.computeLineDistances();

				const heightLabelPosition = start.clone().add(end).multiplyScalar(0.5);
				this.heightLabel.position.copy(heightLabelPosition);

				let suffix = '';
				if (this.lengthUnit != null && this.lengthUnitDisplay != null) {
					height = height / this.lengthUnit.unitspermeter * this.lengthUnitDisplay.unitspermeter;
					suffix = this.lengthUnitDisplay.code;
				}

				const txtHeight = Utils.addCommas(height.toFixed(2));
				this.heightLabel.setText(`${txtHeight} ${suffix}`);
			}
		}

		{ // update circle
			const circleOkay = this.points.length === 3;
			this.circleRadiusLabel.visible = this.showCircle && circleOkay;
			this.circleRadiusLine.visible = this.showCircle && circleOkay;
			this.circleLine.visible = this.showCircle && circleOkay;
			this.circleCenter.visible = this.showCircle && circleOkay;

			if (this.showCircle && circleOkay) {
				const A = this.points[0].position;
				const B = this.points[1].position;
				const C = this.points[2].position;
				const AB = B.clone().sub(A);
				const AC = C.clone().sub(A);
				const N = AC.clone().cross(AB).normalize();

				const center = Utils.computeCircleCenter(A, B, C);
				const radius = center.distanceTo(A);
				const scale = radius / 20;

				this.circleCenter.position.copy(center);
				this.circleCenter.scale.set(scale, scale, scale);

				const bSub = B.clone().sub(center);
				this.circleRadiusLine.geometry.setPositions([0, 0, 0, bSub.x, bSub.y, bSub.z]);
				this.circleRadiusLine.geometry.computeBoundingSphere();
				this.circleRadiusLine.position.copy(center);
				this.circleRadiusLine.computeLineDistances();

				const target = center.clone().add(N);
				this.circleLine.position.copy(center);
				this.circleLine.scale.set(radius, radius, radius);
				this.circleLine.lookAt(target);

				this.circleRadiusLabel.visible = true;
				this.circleRadiusLabel.position.copy(center.clone().add(B).multiplyScalar(0.5));
				this.circleRadiusLabel.setText(`${radius.toFixed(3)}`);
			}
		}

		{ // update area label
			this.areaLabel.position.copy(centroid);
			this.areaLabel.visible = this.showArea && this.points.length >= 3;
			let area = this.getArea();

			let suffix = '';
			if (this.lengthUnit != null && this.lengthUnitDisplay != null) {
				area = area / Math.pow(this.lengthUnit.unitspermeter, 2) * Math.pow(this.lengthUnitDisplay.unitspermeter, 2);
				suffix = this.lengthUnitDisplay.code;
			}

			const txtArea = Utils.addCommas(area.toFixed(1));
			this.areaLabel.setText(`${txtArea} ${suffix}\u00B2`);
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

	get showCoordinates(): boolean {
		return this._showCoordinates;
	}

	set showCoordinates(value: boolean) {
		this._showCoordinates = value;
		this.update();
	}

	get showAngles(): boolean {
		return this._showAngles;
	}

	set showAngles(value: boolean) {
		this._showAngles = value;
		this.update();
	}

	get showCircle(): boolean {
		return this._showCircle;
	}

	set showCircle(value: boolean) {
		this._showCircle = value;
		this.update();
	}

	get showAzimuth(): boolean {
		return this._showAzimuth;
	}

	set showAzimuth(value: boolean) {
		this._showAzimuth = value;
		this.update();
	}

	get showEdges(): boolean {
		return this._showEdges;
	}

	set showEdges(value: boolean) {
		this._showEdges = value;
		this.update();
	}

	get showHeight(): boolean {
		return this._showHeight;
	}

	set showHeight(value: boolean) {
		this._showHeight = value;
		this.update();
	}

	get showArea(): boolean {
		return this._showArea;
	}

	set showArea(value: boolean) {
		this._showArea = value;
		this.update();
	}

	get closed(): boolean {
		return this._closed;
	}

	set closed(value: boolean) {
		this._closed = value;
		this.update();
	}

	get showDistances(): boolean {
		return this._showDistances;
	}

	set showDistances(value: boolean) {
		this._showDistances = value;
		this.update();
	}
}
