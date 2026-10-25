import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { MOUSE } from '../types.js';
import { Utils } from '../utils/Utils.js';
import { EventDispatcher } from '../EventDispatcher.js';

export class FirstPersonControls extends EventDispatcher {
	public viewer: any;
	public renderer: THREE.WebGLRenderer;
	public scene: any = null;
	public sceneControls: THREE.Scene = new THREE.Scene();
	public rotationSpeed: number = 200;
	public moveSpeed: number = 10;
	public lockElevation: boolean = false;
	public keys: Record<string, number[]> = {
		FORWARD: ['W'.charCodeAt(0), 38],
		BACKWARD: ['S'.charCodeAt(0), 40],
		LEFT: ['A'.charCodeAt(0), 37],
		RIGHT: ['D'.charCodeAt(0), 39],
		UP: ['R'.charCodeAt(0), 33],
		DOWN: ['F'.charCodeAt(0), 34],
	};
	public fadeFactor: number = 50;
	public yawDelta: number = 0;
	public pitchDelta: number = 0;
	public translationDelta: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
	public translationWorldDelta: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
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

			const moveSpeed = this.viewer.getMoveSpeed();

			const ndrag = {
				x: e.drag.lastDrag.x / this.renderer.domElement.clientWidth,
				y: e.drag.lastDrag.y / this.renderer.domElement.clientHeight,
			};

			if (e.drag.mouse === MOUSE.LEFT) {
				this.yawDelta += ndrag.x * this.rotationSpeed;
				this.pitchDelta += ndrag.y * this.rotationSpeed;
			} else if (e.drag.mouse === MOUSE.RIGHT) {
				this.translationDelta.x -= ndrag.x * moveSpeed * 100;
				this.translationDelta.z += ndrag.y * moveSpeed * 100;
			}
		};

		const drop = () => {
			this.dispatchEvent({ type: 'end' });
		};

		const scroll = (e: any) => {
			let speed = this.viewer.getMoveSpeed();

			if (e.delta < 0) {
				speed = speed * 0.9;
			} else if (e.delta > 0) {
				speed = speed / 0.9;
			}

			speed = Math.max(speed, 0.1);
			this.viewer.setMoveSpeed(speed);
		};

		const dblclick = (e: any) => {
			this.zoomToLocation(e.mouse);
		};

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
		this.translationDelta.set(0, 0, 0);
	}

	zoomToLocation(mouse: THREE.Vector2): void {
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
				this.viewer.setMoveSpeed(this.scene.view.radius / 2.5);
			});

			tween.onComplete(() => {
				this.tweens = this.tweens.filter((e) => e !== tween);
			});

			tween.start();
		}
	}

	update(delta: number): void {
		const view = this.scene.view;

		{
			const changes = [
				this.yawDelta,
				this.pitchDelta,
				this.translationDelta.length(),
				this.translationWorldDelta.length(),
			];
			const changeHappens = changes.some((e) => Math.abs(e) > 0.001);
			if (changeHappens && this.tweens.length > 0) {
				this.tweens.forEach((e) => e.stop());
				this.tweens = [];
			}
		}

		{
			const ih = this.viewer.inputHandler;

			const moveForward = this.keys.FORWARD.some((e) => ih.pressedKeys[e]);
			const moveBackward = this.keys.BACKWARD.some((e) => ih.pressedKeys[e]);
			const moveLeft = this.keys.LEFT.some((e) => ih.pressedKeys[e]);
			const moveRight = this.keys.RIGHT.some((e) => ih.pressedKeys[e]);
			const moveUp = this.keys.UP.some((e) => ih.pressedKeys[e]);
			const moveDown = this.keys.DOWN.some((e) => ih.pressedKeys[e]);

			if (this.lockElevation) {
				const dir = view.direction;
				dir.z = 0;
				dir.normalize();

				if (moveForward && moveBackward) {
					this.translationWorldDelta.set(0, 0, 0);
				} else if (moveForward) {
					this.translationWorldDelta.copy(dir.multiplyScalar(this.viewer.getMoveSpeed()));
				} else if (moveBackward) {
					this.translationWorldDelta.copy(dir.multiplyScalar(-this.viewer.getMoveSpeed()));
				}
			} else {
				if (moveForward && moveBackward) {
					this.translationDelta.y = 0;
				} else if (moveForward) {
					this.translationDelta.y = this.viewer.getMoveSpeed();
				} else if (moveBackward) {
					this.translationDelta.y = -this.viewer.getMoveSpeed();
				}
			}

			if (moveLeft && moveRight) {
				this.translationDelta.x = 0;
			} else if (moveLeft) {
				this.translationDelta.x = -this.viewer.getMoveSpeed();
			} else if (moveRight) {
				this.translationDelta.x = this.viewer.getMoveSpeed();
			}

			if (moveUp && moveDown) {
				this.translationWorldDelta.z = 0;
			} else if (moveUp) {
				this.translationWorldDelta.z = this.viewer.getMoveSpeed();
			} else if (moveDown) {
				this.translationWorldDelta.z = -this.viewer.getMoveSpeed();
			}
		}

		{
			let yaw = view.yaw;
			let pitch = view.pitch;

			yaw -= this.yawDelta * delta;
			pitch -= this.pitchDelta * delta;

			view.yaw = yaw;
			view.pitch = pitch;
		}

		{
			view.translate(
				this.translationDelta.x * delta,
				this.translationDelta.y * delta,
				this.translationDelta.z * delta
			);

			view.translateWorld(
				this.translationWorldDelta.x * delta,
				this.translationWorldDelta.y * delta,
				this.translationWorldDelta.z * delta
			);
		}

		{
			view.radius = 3 * this.viewer.getMoveSpeed();
		}

		{
			const attenuation = Math.max(0, 1 - this.fadeFactor * delta);
			this.yawDelta *= attenuation;
			this.pitchDelta *= attenuation;
			this.translationDelta.multiplyScalar(attenuation);
			this.translationWorldDelta.multiplyScalar(attenuation);
		}
	}
}
