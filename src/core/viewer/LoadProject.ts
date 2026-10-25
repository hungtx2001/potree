import * as THREE from 'three';
import proj4 from 'proj4';
import { Annotation } from '../tools/Annotation.js';
import { Measure } from '../tools/Measure.js';
import { CameraAnimation } from '../tools/CameraAnimation.js';
import { Utils } from '../utils/Utils.js';
import { PointSizeType } from '../types.js';
import { loadPointCloud as apiLoadPointCloud } from '../index.js';
import { OrientedImageLoader } from '../tools/OrientedImages.js';
import { GeoPackageLoader } from '../loader/GeoPackageLoader.js';
import { Profile } from '../tools/Profile.js';
import { BoxVolume, SphereVolume, Volume } from '../tools/Volume.js';

const volumeConstructors: Record<string, any> = {
	BoxVolume,
	SphereVolume,
	Volume
};

function loadPointCloud(viewer: any, data: any): Promise<any> {
	const loadMaterial = (target: any) => {
		if (data.material) {
			if (data.material.activeAttributeName != null) {
				target.activeAttributeName = data.material.activeAttributeName;
			}

			if (data.material.ranges != null) {
				for (const range of data.material.ranges) {
					if (range.name === 'elevationRange') {
						target.elevationRange = range.value;
					} else if (range.name === 'intensityRange') {
						target.intensityRange = range.value;
					} else if (target.setRange) {
						target.setRange(range.name, range.value);
					}
				}
			}

			if (data.material.size != null) {
				target.size = data.material.size;
			}

			if (data.material.minSize != null) {
				target.minSize = data.material.minSize;
			}

			if (data.material.pointSizeType != null) {
				target.pointSizeType = (PointSizeType as any)[data.material.pointSizeType];
			}

			if (data.material.matcap != null) {
				target.matcap = data.material.matcap;
			}
		} else if (data.activeAttributeName != null) {
			target.activeAttributeName = data.activeAttributeName;
		}
	};

	return new Promise((resolve) => {
		const names = viewer.scene.pointclouds.map((p: any) => p.name);
		const alreadyExists = names.includes(data.name);

		if (alreadyExists) {
			resolve(null);
			return;
		}

		apiLoadPointCloud(data.url, data.name, (e: any) => {
			const { pointcloud } = e;
			if (!pointcloud) {
				resolve(null);
				return;
			}

			pointcloud.position.set(data.position[0], data.position[1], data.position[2]);
			pointcloud.rotation.set(data.rotation[0], data.rotation[1], data.rotation[2]);
			pointcloud.scale.set(data.scale[0], data.scale[1], data.scale[2]);

			loadMaterial(pointcloud.material);
			viewer.scene.addPointCloud(pointcloud);
			resolve(pointcloud);
		});
	});
}

function loadMeasurement(viewer: any, data: any): void {
	const duplicate = viewer.scene.measurements.find((measure: any) => measure.uuid === data.uuid);
	if (duplicate) return;

	const measure = new Measure();
	measure.uuid = data.uuid;
	measure.name = data.name;
	measure.showDistances = data.showDistances;
	measure.showCoordinates = data.showCoordinates;
	measure.showArea = data.showArea;
	measure.closed = data.closed;
	measure.showAngles = data.showAngles;
	measure.showHeight = data.showHeight;
	measure.showCircle = data.showCircle;
	measure.showAzimuth = data.showAzimuth;
	measure.showEdges = data.showEdges;

	for (const point of data.points) {
		const pos = new THREE.Vector3(point[0], point[1], point[2]);
		measure.addMarker(pos);
	}

	viewer.scene.addMeasurement(measure);
}

function loadVolume(viewer: any, data: any): void {
	const duplicate = viewer.scene.volumes.find((v: any) => v.uuid === data.uuid);
	if (duplicate) return;

	const VolumeClass = volumeConstructors[data.type] || BoxVolume;
	const volume = new VolumeClass();

	volume.uuid = data.uuid;
	volume.name = data.name;
	volume.position.set(data.position[0], data.position[1], data.position[2]);
	volume.rotation.set(data.rotation[0], data.rotation[1], data.rotation[2]);
	volume.scale.set(data.scale[0], data.scale[1], data.scale[2]);
	volume.visible = data.visible;
	volume.clip = data.clip;

	viewer.scene.addVolume(volume);
}

function loadCameraAnimation(viewer: any, data: any): void {
	const duplicate = viewer.scene.cameraAnimations.find((a: any) => a.uuid === data.uuid);
	if (duplicate) return;

	const animation = new CameraAnimation(viewer);
	animation.uuid = data.uuid;
	animation.name = data.name;
	animation.duration = data.duration;
	animation.t = data.t;
	(animation as any).curveType = data.curveType;
	animation.visible = data.visible;
	animation.controlPoints = [];

	for (const cpdata of data.controlPoints) {
		const cp = animation.createControlPoint();
		cp.position.set(cpdata.position[0], cpdata.position[1], cpdata.position[2]);
		cp.target.set(cpdata.target[0], cpdata.target[1], cpdata.target[2]);
	}

	viewer.scene.addCameraAnimation(animation);
}

function loadOrientedImages(viewer: any, images: any): void {
	const { cameraParamsPath, imageParamsPath } = images;
	const duplicate = viewer.scene.orientedImages.find((i: any) => i.imageParamsPath === imageParamsPath);
	if (duplicate) return;

	OrientedImageLoader.load(cameraParamsPath, imageParamsPath, viewer).then((imgs: any) => {
		viewer.scene.addOrientedImages(imgs);
	});
}

function loadGeopackage(viewer: any, geopackage: any): void {
	const path = geopackage.path;
	const duplicate = viewer.scene.geopackages.find((i: any) => i.path === path);
	if (duplicate) return;

	const projection = viewer.getProjection?.();
	proj4.defs('WGS84', '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs');
	if (projection) {
		proj4.defs('pointcloud', projection);
	}
	const transform = proj4('WGS84', 'pointcloud');
	const params = { transform };

	GeoPackageLoader.loadUrl(path, params).then((data: any) => {
		viewer.scene.addGeopackage(data);
	});
}

function loadSettings(viewer: any, data: any): void {
	if (!data) return;

	viewer.setPointBudget?.(data.pointBudget);
	viewer.setFOV?.(data.fov);
	viewer.setEDLEnabled?.(data.edlEnabled);
	viewer.setEDLRadius?.(data.edlRadius);
	viewer.setEDLStrength?.(data.edlStrength);
	viewer.setBackground?.(data.background);
	viewer.setMinNodeSize?.(data.minNodeSize);
	viewer.setShowBoundingBox?.(data.showBoundingBoxes);
}

function loadView(viewer: any, view: any): void {
	if (!view) return;
	viewer.scene.view.position.set(view.position[0], view.position[1], view.position[2]);
	viewer.scene.view.lookAt(new THREE.Vector3(view.target[0], view.target[1], view.target[2]));
}

function loadAnnotationItem(item: any): Annotation {
	const annotation = new Annotation({
		position: item.position,
		title: item.title,
		cameraPosition: item.cameraPosition,
		cameraTarget: item.cameraTarget
	});

	annotation.description = item.description;
	annotation.uuid = item.uuid;
	if (item.offset) {
		annotation.offset.set(item.offset[0], item.offset[1], item.offset[2]);
	}
	return annotation;
}

function loadAnnotations(viewer: any, data: any): void {
	if (!data) return;

	const findDuplicate = (item: any) => {
		let duplicate: any = null;
		viewer.scene.annotations.traverse((a: any) => {
			if (a.uuid === item.uuid) {
				duplicate = a;
			}
		});
		return duplicate;
	};

	const traverse = (item: any, parent: any) => {
		const duplicate = findDuplicate(item);
		if (duplicate) return;

		const annotation = loadAnnotationItem(item);
		if (item.children) {
			for (const childItem of item.children) {
				traverse(childItem, annotation);
			}
		}
		parent.add(annotation);
	};

	for (const item of data) {
		traverse(item, viewer.scene.annotations);
	}
}

function loadProfile(viewer: any, data: any): void {
	const { name, points } = data;
	const duplicate = viewer.scene.profiles.find((p: any) => p.uuid === data.uuid);
	if (duplicate) return;

	const profile = new Profile();
	profile.name = name;
	profile.uuid = data.uuid;
	profile.setWidth(data.width);

	for (const point of points) {
		profile.addMarker(new THREE.Vector3(point[0], point[1], point[2]));
	}
	viewer.scene.addProfile(profile);
}

function loadClassification(viewer: any, data: any): void {
	if (!data) return;
	viewer.setClassifications?.(data);
}

export async function loadProject(viewer: any, data: any): Promise<void> {
	if (data.type !== 'Potree') {
		console.error('not a valid Potree project');
		return;
	}

	loadSettings(viewer, data.settings);
	loadView(viewer, data.view);

	const pointcloudPromises: Array<Promise<any>> = [];
	if (data.pointclouds) {
		for (const pointcloud of data.pointclouds) {
			const promise = loadPointCloud(viewer, pointcloud);
			pointcloudPromises.push(promise);
		}
	}

	if (data.measurements) {
		for (const measure of data.measurements) {
			loadMeasurement(viewer, measure);
		}
	}

	if (data.volumes) {
		for (const volume of data.volumes) {
			loadVolume(viewer, volume);
		}
	}

	if (data.cameraAnimations) {
		for (const animation of data.cameraAnimations) {
			loadCameraAnimation(viewer, animation);
		}
	}

	if (data.profiles) {
		for (const profile of data.profiles) {
			loadProfile(viewer, profile);
		}
	}

	if (data.orientedImages) {
		for (const images of data.orientedImages) {
			loadOrientedImages(viewer, images);
		}
	}

	loadAnnotations(viewer, data.annotations);
	loadClassification(viewer, data.classification);

	Utils.waitAny(pointcloudPromises).then(() => {
		if (data.geopackages) {
			for (const geopackage of data.geopackages) {
				loadGeopackage(viewer, geopackage);
			}
		}
	});

	await Promise.all(pointcloudPromises);
}
