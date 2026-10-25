import * as THREE from 'three';
import { BoxVolume } from './Volume.js';
import { Utils } from '../utils/Utils.js';
import { PointSizeType } from '../types.js';
import { EventDispatcher } from '../EventDispatcher.js';

export class ScreenBoxSelectTool extends EventDispatcher {
	viewer: any;
	scene: THREE.Scene;
	importance: number;

	constructor(viewer: any) {
		super();

		this.viewer = viewer;
		this.scene = new THREE.Scene();
		this.importance = 0;

		viewer.addEventListener('update', this.update.bind(this));
		viewer.addEventListener('render.pass.perspective_overlay', this.render.bind(this));
		viewer.addEventListener('scene_changed', this.onSceneChange.bind(this));
	}

	onSceneChange(_scene: any): void {}

	startInsertion(): BoxVolume {
		const domElement = this.viewer.renderer.domElement;

		const volume = new BoxVolume();
		volume.position.set(12345, 12345, 12345);
		(volume as any).showVolumeLabel = false;
		volume.visible = false;
		volume.update();
		this.viewer.scene?.addVolume(volume);

		this.importance = 10;

		const selectionBox = document.createElement('div');
		selectionBox.style.cssText = 'position: absolute; border: 2px solid white; pointer-events: none; border-style: dashed; right: 10px; bottom: 10px;';
		if (domElement.parentElement) {
			domElement.parentElement.appendChild(selectionBox);
		}

		const drag = (e: any) => {
			volume.visible = true;

			const mStart = e.drag.start;
			const mEnd = e.drag.end;

			const box2D = new THREE.Box2();
			box2D.expandByPoint(mStart);
			box2D.expandByPoint(mEnd);

			selectionBox.style.left = `${box2D.min.x}px`;
			selectionBox.style.top = `${box2D.min.y}px`;
			selectionBox.style.width = `${box2D.max.x - box2D.min.x}px`;
			selectionBox.style.height = `${box2D.max.y - box2D.min.y}px`;

			const camera = e.viewer.scene.getActiveCamera();
			const size = e.viewer.renderer.getSize(new THREE.Vector2());
			const frustumSize = new THREE.Vector2(
				camera.right - camera.left,
				camera.top - camera.bottom
			);

			const screenCentroid = new THREE.Vector2().addVectors(e.drag.end, e.drag.start).multiplyScalar(0.5);
			const ray = Utils.mouseToRay(screenCentroid, camera, size.width, size.height);

			const diff = new THREE.Vector2().subVectors(e.drag.end, e.drag.start);
			diff.divide(size).multiply(frustumSize);

			volume.position.copy(ray.origin);
			volume.up.copy(camera.up);
			volume.rotation.copy(camera.rotation);
			volume.scale.set(diff.x, diff.y, 1000 * 100);

			e.consume();
		};

		const drop = (e: any) => {
			this.importance = 0;

			selectionBox.remove();

			this.viewer.inputHandler?.deselectAll();
			this.viewer.inputHandler?.toggleSelection(volume);

			const camera = e.viewer.scene.getActiveCamera();
			const size = e.viewer.renderer.getSize(new THREE.Vector2());
			const screenCentroid = new THREE.Vector2().addVectors(e.drag.end, e.drag.start).multiplyScalar(0.5);
			const ray = Utils.mouseToRay(screenCentroid, camera, size.width, size.height);

			this.removeEventListener('drag', drag);
			this.removeEventListener('drop', drop);

			const allPointsNear: any[] = [];
			const allPointsFar: any[] = [];

			if (this.viewer.scene?.pointclouds) {
				for (const pointcloud of this.viewer.scene.pointclouds) {
					if (!pointcloud.visible) {
						continue;
					}

					const volCam = camera.clone();
					volCam.left = -volume.scale.x / 2;
					volCam.right = +volume.scale.x / 2;
					volCam.top = +volume.scale.y / 2;
					volCam.bottom = -volume.scale.y / 2;
					volCam.near = -volume.scale.z / 2;
					volCam.far = +volume.scale.z / 2;
					volCam.rotation.copy(volume.rotation);
					volCam.position.copy(volume.position);

					volCam.updateMatrix();
					volCam.updateMatrixWorld();
					volCam.updateProjectionMatrix();
					volCam.matrixWorldInverse.copy(volCam.matrixWorld).invert();

					const pRay = new THREE.Ray(volCam.getWorldPosition(new THREE.Vector3()), volCam.getWorldDirection(new THREE.Vector3()));
					const rayInverse = new THREE.Ray(
						pRay.origin.clone().add(pRay.direction.clone().multiplyScalar(volume.scale.z)),
						pRay.direction.clone().multiplyScalar(-1)
					);

					const pickerSettings = {
						width: 8,
						height: 8,
						pickWindowSize: 8,
						all: true,
						pickClipped: true,
						pointSizeType: PointSizeType.FIXED,
						pointSize: 1
					};
					const pointsNear = pointcloud.pick(this.viewer, volCam, pRay, pickerSettings);

					volCam.rotateX(Math.PI);
					volCam.updateMatrix();
					volCam.updateMatrixWorld();
					volCam.updateProjectionMatrix();
					volCam.matrixWorldInverse.copy(volCam.matrixWorld).invert();
					const pointsFar = pointcloud.pick(this.viewer, volCam, rayInverse, pickerSettings);

					if (pointsNear) allPointsNear.push(...pointsNear);
					if (pointsFar) allPointsFar.push(...pointsFar);
				}
			}

			if (allPointsNear.length > 0 && allPointsFar.length > 0) {
				const viewLine = new THREE.Line3(ray.origin, new THREE.Vector3().addVectors(ray.origin, ray.direction));

				const closestOnLine = allPointsNear.map((p: any) => viewLine.closestPointToPoint(p.position, false, new THREE.Vector3()));
				const closest = closestOnLine.sort((a: THREE.Vector3, b: THREE.Vector3) => ray.origin.distanceTo(a) - ray.origin.distanceTo(b))[0];

				const farthestOnLine = allPointsFar.map((p: any) => viewLine.closestPointToPoint(p.position, false, new THREE.Vector3()));
				const farthest = farthestOnLine.sort((a: THREE.Vector3, b: THREE.Vector3) => ray.origin.distanceTo(b) - ray.origin.distanceTo(a))[0];

				const distance = closest.distanceTo(farthest);
				const centroid = new THREE.Vector3().addVectors(closest, farthest).multiplyScalar(0.5);
				volume.scale.z = distance * 1.1;
				volume.position.copy(centroid);
			}

			volume.clip = true;
		};

		this.addEventListener('drag', drag);
		this.addEventListener('drop', drop);

		this.viewer.inputHandler?.addInputListener(this);

		return volume;
	}

	update(_e?: any): void {}

	render(): void {
		this.viewer.renderer.render(this.scene, this.viewer.scene.getActiveCamera());
	}
}
