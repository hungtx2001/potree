import * as THREE from 'three';
import { EventDispatcher } from '../EventDispatcher.js';

export class DeviceOrientationControls extends EventDispatcher {
	public viewer: any;
	public renderer: THREE.WebGLRenderer;
	public scene: any = null;
	public sceneControls: THREE.Scene = new THREE.Scene();
	public screenOrientation: number = 0;
	public deviceOrientation: DeviceOrientationEvent | null = null;

	constructor(viewer: any) {
		super();

		this.viewer = viewer;
		this.renderer = viewer.renderer;
		this.screenOrientation = (window as any).orientation || 0;

		const deviceOrientationChange = (e: DeviceOrientationEvent) => {
			this.deviceOrientation = e;
		};

		const screenOrientationChange = () => {
			this.screenOrientation = (window as any).orientation || 0;
		};

		const win = window as any;
		if ('ondeviceorientationabsolute' in win) {
			win.addEventListener('deviceorientationabsolute', deviceOrientationChange);
		} else if ('ondeviceorientation' in win) {
			win.addEventListener('deviceorientation', deviceOrientationChange);
		} else {
			console.warn('No device orientation found.');
		}

		win.addEventListener('orientationchange', screenOrientationChange);
	}

	public setScene(scene: any): void {
		this.scene = scene;
	}

	public update(_delta?: number): void {
		const computeQuaternion = (alpha: number, beta: number, gamma: number, orient: number) => {
			const quaternion = new THREE.Quaternion();
			const zee = new THREE.Vector3(0, 0, 1);
			const euler = new THREE.Euler();
			const q0 = new THREE.Quaternion();

			euler.set(beta, gamma, alpha, 'ZXY');
			quaternion.setFromEuler(euler);
			quaternion.multiply(q0.setFromAxisAngle(zee, -orient));

			return quaternion;
		};

		if (this.deviceOrientation) {
			const alpha = this.deviceOrientation.alpha ? THREE.MathUtils.degToRad(this.deviceOrientation.alpha) : 0;
			const beta = this.deviceOrientation.beta ? THREE.MathUtils.degToRad(this.deviceOrientation.beta) : 0;
			const gamma = this.deviceOrientation.gamma ? THREE.MathUtils.degToRad(this.deviceOrientation.gamma) : 0;
			const orient = this.screenOrientation ? THREE.MathUtils.degToRad(this.screenOrientation) : 0;

			const quaternion = computeQuaternion(alpha, beta, gamma, orient);
			if (this.viewer?.scene?.cameraP) {
				this.viewer.scene.cameraP.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
			}
		}
	}
}
