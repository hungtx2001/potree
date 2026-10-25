import { PointSizeType } from '../types.js';

function createPointcloudData(pointcloud: any): any {
	const material = pointcloud.material;
	const ranges: Array<{ name: string; value: any }> = [];

	if (material.ranges) {
		for (const [name, value] of material.ranges) {
			ranges.push({ name, value });
		}
	}

	if (typeof material.elevationRange?.[0] === 'number') {
		ranges.push({
			name: 'elevationRange',
			value: material.elevationRange
		});
	}
	if (typeof material.intensityRange?.[0] === 'number') {
		ranges.push({
			name: 'intensityRange',
			value: material.intensityRange
		});
	}

	const entry = Object.entries(PointSizeType).find((e) => e[1] === material.pointSizeType);
	const pointSizeTypeName = entry ? entry[0] : 'ATTENUATED';

	const jsonMaterial = {
		activeAttributeName: material.activeAttributeName,
		ranges: ranges,
		size: material.size,
		minSize: material.minSize,
		pointSizeType: pointSizeTypeName,
		matcap: material.matcap
	};

	return {
		name: pointcloud.name,
		url: pointcloud.pcoGeometry?.url || '',
		position: pointcloud.position.toArray(),
		rotation: pointcloud.rotation.toArray(),
		scale: pointcloud.scale.toArray(),
		material: jsonMaterial
	};
}

function createProfileData(profile: any): any {
	return {
		uuid: profile.uuid,
		name: profile.name,
		points: profile.points.map((p: any) => p.toArray()),
		height: profile.height,
		width: profile.width
	};
}

function createVolumeData(volume: any): any {
	return {
		uuid: volume.uuid,
		type: volume.constructor.name,
		name: volume.name,
		position: volume.position.toArray(),
		rotation: volume.rotation.toArray(),
		scale: volume.scale.toArray(),
		visible: volume.visible,
		clip: volume.clip
	};
}

function createCameraAnimationData(animation: any): any {
	const controlPoints = animation.controlPoints.map((cp: any) => ({
		position: cp.position.toArray(),
		target: cp.target.toArray()
	}));

	return {
		uuid: animation.uuid,
		name: animation.name,
		duration: animation.duration,
		t: animation.t,
		curveType: animation.curveType,
		visible: animation.visible,
		controlPoints: controlPoints
	};
}

function createMeasurementData(measurement: any): any {
	return {
		uuid: measurement.uuid,
		name: measurement.name,
		points: measurement.points.map((p: any) => p.position.toArray()),
		showDistances: measurement.showDistances,
		showCoordinates: measurement.showCoordinates,
		showArea: measurement.showArea,
		closed: measurement.closed,
		showAngles: measurement.showAngles,
		showHeight: measurement.showHeight,
		showCircle: measurement.showCircle,
		showAzimuth: measurement.showAzimuth,
		showEdges: measurement.showEdges,
		color: measurement.color?.toArray?.() || [1, 1, 1]
	};
}

function createOrientedImagesData(images: any): any {
	return {
		cameraParamsPath: images.cameraParamsPath,
		imageParamsPath: images.imageParamsPath
	};
}

function createGeopackageData(geopackage: any): any {
	return {
		path: geopackage.path
	};
}

function createAnnotationData(annotation: any): any {
	const data: any = {
		uuid: annotation.uuid,
		title: annotation.title?.toString() || '',
		description: annotation.description,
		position: annotation.position.toArray(),
		offset: annotation.offset?.toArray?.() || [0, 0, 0],
		children: []
	};

	if (annotation.cameraPosition) {
		data.cameraPosition = annotation.cameraPosition.toArray();
	}

	if (annotation.cameraTarget) {
		data.cameraTarget = annotation.cameraTarget.toArray();
	}

	if (typeof annotation.radius !== 'undefined') {
		data.radius = annotation.radius;
	}

	return data;
}

function createAnnotationsData(viewer: any): any[] {
	const map = new Map<any, any>();

	viewer.scene.annotations.traverseDescendants((a: any) => {
		const aData = createAnnotationData(a);
		map.set(a, aData);
	});

	for (const [annotation, data] of map) {
		for (const child of annotation.children) {
			const childData = map.get(child);
			if (childData) {
				data.children.push(childData);
			}
		}
	}

	return viewer.scene.annotations.children.map((a: any) => map.get(a)).filter(Boolean);
}

function createSettingsData(viewer: any): any {
	return {
		pointBudget: viewer.getPointBudget?.(),
		fov: viewer.getFOV?.(),
		edlEnabled: viewer.getEDLEnabled?.(),
		edlRadius: viewer.getEDLRadius?.(),
		edlStrength: viewer.getEDLStrength?.(),
		background: viewer.getBackground?.(),
		minNodeSize: viewer.getMinNodeSize?.(),
		showBoundingBoxes: viewer.getShowBoundingBox?.()
	};
}

function createViewData(viewer: any): any {
	const view = viewer.scene.view;
	return {
		position: view.position.toArray(),
		target: view.getPivot().toArray()
	};
}

function createClassificationData(viewer: any): any {
	return viewer.classifications || {};
}

export function saveProject(viewer: any): any {
	const scene = viewer.scene;

	return {
		type: 'Potree',
		version: 2.0,
		settings: createSettingsData(viewer),
		view: createViewData(viewer),
		classification: createClassificationData(viewer),
		pointclouds: scene.pointclouds.map(createPointcloudData),
		measurements: scene.measurements.map(createMeasurementData),
		volumes: scene.volumes.map(createVolumeData),
		cameraAnimations: scene.cameraAnimations.map(createCameraAnimationData),
		profiles: scene.profiles.map(createProfileData),
		annotations: createAnnotationsData(viewer),
		orientedImages: scene.orientedImages.map(createOrientedImagesData),
		geopackages: scene.geopackages.map(createGeopackageData)
	};
}
