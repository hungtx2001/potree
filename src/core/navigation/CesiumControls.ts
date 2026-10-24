/**
 * CesiumControls - Potree 2.0 Navigation Controller driven by Cesium Camera
 * Modern TypeScript implementation with zero-GC allocations and seamless 2-way sync.
 */

import * as THREE from 'three';
import { EventDispatcher } from '../../EventDispatcher.js';
import type { Viewer } from '../../viewer/viewer.js';
import type { Scene } from '../../viewer/Scene.js';

export interface CesiumProjection {
	toMap: {
		forward: (coord: [number, number]) => [number, number];
	};
	toScene: {
		forward: (coord: [number, number]) => [number, number];
	};
}

export class CesiumControls extends EventDispatcher {
	public viewer: Viewer;
	public renderer: THREE.WebGLRenderer;
	public scene: Scene | null = null;
	public cesiumViewer: any;
	public projection: CesiumProjection;
	public Cesium: any;
	public sceneControls: THREE.Scene;
	public directCamera: boolean = false;
	public enabled: boolean = true;

	// Pre-allocated scratch vectors for zero-GC per frame execution
	private _scratchPos = new THREE.Vector3();
	private _scratchTarget = new THREE.Vector3();
	private _scratchUpPt = new THREE.Vector3();
	private _scratchUpDir = new THREE.Vector3();
	private _scratchCenter = new THREE.Vector3();

	private _toolActive: boolean = false;
	private _ellipsoid: any;
	private _cesiumCamera: any;
	private _cesiumSSC: any;

	private _cScratch1: any;
	private _cScratch2: any;
	private _cScratchTarget: any;
	private _cScratchUp: any;

	private _degPos: [number, number] = [0, 0];
	private _degTarget: [number, number] = [0, 0];
	private _degUp: [number, number] = [0, 0];

	constructor(viewer: Viewer, cesiumViewer: any, projection: CesiumProjection, cesiumLib?: any) {
		super();

		this.viewer = viewer;
		this.renderer = viewer.renderer as THREE.WebGLRenderer;
		this.cesiumViewer = cesiumViewer;
		this.projection = projection;
		this.Cesium = cesiumLib || (typeof window !== 'undefined' ? (window as any).Cesium : null);

		this.sceneControls = new THREE.Scene();

		// Cache Cesium subsystem references
		this._ellipsoid = cesiumViewer.scene.globe.ellipsoid;
		this._cesiumCamera = cesiumViewer.camera;
		this._cesiumSSC = cesiumViewer.scene.screenSpaceCameraController;

		// Pre-allocated Cesium Cartesian3 objects to eliminate garbage collection pauses
		if (this.Cesium?.Cartesian3) {
			this._cScratch1 = new this.Cesium.Cartesian3();
			this._cScratch2 = new this.Cesium.Cartesian3();
			this._cScratchTarget = new this.Cesium.Cartesian3();
			this._cScratchUp = new this.Cesium.Cartesian3();
		}
	}

	public setScene(scene: Scene): void {
		this.scene = scene;
	}

	public stop(): void {
		// No-op: Cesium manages its own momentum/deceleration
	}

	/**
	 * Toggle between Potree Tool mode (measuring, clipping, volume)
	 * and Cesium Globe navigation mode.
	 */
	public setToolActive(active: boolean): void {
		this._toolActive = active;

		const potreeCanvas = this.renderer.domElement;
		const ssc = this._cesiumSSC;

		if (active) {
			potreeCanvas.style.pointerEvents = 'auto';
			if (ssc) ssc.enableInputs = false;
		} else {
			potreeCanvas.style.pointerEvents = 'none';
			if (ssc) ssc.enableInputs = true;
		}
	}

	public isToolActive(): boolean {
		return this._toolActive;
	}

	/**
	 * Per-frame execution: converts Cesium Camera pose into Potree UTM space
	 */
	public update(_delta: number): void {
		if (!this.enabled || !this.scene || !this.cesiumViewer || !this.projection) {
			return;
		}

		const Cesium = this.Cesium;
		if (!Cesium) return;

		const cam = this._cesiumCamera;
		const posECEF = cam.positionWC;

		// target = pos + dir * 100
		Cesium.Cartesian3.multiplyByScalar(cam.directionWC, 100, this._cScratch1);
		Cesium.Cartesian3.add(posECEF, this._cScratch1, this._cScratchTarget);

		// up = pos + up * 100
		Cesium.Cartesian3.multiplyByScalar(cam.upWC, 100, this._cScratch2);
		Cesium.Cartesian3.add(posECEF, this._cScratch2, this._cScratchUp);

		const cartPos = this._ellipsoid.cartesianToCartographic(posECEF);
		const cartTarget = this._ellipsoid.cartesianToCartographic(this._cScratchTarget);
		const cartUp = this._ellipsoid.cartesianToCartographic(this._cScratchUp);

		if (!cartPos || !cartTarget || !cartUp) return;

		// Convert radians to degrees
		this._degPos[0] = Cesium.Math.toDegrees(cartPos.longitude);
		this._degPos[1] = Cesium.Math.toDegrees(cartPos.latitude);
		this._degTarget[0] = Cesium.Math.toDegrees(cartTarget.longitude);
		this._degTarget[1] = Cesium.Math.toDegrees(cartTarget.latitude);
		this._degUp[0] = Cesium.Math.toDegrees(cartUp.longitude);
		this._degUp[1] = Cesium.Math.toDegrees(cartUp.latitude);

		let utmPos: [number, number];
		let utmTarget: [number, number];
		let utmUp: [number, number];

		try {
			utmPos = this.projection.toScene.forward(this._degPos);
			utmTarget = this.projection.toScene.forward(this._degTarget);
			utmUp = this.projection.toScene.forward(this._degUp);
		} catch (_e) {
			return;
		}

		if (!utmPos || !utmTarget || !utmUp) return;

		// Build 3D vectors reusing scratch memory
		const pos3 = this._scratchPos.set(utmPos[0], utmPos[1], cartPos.height);
		const target3 = this._scratchTarget.set(utmTarget[0], utmTarget[1], cartTarget.height);
		const up3 = this._scratchUpPt.set(utmUp[0], utmUp[1], cartUp.height);

		// Synchronize View object
		const view = this.scene.view;
		view.position.copy(pos3);

		const dirX = target3.x - pos3.x;
		const dirY = target3.y - pos3.y;
		const dirZ = target3.z - pos3.z;
		const hLen = Math.sqrt(dirX * dirX + dirY * dirY);
		if (hLen > 0.0001) {
			view.yaw = Math.atan2(dirY, dirX) - Math.PI / 2;
		}
		view.pitch = Math.atan2(dirZ, hLen);
		view.radius = Math.max(1, cartPos.height);

		// Directly position THREE.js cameras
		const cameraP = (this.scene as any).cameraP;
		const cameraO = (this.scene as any).cameraO;

		const upDir = this._scratchUpDir
			.set(up3.x - pos3.x, up3.y - pos3.y, up3.z - pos3.z)
			.normalize();

		if (cameraP) {
			cameraP.position.copy(pos3);
			cameraP.up.copy(upDir);
			cameraP.lookAt(target3);
		}

		if (cameraO) {
			cameraO.position.copy(pos3);
			cameraO.up.copy(upDir);
			cameraO.lookAt(target3);
		}

		this.directCamera = true;

		// Dynamic speed based on elevation
		const speed = Math.max(5.0, Math.max(1, cartPos.height) / 2.5);
		this.viewer.setMoveSpeed(speed);

		// Synchronize FOV from Cesium frustum
		const frustum = cam.frustum;
		if (frustum) {
			let vFov: number | undefined;
			if (frustum.fovy !== undefined) {
				vFov = frustum.fovy;
			} else if (frustum.fov !== undefined) {
				const aspect = frustum.aspectRatio || 1;
				vFov = aspect >= 1
					? 2 * Math.atan(Math.tan(frustum.fov * 0.5) / aspect)
					: frustum.fov;
			}

			if (vFov) {
				const fovDeg = (vFov * 180) / Math.PI;
				if (fovDeg > 1 && fovDeg < 179) {
					this.viewer.setFOV(fovDeg);
				}
			}
		}
	}

	/**
	 * Fly the Cesium camera smoothly to encompass the loaded point clouds
	 */
	public flyToPointCloud(duration: number = 2): void {
		const Cesium = this.Cesium;
		if (!Cesium || !this.scene || !this.projection?.toMap?.forward) return;

		const box = (this.scene as any).getBoundingBox?.();
		if (!box || box.isEmpty()) return;

		const center = box.getCenter(this._scratchCenter);
		const size = box.getSize(this._scratchPos);

		const horizontalExtent = Math.max(size.x, size.y);

		let degCenter: [number, number];
		try {
			degCenter = this.projection.toMap.forward([center.x, center.y]);
		} catch (_e) {
			console.warn('CesiumControls: projection failed for flyToPointCloud');
			return;
		}

		if (!degCenter || degCenter.length < 2) return;

		const lon = degCenter[0];
		const lat = degCenter[1];

		const fovRad = ((this.viewer.getFOV() || 60) * Math.PI) / 180;
		const halfFov = fovRad / 2;
		let cameraHeight = horizontalExtent / 2 / Math.tan(halfFov);
		cameraHeight = Math.max(cameraHeight, center.z + size.z * 2);

		const destination = Cesium.Cartesian3.fromDegrees(lon, lat, cameraHeight);

		this.cesiumViewer.camera.flyTo({
			destination,
			orientation: {
				heading: 0,
				pitch: Cesium.Math.toRadians(-90), // Nadir view
				roll: 0,
			},
			duration,
		});
	}
}
