import * as THREE from 'three';
import { EventDispatcher } from '../EventDispatcher.js';
import { KeyCodes } from '../types.js';

export class GeoControls extends EventDispatcher {
	public object: any;
	public domElement: any;
	public enabled: boolean = true;
	public track: any = null;
	public trackPos: number | null = 0;
	public rotateSpeed: number = 1.0;
	public moveSpeed: number = 10.0;
	public shiftDown: boolean = false;
	public position0: THREE.Vector3;
	public moveRight: boolean = false;
	public moveLeft: boolean = false;
	public moveForward: boolean = false;
	public moveForwardMouse: boolean = false;
	public moveBackward: boolean = false;
	public rotLeft: boolean = false;
	public rotRight: boolean = false;
	public raiseCamera: boolean = false;
	public lowerCamera: boolean = false;
	public noZoom: boolean = false;

	private rotateStart: THREE.Vector2 = new THREE.Vector2();
	private rotateEnd: THREE.Vector2 = new THREE.Vector2();
	private rotateDelta: THREE.Vector2 = new THREE.Vector2();
	private panStart: THREE.Vector2 = new THREE.Vector2();
	private panEnd: THREE.Vector2 = new THREE.Vector2();
	private panDelta: THREE.Vector2 = new THREE.Vector2();
	private panOffset: THREE.Vector3 = new THREE.Vector3();
	private phiDelta: number = 0;
	private thetaDelta: number = 0;
	private panVec: THREE.Vector3 = new THREE.Vector3();
	private lastPosition: THREE.Vector3 = new THREE.Vector3();
	private state: number = -1;

	private static readonly STATE = { NONE: -1, ROTATE: 0, SPEEDCHANGE: 1, PAN: 2 };

	constructor(object: any, domElement?: any) {
		super();

		this.object = object;
		this.domElement = domElement !== undefined ? domElement : document;
		this.position0 = this.object.position.clone();

		this.domElement.addEventListener('contextmenu', (event: MouseEvent) => { event.preventDefault(); }, false);
		this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this), false);
		this.domElement.addEventListener('mousewheel', this.onMouseWheel.bind(this), false);
		this.domElement.addEventListener('DOMMouseScroll', this.onMouseWheel.bind(this), false);

		this.domElement.addEventListener('mousemove', this.onMouseMove.bind(this), false);
		this.domElement.addEventListener('mouseup', this.onMouseUp.bind(this), false);

		if (this.domElement.tabIndex === -1) {
			this.domElement.tabIndex = 2222;
		}
		this.domElement.addEventListener('keydown', this.onKeyDown.bind(this), false);
		this.domElement.addEventListener('keyup', this.onKeyUp.bind(this), false);
	}

	public setTrack(track: any): void {
		if (this.track !== track) {
			this.track = track;
			this.trackPos = null;
		}
	}

	public setTrackPos(trackPos: number, _preserveRelativeRotation?: boolean): void {
		const newTrackPos = Math.max(0, Math.min(1, trackPos));
		const oldTrackPos = this.trackPos !== null ? this.trackPos : newTrackPos;

		const newTangent = this.track.getTangentAt(newTrackPos);
		const oldTangent = this.track.getTangentAt(oldTrackPos);

		if (!newTangent.equals(oldTangent)) {
			const tangentDiffNormal = new THREE.Vector3().crossVectors(oldTangent, newTangent).normalize();
			const angle = oldTangent.angleTo(newTangent);
			const rot = new THREE.Matrix4().makeRotationAxis(tangentDiffNormal, angle);
			let dir = this.object.getWorldDirection(new THREE.Vector3()).clone();
			dir = dir.applyMatrix4(rot);
			const target = new THREE.Vector3().addVectors(this.object.position, dir);
			this.object.lookAt(target);
			this.object.updateMatrixWorld();

			this.dispatchEvent({
				type: 'path_relative_rotation',
				angle: angle,
				axis: tangentDiffNormal,
				controls: this,
			});
		}

		if (this.trackPos === null) {
			const target = new THREE.Vector3().addVectors(this.object.position, newTangent);
			this.object.lookAt(target);
		}

		this.trackPos = newTrackPos;

		if (newTrackPos !== oldTrackPos) {
			this.dispatchEvent({
				type: 'move',
				translation: this.panVec.clone(),
			});
		}
	}

	public stop(): void {}

	public getTrackPos(): number | null {
		return this.trackPos;
	}

	public rotateLeft(angle: number): void {
		this.thetaDelta -= angle;
	}

	public rotateUp(angle: number): void {
		this.phiDelta -= angle;
	}

	public panLeft(distance: number): void {
		const te = this.object.matrix.elements;
		this.panOffset.set(te[0], te[1], te[2]);
		this.panOffset.multiplyScalar(-distance);
		this.panVec.add(this.panOffset);
	}

	public panUp(distance: number): void {
		const te = this.object.matrix.elements;
		this.panOffset.set(te[4], te[5], te[6]);
		this.panOffset.multiplyScalar(distance);
		this.panVec.add(this.panOffset);
	}

	public panForward(distance: number): void {
		if (this.track) {
			const pos = this.getTrackPos();
			if (pos !== null) {
				this.setTrackPos(pos - distance / this.track.getLength());
			}
		} else {
			const te = this.object.matrix.elements;
			this.panOffset.set(te[8], te[9], te[10]);
			this.panOffset.multiplyScalar(distance);
			this.panVec.add(this.panOffset);
		}
	}

	public pan(deltaX: number, deltaY: number): void {
		const element = this.domElement === document ? this.domElement.body : this.domElement;

		if (this.object.fov !== undefined) {
			const position = this.object.position;
			const offset = position.clone();
			let targetDistance = offset.length();
			targetDistance *= Math.tan((this.object.fov / 2) * Math.PI / 180.0);

			this.panLeft(2 * deltaX * targetDistance / element.clientHeight);
			this.panUp(2 * deltaY * targetDistance / element.clientHeight);
		} else if (this.object.top !== undefined) {
			this.panLeft(deltaX * (this.object.right - this.object.left) / element.clientWidth);
			this.panUp(deltaY * (this.object.top - this.object.bottom) / element.clientHeight);
		} else {
			console.warn('WARNING: GeoControls encountered an unknown camera type - pan disabled.');
		}
	}

	public update(delta?: number): void {
		this.object.rotation.order = 'ZYX';

		const object = this.object;
		this.object = new THREE.Object3D();
		this.object.position.copy(object.position);
		this.object.rotation.copy(object.rotation);
		this.object.updateMatrix();
		this.object.updateMatrixWorld();

		const position = this.object.position;

		if (delta !== undefined) {
			const multiplier = this.shiftDown ? 4 : 1;
			if (this.moveRight) this.panLeft(-delta * this.moveSpeed * multiplier);
			if (this.moveLeft) this.panLeft(delta * this.moveSpeed * multiplier);
			if (this.moveForward || this.moveForwardMouse) this.panForward(-delta * this.moveSpeed * multiplier);
			if (this.moveBackward) this.panForward(delta * this.moveSpeed * multiplier);
			if (this.rotLeft) this.rotateLeft(-0.5 * Math.PI * delta / this.rotateSpeed);
			if (this.rotRight) this.rotateLeft(0.5 * Math.PI * delta / this.rotateSpeed);
			if (this.raiseCamera) this.panUp(delta * this.moveSpeed * multiplier);
			if (this.lowerCamera) this.panUp(-delta * this.moveSpeed * multiplier);
		}

		if (!this.panVec.equals(new THREE.Vector3(0, 0, 0))) {
			this.dispatchEvent({
				type: 'move',
				translation: this.panVec.clone(),
			});
		}

		position.add(this.panVec);

		if (!(this.thetaDelta === 0.0 && this.phiDelta === 0.0)) {
			this.dispatchEvent({
				type: 'rotate',
				thetaDelta: this.thetaDelta,
				phiDelta: this.phiDelta,
			});
		}

		this.object.updateMatrix();
		const rot = new THREE.Matrix4().makeRotationY(this.thetaDelta);
		const res = new THREE.Matrix4().multiplyMatrices(rot, this.object.matrix);
		this.object.quaternion.setFromRotationMatrix(res);

		this.object.rotation.x += this.phiDelta;
		this.object.updateMatrixWorld();

		const proposeTransformEvent = {
			type: 'proposeTransform',
			oldPosition: object.position,
			newPosition: this.object.position,
			objections: 0,
			counterProposals: [] as any[],
		};
		this.dispatchEvent(proposeTransformEvent);

		if (proposeTransformEvent.objections > 0) {
			if (proposeTransformEvent.counterProposals.length > 0) {
				const cp = proposeTransformEvent.counterProposals;
				this.object.position.copy(cp[0]);
				proposeTransformEvent.objections = 0;
				proposeTransformEvent.counterProposals = [];
			}
		}

		if (proposeTransformEvent.objections <= 0) {
			object.position.copy(this.object.position);
		}

		object.rotation.copy(this.object.rotation);
		this.object = object;

		this.thetaDelta = 0;
		this.phiDelta = 0;
		this.panVec.set(0, 0, 0);

		if (this.lastPosition.distanceTo(this.object.position) > 0) {
			this.dispatchEvent({ type: 'change' });
			this.lastPosition.copy(this.object.position);
		}

		if (this.track && this.trackPos !== null) {
			const pos = this.track.getPointAt(this.trackPos);
			object.position.copy(pos);
		}
	}

	public reset(): void {
		this.state = GeoControls.STATE.NONE;
		this.object.position.copy(this.position0);
	}

	public onMouseDown(event: MouseEvent): void {
		if (!this.enabled) return;
		event.preventDefault();

		if (event.button === 0) {
			this.state = GeoControls.STATE.ROTATE;
			this.rotateStart.set(event.clientX, event.clientY);
		} else if (event.button === 1) {
			this.state = GeoControls.STATE.PAN;
			this.panStart.set(event.clientX, event.clientY);
		} else if (event.button === 2) {
			this.moveForwardMouse = true;
		}

		this.dispatchEvent({ type: 'start' });
	}

	public onMouseMove(event: MouseEvent): void {
		if (!this.enabled) return;
		event.preventDefault();

		const element = this.domElement === document ? this.domElement.body : this.domElement;

		if (this.state === GeoControls.STATE.ROTATE) {
			this.rotateEnd.set(event.clientX, event.clientY);
			this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart);

			this.rotateLeft(2 * Math.PI * this.rotateDelta.x / element.clientWidth * this.rotateSpeed);
			this.rotateUp(2 * Math.PI * this.rotateDelta.y / element.clientHeight * this.rotateSpeed);

			this.rotateStart.copy(this.rotateEnd);
		} else if (this.state === GeoControls.STATE.PAN) {
			this.panEnd.set(event.clientX, event.clientY);
			this.panDelta.subVectors(this.panEnd, this.panStart);
			this.panDelta.multiplyScalar(0.002).multiplyScalar(this.moveSpeed);

			this.pan(this.panDelta.x, this.panDelta.y);
			this.panStart.copy(this.panEnd);
		}
	}

	public onMouseUp(event: MouseEvent): void {
		if (!this.enabled) return;

		if (event.button === 2) {
			this.moveForwardMouse = false;
		} else {
			this.dispatchEvent({ type: 'end' });
			this.state = GeoControls.STATE.NONE;
		}
	}

	public onMouseWheel(event: any): void {
		if (!this.enabled || this.noZoom) return;
		event.preventDefault();

		const direction = (event.detail < 0 || event.wheelDelta > 0) ? 1 : -1;
		let moveSpeed = this.moveSpeed + this.moveSpeed * 0.1 * direction;
		moveSpeed = Math.max(0.1, moveSpeed);

		this.setMoveSpeed(moveSpeed);

		this.dispatchEvent({ type: 'start' });
		this.dispatchEvent({ type: 'end' });
	}

	public setMoveSpeed(value: number): void {
		if (this.moveSpeed !== value) {
			this.moveSpeed = value;
			this.dispatchEvent({
				type: 'move_speed_changed',
				controls: this,
			});
		}
	}

	public onKeyDown(event: KeyboardEvent): void {
		if (!this.enabled) return;
		this.shiftDown = event.shiftKey;

		switch (event.keyCode) {
			case KeyCodes.UP: this.moveForward = true; break;
			case KeyCodes.BOTTOM: this.moveBackward = true; break;
			case KeyCodes.LEFT: this.moveLeft = true; break;
			case KeyCodes.RIGHT: this.moveRight = true; break;
			case KeyCodes.W: this.moveForward = true; break;
			case KeyCodes.S: this.moveBackward = true; break;
			case KeyCodes.A: this.moveLeft = true; break;
			case KeyCodes.D: this.moveRight = true; break;
			case KeyCodes.Q: this.rotLeft = true; break;
			case KeyCodes.E: this.rotRight = true; break;
			case KeyCodes.R: this.raiseCamera = true; break;
			case KeyCodes.F: this.lowerCamera = true; break;
		}
	}

	public onKeyUp(event: KeyboardEvent): void {
		this.shiftDown = event.shiftKey;

		switch (event.keyCode) {
			case KeyCodes.W: this.moveForward = false; break;
			case KeyCodes.S: this.moveBackward = false; break;
			case KeyCodes.A: this.moveLeft = false; break;
			case KeyCodes.D: this.moveRight = false; break;
			case KeyCodes.UP: this.moveForward = false; break;
			case KeyCodes.BOTTOM: this.moveBackward = false; break;
			case KeyCodes.LEFT: this.moveLeft = false; break;
			case KeyCodes.RIGHT: this.moveRight = false; break;
			case KeyCodes.Q: this.rotLeft = false; break;
			case KeyCodes.E: this.rotRight = false; break;
			case KeyCodes.R: this.raiseCamera = false; break;
			case KeyCodes.F: this.lowerCamera = false; break;
		}
	}
}
