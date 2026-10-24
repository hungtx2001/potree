import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { MOUSE } from '../types.js';
import { Utils } from '../../utils.js';
import { EventDispatcher } from '../EventDispatcher.js';

export class EarthControls extends EventDispatcher {
	public viewer: any;
	public renderer: THREE.WebGLRenderer;
	public scene: any = null;
	public sceneControls: THREE.Scene = new THREE.Scene();
	public rotationSpeed: number = 10;
	public fadeFactor: number = 20;
	public wheelDelta: number = 0;
	public zoomDelta: THREE.Vector3 = new THREE.Vector3();
	public camStart: any = null;
	public pivot: THREE.Vector3 | null = null;
	public pivotIndicator: THREE.Mesh;
	public tweens: any[] = [];

	constructor(viewer: any) {
		super();

		this.viewer = viewer;
		this.renderer = viewer.renderer;

		const sg = new THREE.SphereGeometry(1, 16, 16);
		const sm = new THREE.MeshNormalMaterial();
		this.pivotIndicator = new THREE.Mesh(sg, sm);
		this.pivotIndicator.visible = false;
		this.sceneControls.add(this.pivotIndicator);

		const drag = (e: any) => {
			if (e.drag.object !== null || !this.pivot) {
				return;
			}

			if (e.drag.startHandled === undefined) {
				e.drag.startHandled = true;
				this.dispatchEvent({ type: 'start' });
			}

			const camStart = this.camStart;
			const camera = this.scene.getActiveCamera();
			const view = this.viewer.scene.view;
			const mouse = e.drag.end;
			const domElement = this.viewer.renderer.domElement;

			if (e.drag.mouse === MOUSE.LEFT) {
				const ray = Utils.mouseToRay(mouse, camera, domElement.clientWidth, domElement.clientHeight);
				const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
					new THREE.Vector3(0, 0, 1),
					this.pivot
				);

				const distanceToPlane = ray.distanceToPlane(plane);

				if (distanceToPlane > 0) {
					const I = new THREE.Vector3().addVectors(
						camStart.position,
						ray.direction.clone().multiplyScalar(distanceToPlane)
					);

					const movedBy = new THREE.Vector3().subVectors(I, this.pivot);
					const newCamPos = camStart.position.clone().sub(movedBy);

					view.position.copy(newCamPos);

					const distance = newCamPos.distanceTo(this.pivot);
					view.radius = distance;
					const speed = view.radius / 2.5;
					this.viewer.setMoveSpeed(speed);
				}
			} else if (e.drag.mouse === MOUSE.RIGHT) {
				const ndrag = {
					x: e.drag.lastDrag.x / this.renderer.domElement.clientWidth,
					y: e.drag.lastDrag.y / this.renderer.domElement.clientHeight,
				};

				let yawDelta = -ndrag.x * this.rotationSpeed * 0.5;
				let pitchDelta = -ndrag.y * this.rotationSpeed * 0.2;

				const originalPitch = view.pitch;
				const tmpView = view.clone();
				tmpView.pitch = tmpView.pitch + pitchDelta;
				pitchDelta = tmpView.pitch - originalPitch;

				const pivotToCam = new THREE.Vector3().subVectors(view.position, this.pivot);
				const pivotToCamTarget = new THREE.Vector3().subVectors(view.getPivot(), this.pivot);
				const side = view.getSide();

				pivotToCam.applyAxisAngle(side, pitchDelta);
				pivotToCamTarget.applyAxisAngle(side, pitchDelta);

				pivotToCam.applyAxisAngle(new THREE.Vector3(0, 0, 1), yawDelta);
				pivotToCamTarget.applyAxisAngle(new THREE.Vector3(0, 0, 1), yawDelta);

				const newCam = new THREE.Vector3().addVectors(this.pivot, pivotToCam);

				view.position.copy(newCam);
				view.yaw += yawDelta;
				view.pitch += pitchDelta;
			}
		};

		const onMouseDown = (e: any) => {
			const I = Utils.getMousePointCloudIntersection(
				e.mouse,
				this.scene.getActiveCamera(),
				this.viewer,
				this.scene.pointclouds,
				{ pickClipped: false }
			);

			if (I) {
				this.pivot = I.location;
				this.camStart = this.scene.getActiveCamera().clone();
				this.pivotIndicator.visible = true;
				this.pivotIndicator.position.copy(I.location);
			}
		};

		const drop = (_e: any) => {
			this.dispatchEvent({ type: 'end' });
		};

		const onMouseUp = (_e: any) => {
			this.camStart = null;
			this.pivot = null;
			this.pivotIndicator.visible = false;
		};

		const scroll = (e: any) => {
			this.wheelDelta += e.delta;
		};

		const dblclick = (e: any) => {
			this.zoomToLocation(e.mouse);
		};

		this.addEventListener('drag', drag);
		this.addEventListener('drop', drop);
		this.addEventListener('mousewheel', scroll);
		this.addEventListener('mousedown', onMouseDown);
		this.addEventListener('mouseup', onMouseUp);
		this.addEventListener('dblclick', dblclick);
	}

	public setScene(scene: any): void {
		this.scene = scene;
	}

	public stop(): void {
		this.wheelDelta = 0;
		this.zoomDelta.set(0, 0, 0);
	}

	public zoomToLocation(mouse: THREE.Vector2): void {
		const camera = this.scene.getActiveCamera();

		const I = Utils.getMousePointCloudIntersection(
			mouse,
			camera,
			this.viewer,
			this.scene.pointclouds
		);

		if (I === null) {
			return;
		}

		let targetRadius = 0;
		const minimumJumpDistance = 0.2;
		const domElement = this.renderer.domElement;
		const ray = Utils.mouseToRay(mouse, camera, domElement.clientWidth, domElement.clientHeight);

		const nodes = I.pointcloud.nodesOnRay(I.pointcloud.visibleNodes, ray);
		const lastNode = nodes[nodes.length - 1];
		const radius = lastNode.getBoundingSphere(new THREE.Sphere()).radius;
		targetRadius = Math.min(this.scene.view.radius, radius);
		targetRadius = Math.max(minimumJumpDistance, targetRadius);

		const d = this.scene.view.direction.multiplyScalar(-1);
		const cameraTargetPosition = new THREE.Vector3().addVectors(I.location, d.multiplyScalar(targetRadius));

		const animationDuration = 600;
		const easing = TWEEN.Easing.Quartic.Out;

		const value = { x: 0 };
		const tween = new TWEEN.Tween(value).to({ x: 1 }, animationDuration);
		tween.easing(easing);
		this.tweens.push(tween);

		const startPos = this.scene.view.position.clone();
		const targetPos = cameraTargetPosition.clone();
		const startRadius = this.scene.view.radius;
		const targetRad = cameraTargetPosition.distanceTo(I.location);

		tween.onUpdate(() => {
			const t = value.x;
			this.scene.view.position.x = (1 - t) * startPos.x + t * targetPos.x;
			this.scene.view.position.y = (1 - t) * startPos.y + t * targetPos.y;
			this.scene.view.position.z = (1 - t) * startPos.z + t * targetPos.z;

			this.scene.view.radius = (1 - t) * startRadius + t * targetRad;
			this.viewer.setMoveSpeed(this.scene.view.radius / 2.5);
		});

		tween.onComplete(() => {
			this.tweens = this.tweens.filter(e => e !== tween);
		});

		tween.start();
	}

	public update(delta: number): void {
		const view = this.scene.view;
		const fade = Math.pow(0.5, this.fadeFactor * delta);
		const progression = 1 - fade;
		const camera = this.scene.getActiveCamera();

		// compute zoom
		if (this.wheelDelta !== 0) {
			const I = Utils.getMousePointCloudIntersection(
				this.viewer.inputHandler.mouse,
				this.scene.getActiveCamera(),
				this.viewer,
				this.scene.pointclouds
			);

			if (I) {
				const resolvedPos = new THREE.Vector3().addVectors(view.position, this.zoomDelta);
				const distance = I.location.distanceTo(resolvedPos);
				const jumpDistance = distance * 0.2 * this.wheelDelta;
				const targetDir = new THREE.Vector3().subVectors(I.location, view.position);
				targetDir.normalize();

				resolvedPos.add(targetDir.multiplyScalar(jumpDistance));
				this.zoomDelta.subVectors(resolvedPos, view.position);

				const dist = resolvedPos.distanceTo(I.location);
				view.radius = dist;
				const speed = view.radius / 2.5;
				this.viewer.setMoveSpeed(speed);
			}
		}

		// apply zoom
		if (this.zoomDelta.length() !== 0) {
			const p = this.zoomDelta.clone().multiplyScalar(progression);
			const newPos = new THREE.Vector3().addVectors(view.position, p);
			view.position.copy(newPos);
		}

		if (this.pivotIndicator.visible) {
			const distance = this.pivotIndicator.position.distanceTo(view.position);
			const pixelWidth = this.renderer.domElement.clientWidth;
			const pixelHeight = this.renderer.domElement.clientHeight;
			const pr = Utils.projectedRadius(1, camera, distance, pixelWidth, pixelHeight);
			const scale = 10 / pr;
			this.pivotIndicator.scale.set(scale, scale, scale);
		}

		// decelerate over time
		this.zoomDelta.multiplyScalar(fade);
		this.wheelDelta = 0;
	}
}
