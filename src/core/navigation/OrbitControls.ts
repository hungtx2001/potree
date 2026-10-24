import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { MOUSE } from '../types.js';
import { Utils } from '../../utils.js';
import { EventDispatcher } from '../../EventDispatcher.js';

export class OrbitControls extends EventDispatcher {
	public viewer: any;
	public renderer: THREE.WebGLRenderer;
	public scene: any = null;
	public sceneControls: THREE.Scene = new THREE.Scene();
	public rotationSpeed: number = 5;
	public fadeFactor: number = 20;
	public yawDelta: number = 0;
	public pitchDelta: number = 0;
	public panDelta: THREE.Vector2 = new THREE.Vector2(0, 0);
	public radiusDelta: number = 0;
	public doubleClockZoomEnabled: boolean = true;
	public tweens: any[] = [];

	constructor(viewer: any) {
		super();

		this.viewer = viewer;
		this.renderer = viewer.renderer;

		const drag = (e: any) => {
			if (e.drag.object !== null) {
				return;
			}

			if (e.drag.startHandled === undefined) {
				e.drag.startHandled = true;
				this.dispatchEvent({ type: 'start' });
			}

			const ndrag = {
				x: e.drag.lastDrag.x / this.renderer.domElement.clientWidth,
				y: e.drag.lastDrag.y / this.renderer.domElement.clientHeight,
			};

			if (e.drag.mouse === MOUSE.LEFT) {
				this.yawDelta += ndrag.x * this.rotationSpeed;
				this.pitchDelta += ndrag.y * this.rotationSpeed;
				this.stopTweens();
			} else if (e.drag.mouse === MOUSE.RIGHT) {
				this.panDelta.x += ndrag.x;
				this.panDelta.y += ndrag.y;
				this.stopTweens();
			}
		};

		const drop = () => {
			this.dispatchEvent({ type: 'end' });
		};

		const scroll = (e: any) => {
			const resolvedRadius = this.scene.view.radius + this.radiusDelta;
			this.radiusDelta += -e.delta * resolvedRadius * 0.1;
			this.stopTweens();
		};

		const dblclick = (e: any) => {
			if (this.doubleClockZoomEnabled) {
				this.zoomToLocation(e.mouse);
			}
		};

		let previousTouch: any = null;
		const touchStart = (e: any) => {
			previousTouch = e;
		};

		const touchEnd = (e: any) => {
			previousTouch = e;
		};

		const touchMove = (e: any) => {
			if (e.touches.length === 2 && previousTouch.touches.length === 2) {
				const prev = previousTouch;
				const curr = e;

				const prevDX = prev.touches[0].pageX - prev.touches[1].pageX;
				const prevDY = prev.touches[0].pageY - prev.touches[1].pageY;
				const prevDist = Math.hypot(prevDX, prevDY);

				const currDX = curr.touches[0].pageX - curr.touches[1].pageX;
				const currDY = curr.touches[0].pageY - curr.touches[1].pageY;
				const currDist = Math.hypot(currDX, currDY);

				const delta = currDist / prevDist;
				const resolvedRadius = this.scene.view.radius + this.radiusDelta;
				const newRadius = resolvedRadius / delta;
				this.radiusDelta = newRadius - resolvedRadius;

				this.stopTweens();
			} else if (e.touches.length === 3 && previousTouch.touches.length === 3) {
				const prev = previousTouch;
				const curr = e;

				const prevMeanX = (prev.touches[0].pageX + prev.touches[1].pageX + prev.touches[2].pageX) / 3;
				const prevMeanY = (prev.touches[0].pageY + prev.touches[1].pageY + prev.touches[2].pageY) / 3;

				const currMeanX = (curr.touches[0].pageX + curr.touches[1].pageX + curr.touches[2].pageX) / 3;
				const currMeanY = (curr.touches[0].pageY + curr.touches[1].pageY + curr.touches[2].pageY) / 3;

				const delta = {
					x: (currMeanX - prevMeanX) / this.renderer.domElement.clientWidth,
					y: (currMeanY - prevMeanY) / this.renderer.domElement.clientHeight,
				};

				this.panDelta.x += delta.x;
				this.panDelta.y += delta.y;

				this.stopTweens();
			}

			previousTouch = e;
		};

		this.addEventListener('touchstart', touchStart);
		this.addEventListener('touchend', touchEnd);
		this.addEventListener('touchmove', touchMove);
		this.addEventListener('drag', drag);
		this.addEventListener('drop', drop);
		this.addEventListener('mousewheel', scroll);
		this.addEventListener('dblclick', dblclick);
	}

	setScene(scene: any): void {
		this.scene = scene;
	}

	stop(): void {
		this.yawDelta = 0;
		this.pitchDelta = 0;
		this.radiusDelta = 0;
		this.panDelta.set(0, 0);
	}

	zoomToLocation(mouse: THREE.Vector2): void {
		const camera = this.scene.getActiveCamera();

		const I = Utils.getMousePointCloudIntersection(
			mouse,
			camera,
			this.viewer,
			this.scene.pointclouds,
			{ pickClipped: true }
		);

		if (I === null) {
			return;
		}

		let targetRadius = 0;
		{
			const minimumJumpDistance = 0.2;
			const domElement = this.renderer.domElement;
			const ray = Utils.mouseToRay(mouse, camera, domElement.clientWidth, domElement.clientHeight);

			const nodes = I.pointcloud.nodesOnRay(I.pointcloud.visibleNodes, ray);
			const lastNode = nodes[nodes.length - 1];
			const radius = lastNode.getBoundingSphere(new THREE.Sphere()).radius;
			targetRadius = Math.min(this.scene.view.radius, radius);
			targetRadius = Math.max(minimumJumpDistance, targetRadius);
		}

		const d = this.scene.view.direction.multiplyScalar(-1);
		const cameraTargetPosition = new THREE.Vector3().addVectors(I.location, d.multiplyScalar(targetRadius));

		const animationDuration = 600;
		const easing = (TWEEN.Easing as any).Quartic.Out;

		{
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
				this.viewer.setMoveSpeed(this.scene.view.radius);
			});

			tween.onComplete(() => {
				this.tweens = this.tweens.filter((e) => e !== tween);
			});

			tween.start();
		}
	}

	stopTweens(): void {
		this.tweens.forEach((e) => e.stop());
		this.tweens = [];
	}

	update(delta: number): void {
		const view = this.scene.view;

		{
			const progression = Math.min(1, this.fadeFactor * delta);
			let yaw = view.yaw;
			let pitch = view.pitch;
			const pivot = view.getPivot();

			yaw -= progression * this.yawDelta;
			pitch -= progression * this.pitchDelta;

			view.yaw = yaw;
			view.pitch = pitch;

			const V = this.scene.view.direction.multiplyScalar(-view.radius);
			const position = new THREE.Vector3().addVectors(pivot, V);

			view.position.copy(position);
		}

		{
			const progression = Math.min(1, this.fadeFactor * delta);
			const panDistance = progression * view.radius * 3;

			const px = -this.panDelta.x * panDistance;
			const py = this.panDelta.y * panDistance;

			view.pan(px, py);
		}

		{
			const progression = Math.min(1, this.fadeFactor * delta);
			const radius = view.radius + progression * this.radiusDelta;

			const V = view.direction.multiplyScalar(-radius);
			const position = new THREE.Vector3().addVectors(view.getPivot(), V);
			view.radius = radius;

			view.position.copy(position);
		}

		{
			const speed = view.radius;
			this.viewer.setMoveSpeed(speed);
		}

		{
			const progression = Math.min(1, this.fadeFactor * delta);
			const attenuation = Math.max(0, 1 - this.fadeFactor * delta);

			this.yawDelta *= attenuation;
			this.pitchDelta *= attenuation;
			this.panDelta.multiplyScalar(attenuation);
			this.radiusDelta -= progression * this.radiusDelta;
		}
	}
}
