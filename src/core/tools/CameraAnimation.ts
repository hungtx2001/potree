import * as THREE from 'three';
import { EventDispatcher } from '../EventDispatcher.js';
import { Utils } from '../utils/Utils.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

export class ControlPoint {
	position: THREE.Vector3;
	target: THREE.Vector3;
	positionHandle: any;
	targetHandle: any;

	constructor() {
		this.position = new THREE.Vector3(0, 0, 0);
		this.target = new THREE.Vector3(0, 0, 0);
		this.positionHandle = null;
		this.targetHandle = null;
	}
}

export interface AnimationFrame {
	position: THREE.Vector3;
	target: THREE.Vector3;
}

export class CameraAnimation extends EventDispatcher {
	viewer: any;
	selectedElement: any;
	controlPoints: ControlPoint[];
	uuid: string;
	node: THREE.Object3D;
	frustum: Line2;
	name: string;
	duration: number;
	t: number;
	curveType: 'centripetal' | 'chordal' | 'catmullrom';
	visible: boolean;
	line!: Line2;
	targetLine!: Line2;
	cameraCurve!: THREE.CatmullRomCurve3;
	targetCurve!: THREE.CatmullRomCurve3;

	constructor(viewer: any) {
		super();

		this.viewer = viewer;
		this.selectedElement = null;
		this.controlPoints = [];
		this.uuid = THREE.MathUtils.generateUUID();

		this.node = new THREE.Object3D();
		this.node.name = 'camera animation';
		this.viewer.scene?.scene?.add(this.node);

		this.frustum = this.createFrustum();
		this.node.add(this.frustum);

		this.name = 'Camera Animation';
		this.duration = 5;
		this.t = 0;
		this.curveType = 'centripetal';
		this.visible = true;

		this.createUpdateHook();
		this.createPath();
	}

	static defaultFromView(viewer: any): CameraAnimation {
		const animation = new CameraAnimation(viewer);

		const camera = viewer.scene.getActiveCamera();
		const target = viewer.scene.view.getPivot();

		const cpCenter = new THREE.Vector3(
			0.3 * camera.position.x + 0.7 * target.x,
			0.3 * camera.position.y + 0.7 * target.y,
			0.3 * camera.position.z + 0.7 * target.z,
		);

		const targetCenter = new THREE.Vector3(
			0.05 * camera.position.x + 0.95 * target.x,
			0.05 * camera.position.y + 0.95 * target.y,
			0.05 * camera.position.z + 0.95 * target.z,
		);

		const r = camera.position.distanceTo(target) * 0.3;
		const angle = Utils.computeAzimuth(camera.position, target);

		const n = 5;
		for (let i = 0; i < n; i++) {
			const u = 1.5 * Math.PI * (i / n) + angle;
			const dx = r * Math.cos(u);
			const dy = r * Math.sin(u);

			const cpPos: [number, number, number] = [
				cpCenter.x + dx,
				cpCenter.y + dy,
				cpCenter.z,
			];

			const targetPos: [number, number, number] = [
				targetCenter.x + dx * 0.1,
				targetCenter.y + dy * 0.1,
				targetCenter.z,
			];

			const cp = animation.createControlPoint();
			cp.position.set(...cpPos);
			cp.target.set(...targetPos);
		}

		return animation;
	}

	createUpdateHook(): void {
		const viewer = this.viewer;

		viewer.addEventListener('update', () => {
			const camera = viewer.scene.getActiveCamera();
			const { width, height } = viewer.renderer.getSize(new THREE.Vector2());

			this.node.visible = this.visible;

			for (const cp of this.controlPoints) {
				// position
				if (cp.positionHandle?.svg) {
					const projected = cp.position.clone().project(camera);
					const isVis = this.visible && (projected.z < 1 && projected.z > -1);

					if (isVis) {
						const x = width * (projected.x * 0.5 + 0.5);
						const y = height - height * (projected.y * 0.5 + 0.5);

						cp.positionHandle.svg.style.left = `${x - cp.positionHandle.svg.clientWidth / 2}px`;
						cp.positionHandle.svg.style.top = `${y - cp.positionHandle.svg.clientHeight / 2}px`;
						cp.positionHandle.svg.style.display = '';
					} else {
						cp.positionHandle.svg.style.display = 'none';
					}
				}

				// target
				if (cp.targetHandle?.svg) {
					const projected = cp.target.clone().project(camera);
					const isVis = this.visible && (projected.z < 1 && projected.z > -1);

					if (isVis) {
						const x = width * (projected.x * 0.5 + 0.5);
						const y = height - height * (projected.y * 0.5 + 0.5);

						cp.targetHandle.svg.style.left = `${x - cp.targetHandle.svg.clientWidth / 2}px`;
						cp.targetHandle.svg.style.top = `${y - cp.targetHandle.svg.clientHeight / 2}px`;
						cp.targetHandle.svg.style.display = '';
					} else {
						cp.targetHandle.svg.style.display = 'none';
					}
				}
			}

			this.line.material.resolution.set(width, height);

			this.updatePath();

			// frustum
			const frame = this.at(this.t);
			const frustum = this.frustum;

			frustum.position.copy(frame.position);
			frustum.lookAt(frame.target);
			frustum.scale.set(20, 20, 20);

			frustum.material.resolution.set(width, height);
		});
	}

	createControlPoint(index?: number): ControlPoint {
		if (index === undefined) {
			index = this.controlPoints.length;
		}

		const cp = new ControlPoint();

		if (this.controlPoints.length >= 2 && index === 0) {
			const cp1 = this.controlPoints[0];
			const cp2 = this.controlPoints[1];

			const dir = cp1.position.clone().sub(cp2.position).multiplyScalar(0.5);
			cp.position.copy(cp1.position).add(dir);

			const tDir = cp1.target.clone().sub(cp2.target).multiplyScalar(0.5);
			cp.target.copy(cp1.target).add(tDir);
		} else if (this.controlPoints.length >= 2 && index === this.controlPoints.length) {
			const cp1 = this.controlPoints[this.controlPoints.length - 2];
			const cp2 = this.controlPoints[this.controlPoints.length - 1];

			const dir = cp2.position.clone().sub(cp1.position).multiplyScalar(0.5);
			cp.position.copy(cp1.position).add(dir);

			const tDir = cp2.target.clone().sub(cp1.target).multiplyScalar(0.5);
			cp.target.copy(cp2.target).add(tDir);
		} else if (this.controlPoints.length >= 2) {
			const cp1 = this.controlPoints[index - 1];
			const cp2 = this.controlPoints[index];

			cp.position.copy(cp1.position.clone().add(cp2.position).multiplyScalar(0.5));
			cp.target.copy(cp1.target.clone().add(cp2.target).multiplyScalar(0.5));
		}

		cp.positionHandle = this.createHandle(cp.position);
		cp.targetHandle = this.createHandle(cp.target);

		this.controlPoints.splice(index, 0, cp);

		this.dispatchEvent({
			type: 'controlpoint_added',
			controlpoint: cp,
		});

		return cp;
	}

	removeControlPoint(cp: ControlPoint): void {
		this.controlPoints = this.controlPoints.filter(_cp => _cp !== cp);

		this.dispatchEvent({
			type: 'controlpoint_removed',
			controlpoint: cp,
		});

		cp.positionHandle?.svg?.remove();
		cp.targetHandle?.svg?.remove();
	}

	createPath(): void {
		// position
		const posGeometry = new LineGeometry();
		const posMaterial = new LineMaterial({
			color: 0x00ff00,
			dashSize: 5,
			gapSize: 2,
			linewidth: 2,
			resolution: new THREE.Vector2(1000, 1000),
		});

		const posLine = new Line2(posGeometry, posMaterial);
		this.line = posLine;
		this.node.add(posLine);

		// target
		const targetGeometry = new LineGeometry();
		const targetMaterial = new LineMaterial({
			color: 0x0000ff,
			dashSize: 5,
			gapSize: 2,
			linewidth: 2,
			resolution: new THREE.Vector2(1000, 1000),
		});

		const targetLine = new Line2(targetGeometry, targetMaterial);
		this.targetLine = targetLine;
		this.node.add(targetLine);
	}

	createFrustum(): Line2 {
		const f = 0.3;
		const positions = [
			 0,  0,  0,   -f, -f, +1,
			 0,  0,  0,    f, -f, +1,
			 0,  0,  0,    f,  f, +1,
			 0,  0,  0,   -f,  f, +1,
			-f, -f, +1,    f, -f, +1,
			 f, -f, +1,    f,  f, +1,
			 f,  f, +1,   -f,  f, +1,
			-f,  f, +1,   -f, -f, +1,
		];

		const geometry = new LineGeometry();
		geometry.setPositions(positions);
		geometry.computeBoundingSphere();

		const material = new LineMaterial({
			color: 0xff0000,
			linewidth: 2,
			resolution: new THREE.Vector2(1000, 1000),
		});

		const line = new Line2(geometry, material);
		line.computeLineDistances();

		return line;
	}

	updatePath(): void {
		if (this.controlPoints.length === 0) return;

		// positions
		const positions = this.controlPoints.map(cp => cp.position);
		const first = positions[0];

		const curve = new THREE.CatmullRomCurve3(positions);
		(curve as any).curveType = this.curveType;

		const n = 100;
		const curvePositions: number[] = [];
		for (let k = 0; k <= n; k++) {
			const tVal = k / n;
			const position = curve.getPoint(tVal).sub(first);
			curvePositions.push(position.x, position.y, position.z);
		}

		this.line.geometry.setPositions(curvePositions);
		this.line.geometry.computeBoundingSphere();
		this.line.position.copy(first);
		this.line.computeLineDistances();

		this.cameraCurve = curve;

		// targets
		const targetPositions = this.controlPoints.map(cp => cp.target);
		const firstTarget = targetPositions[0];

		const tCurve = new THREE.CatmullRomCurve3(targetPositions);
		(tCurve as any).curveType = this.curveType;

		const targetCurvePositions: number[] = [];
		for (let k = 0; k <= n; k++) {
			const tVal = k / n;
			const position = tCurve.getPoint(tVal).sub(firstTarget);
			targetCurvePositions.push(position.x, position.y, position.z);
		}

		this.targetLine.geometry.setPositions(targetCurvePositions);
		this.targetLine.geometry.computeBoundingSphere();
		this.targetLine.position.copy(firstTarget);
		this.targetLine.computeLineDistances();

		this.targetCurve = tCurve;
	}

	at(t: number): AnimationFrame {
		if (t > 1) t = 1;
		else if (t < 0) t = 0;

		const camPos = this.cameraCurve ? this.cameraCurve.getPointAt(t) : new THREE.Vector3();
		const target = this.targetCurve ? this.targetCurve.getPointAt(t) : new THREE.Vector3();

		return {
			position: camPos,
			target,
		};
	}

	set(t: number): void {
		this.t = t;
	}

	createHandle(vector: THREE.Vector3): any {
		const svgns = 'http://www.w3.org/2000/svg';
		const svg = document.createElementNS(svgns, 'svg');

		svg.setAttribute('width', '2em');
		svg.setAttribute('height', '2em');

		svg.style.left = '50px';
		svg.style.top = '50px';
		svg.style.position = 'absolute';
		svg.style.zIndex = '10000';

		const circle = document.createElementNS(svgns, 'circle');
		circle.setAttributeNS(null, 'cx', '1em');
		circle.setAttributeNS(null, 'cy', '1em');
		circle.setAttributeNS(null, 'r', '0.5em');
		circle.setAttributeNS(null, 'style', 'fill: red; stroke: black; stroke-width: 0.2em;');
		svg.appendChild(circle);

		const element = this.viewer.renderer.domElement.parentElement;
		if (element) {
			element.appendChild(svg);
		}

		const drag = (evt: MouseEvent) => {
			if (this.selectedElement) {
				evt.preventDefault();

				const rect = this.viewer.renderer.domElement.getBoundingClientRect();
				const x = evt.clientX - rect.x;
				const y = evt.clientY - rect.y;

				const { width, height } = this.viewer.renderer.getSize(new THREE.Vector2());
				const camera = this.viewer.scene.getActiveCamera();
				const projected = vector.clone().project(camera);

				projected.x = ((x / width) - 0.5) / 0.5;
				projected.y = (-(y - height) / height - 0.5) / 0.5;

				const unprojected = projected.clone().unproject(camera);
				vector.set(unprojected.x, unprojected.y, unprojected.z);
			}
		};

		const endDrag = () => {
			this.selectedElement = null;
			document.removeEventListener('mousemove', drag);
		};

		const startDrag = () => {
			this.selectedElement = svg;
			document.addEventListener('mousemove', drag);
		};

		svg.addEventListener('mousedown', startDrag);
		svg.addEventListener('mouseup', endDrag);

		return { svg };
	}

	setVisible(visible: boolean): void {
		this.node.visible = visible;

		const display = visible ? '' : 'none';

		for (const cp of this.controlPoints) {
			if (cp.positionHandle?.svg) cp.positionHandle.svg.style.display = display;
			if (cp.targetHandle?.svg) cp.targetHandle.svg.style.display = display;
		}

		this.visible = visible;
	}

	setDuration(duration: number): void {
		this.duration = duration;
	}

	getDuration(): number {
		return this.duration;
	}

	play(): void {
		const tStart = performance.now();
		const duration = this.duration;

		const originalyVisible = this.visible;
		this.setVisible(false);

		const onUpdate = () => {
			const tNow = performance.now();
			const elapsed = (tNow - tStart) / 1000;
			const t = elapsed / duration;

			this.set(t);

			const frame = this.at(t);

			this.viewer.scene.view.position.copy(frame.position);
			this.viewer.scene.view.lookAt(frame.target);

			if (t > 1) {
				this.setVisible(originalyVisible);
				this.viewer.removeEventListener('update', onUpdate);
			}
		};

		this.viewer.addEventListener('update', onUpdate);
	}
}
