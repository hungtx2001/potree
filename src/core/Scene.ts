import * as THREE from 'three';
import { Annotation, type AnnotationArgs } from './tools/Annotation.js';
import { CameraMode } from './types.js';
import { View } from './navigation/View.js';
import { Utils } from './utils/Utils.js';
import { EventDispatcher } from './EventDispatcher.js';
import type { PointCloudOctree } from './octree/PointCloudOctree.js';
import type { Measure } from './tools/Measure.js';
import type { Profile } from './tools/Profile.js';
import type { Volume } from './tools/Volume.js';
import type { PolygonClipVolume } from './tools/PolygonClipVolume.js';

export class Scene extends EventDispatcher {
	annotations: Annotation;
	scene: THREE.Scene;
	sceneBG: THREE.Scene;
	scenePointCloud: THREE.Scene;
	referenceFrame!: THREE.Object3D;

	cameraP: THREE.PerspectiveCamera;
	cameraO: THREE.OrthographicCamera;
	cameraVR: THREE.PerspectiveCamera;
	cameraBG: THREE.Camera;
	cameraScreenSpace: THREE.OrthographicCamera;
	cameraMode: CameraMode;
	overrideCamera: THREE.Camera | null;

	pointclouds: PointCloudOctree[];
	measurements: Measure[];
	profiles: Profile[];
	volumes: Volume[];
	polygonClipVolumes: PolygonClipVolume[];
	cameraAnimations: any[];
	orientedImages: any[];
	images360: any[];
	geopackages: any[];

	fpControls: any;
	orbitControls: any;
	earthControls: any;
	geoControls: any;
	deviceControls: any;
	inputHandler: any;

	view: View;
	directionalLight: THREE.DirectionalLight | null;
	lengthUnit: string = 'm';
	lengthUnitDisplay: string = 'm';
	fov: number = 60;

	constructor() {
		super();

		this.annotations = new Annotation();

		this.scene = new THREE.Scene();
		this.sceneBG = new THREE.Scene();
		this.scenePointCloud = new THREE.Scene();

		this.cameraP = new THREE.PerspectiveCamera(this.fov, 1, 0.1, 1000 * 1000);
		this.cameraO = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000 * 1000);
		this.cameraVR = new THREE.PerspectiveCamera();
		this.cameraBG = new THREE.Camera();
		this.cameraScreenSpace = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
		this.cameraMode = CameraMode.PERSPECTIVE;
		this.overrideCamera = null;
		this.pointclouds = [];

		this.measurements = [];
		this.profiles = [];
		this.volumes = [];
		this.polygonClipVolumes = [];
		this.cameraAnimations = [];
		this.orientedImages = [];
		this.images360 = [];
		this.geopackages = [];

		this.fpControls = null;
		this.orbitControls = null;
		this.earthControls = null;
		this.geoControls = null;
		this.deviceControls = null;
		this.inputHandler = null;

		this.view = new View();
		this.directionalLight = null;

		this.initialize();
	}

	estimateHeightAt(position: THREE.Vector3): number | null {
		let height: number | null = null;
		let fromSpacing = Infinity;

		for (const pointcloud of this.pointclouds) {
			if (!(pointcloud as any).root?.geometryNode) {
				continue;
			}

			let pHeight: number | null = null;
			let pFromSpacing = Infinity;

			const lpos = position.clone().sub(pointcloud.position);
			lpos.z = 0;
			const ray = new THREE.Ray(lpos, new THREE.Vector3(0, 0, 1));

			const stack = [(pointcloud as any).root];
			while (stack.length > 0) {
				const node = stack.pop();
				const box = node.getBoundingBox ? node.getBoundingBox() : node.boundingBox;

				const inside = ray.intersectBox(box, new THREE.Vector3());

				if (!inside) {
					continue;
				}

				const h = node.geometryNode.mean.z +
					pointcloud.position.z +
					node.geometryNode.boundingBox.min.z;

				if (node.geometryNode.spacing <= pFromSpacing) {
					pHeight = h;
					pFromSpacing = node.geometryNode.spacing;
				}

				if (node.children) {
					for (const index of Object.keys(node.children)) {
						const child = node.children[index];
						if (child && child.geometryNode) {
							stack.push(child);
						}
					}
				}
			}

			if (height === null || pFromSpacing < fromSpacing) {
				height = pHeight;
				fromSpacing = pFromSpacing;
			}
		}

		return height;
	}

	getBoundingBox(pointclouds: PointCloudOctree[] = this.pointclouds): THREE.Box3 {
		const box = new THREE.Box3();

		this.scenePointCloud.updateMatrixWorld(true);
		this.referenceFrame.updateMatrixWorld(true);

		for (const pointcloud of pointclouds) {
			pointcloud.updateMatrixWorld(true);

			const pcoGeom = (pointcloud as any).pcoGeometry;
			const pointcloudBox = pcoGeom?.tightBoundingBox ? pcoGeom.tightBoundingBox : pointcloud.boundingBox;
			if (pointcloudBox) {
				const boxWorld = Utils.computeTransformedBoundingBox(pointcloudBox, pointcloud.matrixWorld);
				box.union(boxWorld);
			}
		}

		return box;
	}

	addPointCloud(pointcloud: PointCloudOctree): void {
		this.pointclouds.push(pointcloud);
		this.scenePointCloud.add(pointcloud);

		this.dispatchEvent({
			type: 'pointcloud_added',
			pointcloud
		});
	}

	removePointCloud(pointcloud: PointCloudOctree): void {
		const index = this.pointclouds.indexOf(pointcloud);
		if (index > -1) {
			this.pointclouds.splice(index, 1);
			this.scenePointCloud.remove(pointcloud);

			this.dispatchEvent({
				type: 'pointcloud_removed',
				pointcloud
			});
		}
	}

	removeAllPointClouds(): void {
		const toRemove = [...this.pointclouds];
		for (const pc of toRemove) {
			this.removePointCloud(pc);
		}
	}

	addVolume(volume: Volume): void {
		this.volumes.push(volume);
		this.dispatchEvent({
			type: 'volume_added',
			scene: this,
			volume
		});
	}

	addOrientedImages(images: any): void {
		this.orientedImages.push(images);
		if (images.node) {
			this.scene.add(images.node);
		}

		this.dispatchEvent({
			type: 'oriented_images_added',
			scene: this,
			images
		});
	}

	removeOrientedImages(images: any): void {
		const index = this.orientedImages.indexOf(images);
		if (index > -1) {
			this.orientedImages.splice(index, 1);
			if (images.node) {
				this.scene.remove(images.node);
			}

			this.dispatchEvent({
				type: 'oriented_images_removed',
				scene: this,
				images
			});
		}
	}

	add360Images(images: any): void {
		this.images360.push(images);
		if (images.node) {
			this.scene.add(images.node);
		}

		this.dispatchEvent({
			type: '360_images_added',
			scene: this,
			images
		});
	}

	remove360Images(images: any): void {
		const index = this.images360.indexOf(images);
		if (index > -1) {
			this.images360.splice(index, 1);
			if (images.node) {
				this.scene.remove(images.node);
			}

			this.dispatchEvent({
				type: '360_images_removed',
				scene: this,
				images
			});
		}
	}

	addGeopackage(geopackage: any): void {
		this.geopackages.push(geopackage);
		if (geopackage.node) {
			this.scene.add(geopackage.node);
		}

		this.dispatchEvent({
			type: 'geopackage_added',
			scene: this,
			geopackage
		});
	}

	removeGeopackage(geopackage: any): void {
		const index = this.geopackages.indexOf(geopackage);
		if (index > -1) {
			this.geopackages.splice(index, 1);
			if (geopackage.node) {
				this.scene.remove(geopackage.node);
			}

			this.dispatchEvent({
				type: 'geopackage_removed',
				scene: this,
				geopackage
			});
		}
	}

	removeVolume(volume: Volume): void {
		const index = this.volumes.indexOf(volume);
		if (index > -1) {
			this.volumes.splice(index, 1);

			this.dispatchEvent({
				type: 'volume_removed',
				scene: this,
				volume
			});
		}
	}

	addCameraAnimation(animation: any): void {
		this.cameraAnimations.push(animation);
		this.dispatchEvent({
			type: 'camera_animation_added',
			scene: this,
			animation
		});
	}

	removeCameraAnimation(animation: any): void {
		const index = this.cameraAnimations.indexOf(animation);
		if (index > -1) {
			this.cameraAnimations.splice(index, 1);

			this.dispatchEvent({
				type: 'camera_animation_removed',
				scene: this,
				animation
			});
		}
	}

	addPolygonClipVolume(volume: PolygonClipVolume): void {
		this.polygonClipVolumes.push(volume);
		this.dispatchEvent({
			type: 'polygon_clip_volume_added',
			scene: this,
			volume
		});
	}

	removePolygonClipVolume(volume: PolygonClipVolume): void {
		const index = this.polygonClipVolumes.indexOf(volume);
		if (index > -1) {
			this.polygonClipVolumes.splice(index, 1);
			this.dispatchEvent({
				type: 'polygon_clip_volume_removed',
				scene: this,
				volume
			});
		}
	}

	addMeasurement(measurement: Measure): void {
		measurement.lengthUnit = this.lengthUnit;
		measurement.lengthUnitDisplay = this.lengthUnitDisplay;
		this.measurements.push(measurement);
		this.dispatchEvent({
			type: 'measurement_added',
			scene: this,
			measurement
		});
	}

	removeMeasurement(measurement: Measure): void {
		const index = this.measurements.indexOf(measurement);
		if (index > -1) {
			this.measurements.splice(index, 1);
			this.dispatchEvent({
				type: 'measurement_removed',
				scene: this,
				measurement
			});
		}
	}

	addProfile(profile: Profile): void {
		this.profiles.push(profile);
		this.dispatchEvent({
			type: 'profile_added',
			scene: this,
			profile
		});
	}

	removeProfile(profile: Profile): void {
		const index = this.profiles.indexOf(profile);
		if (index > -1) {
			this.profiles.splice(index, 1);
			this.dispatchEvent({
				type: 'profile_removed',
				scene: this,
				profile
			});
		}
	}

	removeAllMeasurements(): void {
		while (this.measurements.length > 0) {
			this.removeMeasurement(this.measurements[0]);
		}

		while (this.profiles.length > 0) {
			this.removeProfile(this.profiles[0]);
		}

		while (this.volumes.length > 0) {
			this.removeVolume(this.volumes[0]);
		}
	}

	removeAllClipVolumes(): void {
		const clipVolumes = this.volumes.filter(volume => (volume as any).clip === true);
		for (const clipVolume of clipVolumes) {
			this.removeVolume(clipVolume);
		}

		while (this.polygonClipVolumes.length > 0) {
			this.removePolygonClipVolume(this.polygonClipVolumes[0]);
		}
	}

	getActiveCamera(): THREE.Camera | null {
		if (this.overrideCamera) {
			return this.overrideCamera;
		}

		if (this.cameraMode === CameraMode.PERSPECTIVE) {
			return this.cameraP;
		} else if (this.cameraMode === CameraMode.ORTHOGRAPHIC) {
			return this.cameraO;
		} else if (this.cameraMode === CameraMode.VR) {
			return this.cameraVR;
		}

		return null;
	}

	initialize(): void {
		this.referenceFrame = new THREE.Object3D();
		this.referenceFrame.matrixAutoUpdate = false;
		this.scenePointCloud.add(this.referenceFrame);

		this.cameraP.up.set(0, 0, 1);
		this.cameraP.position.set(1000, 1000, 1000);
		this.cameraO.up.set(0, 0, 1);
		this.cameraO.position.set(1000, 1000, 1000);
		this.cameraScreenSpace.lookAt(new THREE.Vector3(0, 0, 0));

		this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
		this.directionalLight.position.set(10, 10, 10);
		this.directionalLight.lookAt(new THREE.Vector3(0, 0, 0));
		this.scenePointCloud.add(this.directionalLight);

		const light = new THREE.AmbientLight(0x555555);
		this.scenePointCloud.add(light);

		// background
		const texture = Utils.createBackgroundTexture(512, 512);
		texture.minFilter = THREE.LinearFilter;
		texture.magFilter = THREE.LinearFilter;
		const bg = new THREE.Mesh(
			new THREE.PlaneGeometry(2, 2, 1),
			new THREE.MeshBasicMaterial({ map: texture })
		);
		bg.material.depthTest = false;
		bg.material.depthWrite = false;
		this.sceneBG.add(bg);
	}

	addAnnotation(position: THREE.Vector3 | number[], args: AnnotationArgs = {}): Annotation {
		if (position instanceof Array) {
			args.position = new THREE.Vector3().fromArray(position);
		} else if (position.x != null) {
			args.position = position;
		}
		const annotation = new Annotation(args);
		this.annotations.add(annotation);

		return annotation;
	}

	getAnnotations(): Annotation {
		return this.annotations;
	}

	removeAnnotation(annotationToRemove: Annotation): void {
		this.annotations.remove(annotationToRemove);
	}
}
