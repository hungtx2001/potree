
import * as THREE from 'three';
import $ from 'jquery';
import { ModernSlider } from './ui/components/ModernSlider.js';
import { ToggleGroup } from './ui/components/ToggleGroup.js';
import { ModernColorPicker } from './ui/components/ModernColorPicker.js';
import { SceneTree } from './ui/components/SceneTree.js';
import {GeoJSONExporter} from "../exporter/GeoJSONExporter.js"
import {DXFExporter} from "../exporter/DXFExporter.js"
import {Volume, SphereVolume} from "../utils/Volume.js"
import {PolygonClipVolume} from "../utils/PolygonClipVolume.js"
import {PropertiesPanel} from "./PropertyPanels/PropertiesPanel.js"
import {PointCloudTree} from "../PointCloudTree.js"
import {Profile} from "../utils/Profile.js"
import {Measure} from "../utils/Measure.js"
import {Annotation} from "../Annotation.js"
import {CameraMode, ClipTask, ClipMethod} from "../defines.js"
import {ScreenBoxSelectTool} from "../utils/ScreenBoxSelectTool.js"
import {Utils} from "../utils.js"
import {CameraAnimation} from "../modules/CameraAnimation/CameraAnimation.js"
import {HierarchicalSlider} from "./HierarchicalSlider.js"
import {OrientedImage} from "../modules/OrientedImages/OrientedImages.js";
import {Images360} from "../modules/Images360/Images360.js";
import { runtime, version } from "../runtime.js";
import { saveProject } from "./SaveProject.js";

import JSON5 from 'json5';

export class Sidebar{

	constructor(viewer){
		this.viewer = viewer;

		this.measuringTool = viewer.measuringTool;
		this.profileTool = viewer.profileTool;
		this.volumeTool = viewer.volumeTool;
		this.sceneTree = null;

		this.dom = $("#sidebar_root");
	}

	createToolIcon(icon, title, callback){
		let element = $(`
			<img src="${icon}"
				style="width: 32px; height: 32px"
				class="button-icon"
				data-i18n="${title}" />
		`);

		element.click(callback);

		return element;
	}

	selectTreeItem(uuid, category = 'measurements') {
		if (!this.sceneTree) return;
		const root = this.sceneTree.getJson(category);
		if (root && root.children) {
			const node = root.children.find(child => child.data && child.data.uuid === uuid);
			if (node) {
				this.sceneTree.selectNode(node.id);
			}
		}
	}

	removeTreeItem(uuid, category = 'measurements') {
		if (!this.sceneTree) return;
		const root = this.sceneTree.getJson(category);
		if (root && root.children) {
			const node = root.children.find(child => child.data && child.data.uuid === uuid);
			if (node) {
				this.sceneTree.deleteNode(node.id);
			}
		}
	}

	init(){

		this.initAccordion();
		this.initAppearance();
		this.initToolbar();
		this.initScene();
		this.initNavigation();
		this.initFilters();
		this.initClippingTool();
		this.initSettings();
		
		$('#potree_version_number').html(version.major + "." + version.minor + version.suffix);
	}

		

	initToolbar(){

		// ANGLE
		let elToolbar = $('#tools');
		elToolbar.append(this.createToolIcon(
			runtime.resourcePath + '/icons/angle.png',
			'[title]tt.angle_measurement',
			() => {
				$('#menu_measurements').next().slideDown();
				let measurement = this.measuringTool.startInsertion({
					showDistances: false,
					showAngles: true,
					showArea: false,
					closed: true,
					maxMarkers: 3,
					name: 'Angle'});

				let measurementsRoot = this.sceneTree ? this.sceneTree.getJson("measurements") : null;
				this.selectTreeItem(measurement.uuid, 'measurements');
			}
		));

		// POINT
		elToolbar.append(this.createToolIcon(
			runtime.resourcePath + '/icons/point.svg',
			'[title]tt.point_measurement',
			() => {
				$('#menu_measurements').next().slideDown();
				let measurement = this.measuringTool.startInsertion({
					showDistances: false,
					showAngles: false,
					showCoordinates: true,
					showArea: false,
					closed: true,
					maxMarkers: 1,
					name: 'Point'});

				this.selectTreeItem(measurement.uuid, 'measurements');
			}
		));

		// DISTANCE
		elToolbar.append(this.createToolIcon(
			runtime.resourcePath + '/icons/distance.svg',
			'[title]tt.distance_measurement',
			() => {
				$('#menu_measurements').next().slideDown();
				let measurement = this.measuringTool.startInsertion({
					showDistances: true,
					showArea: false,
					closed: false,
					name: 'Distance'});

				this.selectTreeItem(measurement.uuid, 'measurements');
			}
		));

		// HEIGHT
		elToolbar.append(this.createToolIcon(
			runtime.resourcePath + '/icons/height.svg',
			'[title]tt.height_measurement',
			() => {
				$('#menu_measurements').next().slideDown();
				let measurement = this.measuringTool.startInsertion({
					showDistances: false,
					showHeight: true,
					showArea: false,
					closed: false,
					maxMarkers: 2,
					name: 'Height'});

				this.selectTreeItem(measurement.uuid, 'measurements');
			}
		));

		// CIRCLE
		elToolbar.append(this.createToolIcon(
			runtime.resourcePath + '/icons/circle.svg',
			'[title]tt.circle_measurement',
			() => {
				$('#menu_measurements').next().slideDown();
				let measurement = this.measuringTool.startInsertion({
					showDistances: false,
					showHeight: false,
					showArea: false,
					showCircle: true,
					showEdges: false,
					closed: false,
					maxMarkers: 3,
					name: 'Circle'});

				this.selectTreeItem(measurement.uuid, 'measurements');
			}
		));

		// AZIMUTH
		elToolbar.append(this.createToolIcon(
			runtime.resourcePath + '/icons/azimuth.svg',
			'Azimuth',
			() => {
				$('#menu_measurements').next().slideDown();
				let measurement = this.measuringTool.startInsertion({
					showDistances: false,
					showHeight: false,
					showArea: false,
					showCircle: false,
					showEdges: false,
					showAzimuth: true,
					closed: false,
					maxMarkers: 2,
					name: 'Azimuth'});

				this.selectTreeItem(measurement.uuid, 'measurements');
			}
		));

		// AREA
		elToolbar.append(this.createToolIcon(
			runtime.resourcePath + '/icons/area.svg',
			'[title]tt.area_measurement',
			() => {
				$('#menu_measurements').next().slideDown();
				let measurement = this.measuringTool.startInsertion({
					showDistances: true,
					showArea: true,
					closed: true,
					name: 'Area'});

				this.selectTreeItem(measurement.uuid, 'measurements');
			}
		));

		// VOLUME
		elToolbar.append(this.createToolIcon(
			runtime.resourcePath + '/icons/volume.svg',
			'[title]tt.volume_measurement',
			() => {
				let volume = this.volumeTool.startInsertion(); 
				this.selectTreeItem(volume.uuid, 'measurements');
			}
		));

		// SPHERE VOLUME
		elToolbar.append(this.createToolIcon(
			runtime.resourcePath + '/icons/sphere_distances.svg',
			'[title]tt.volume_measurement',
			() => { 
				let volume = this.volumeTool.startInsertion({type: SphereVolume}); 
				this.selectTreeItem(volume.uuid, 'measurements');
			}
		));

		// PROFILE
		elToolbar.append(this.createToolIcon(
			runtime.resourcePath + '/icons/profile.svg',
			'[title]tt.height_profile',
			() => {
				$('#menu_measurements').next().slideDown();
				let profile = this.profileTool.startInsertion();
				this.selectTreeItem(profile.uuid, 'measurements');
			}
		));

		// ANNOTATION
		elToolbar.append(this.createToolIcon(
			runtime.resourcePath + '/icons/annotation.svg',
			'[title]tt.annotation',
			() => {
				$('#menu_measurements').next().slideDown();
				let annotation = this.viewer.annotationTool.startInsertion();
				this.selectTreeItem(annotation.uuid, 'annotations');
			}
		));

		// REMOVE ALL
		elToolbar.append(this.createToolIcon(
			runtime.resourcePath + '/icons/reset_tools.svg',
			'[title]tt.remove_all_measurement',
			() => {
				this.viewer.scene.removeAllMeasurements();
			}
		));

		{ // SHOW / HIDE Measurements
			this.showMeasureToggle = new ToggleGroup({
				container: '#measurement_options_show',
				title: 'Show/Hide labels',
				options: [
					{ value: 'SHOW', label: 'Show' },
					{ value: 'HIDE', label: 'Hide' }
				],
				value: this.measuringTool.showLabels ? 'SHOW' : 'HIDE',
				onChange: (val) => {
					this.measuringTool.showLabels = (val === 'SHOW');
				}
			});
		}
	}

	initScene(){

		let elScene = $("#menu_scene");
		let elObjects = elScene.next().find("#scene_objects");
		let elProperties = elScene.next().find("#scene_object_properties");
		

		{
			let elExport = elScene.next().find("#scene_export");

			let geoJSONIcon = `${runtime.resourcePath}/icons/file_geojson.svg`;
			let dxfIcon = `${runtime.resourcePath}/icons/file_dxf.svg`;
			let potreeIcon = `${runtime.resourcePath}/icons/file_potree.svg`;

			elExport.append(`
				Export: <br>
				<a href="#" download="measure.json"><img name="geojson_export_button" src="${geoJSONIcon}" class="button-icon" style="height: 24px" /></a>
				<a href="#" download="measure.dxf"><img name="dxf_export_button" src="${dxfIcon}" class="button-icon" style="height: 24px" /></a>
				<a href="#" download="potree.json5"><img name="potree_export_button" src="${potreeIcon}" class="button-icon" style="height: 24px" /></a>
			`);

			let elDownloadJSON = elExport.find("img[name=geojson_export_button]").parent();
			elDownloadJSON.click( (event) => {
				let scene = this.viewer.scene;
				let measurements = [...scene.measurements, ...scene.profiles, ...scene.volumes];

				if(measurements.length > 0){
					let geoJson = GeoJSONExporter.toString(measurements);

					let url = URL.createObjectURL(new Blob([geoJson], {type: 'data:application/octet-stream'}));
					elDownloadJSON.attr('href', url);
				}else{
					this.viewer.postError("no measurements to export");
					event.preventDefault();
				}
			});

			let elDownloadDXF = elExport.find("img[name=dxf_export_button]").parent();
			elDownloadDXF.click( (event) => {
				let scene = this.viewer.scene;
				let measurements = [...scene.measurements, ...scene.profiles, ...scene.volumes];

				if(measurements.length > 0){
					let dxf = DXFExporter.toString(measurements);

					let url = URL.createObjectURL(new Blob([dxf], {type: 'data:application/octet-stream'}));
					elDownloadDXF.attr('href', url);
				}else{
					this.viewer.postError("no measurements to export");
					event.preventDefault();
				}
			});

			let elDownloadPotree = elExport.find("img[name=potree_export_button]").parent();
			elDownloadPotree.click( (event) => {

				let data = saveProject(this.viewer);
				let dataString = JSON5.stringify(data, null, "\t")

				let url = URL.createObjectURL(new Blob([dataString], {type: 'data:application/octet-stream'}));
				elDownloadPotree.attr('href', url);
			});
		}

		let propertiesPanel = new PropertiesPanel(elProperties, this.viewer);
		propertiesPanel.setScene(this.viewer.scene);
		
		this.sceneTree = new SceneTree({
			container: elObjects[0] || elObjects,
			onSelect: (node) => {
				let object = node.data;
				propertiesPanel.set(object);

				this.viewer.inputHandler.deselectAll();

				if(object instanceof Volume){
					this.viewer.inputHandler.toggleSelection(object);
				}

				if (this.viewer.renderer && this.viewer.renderer.domElement) {
					this.viewer.renderer.domElement.focus();
				}
			},
			onDeselect: () => {
				propertiesPanel.set(null);
			},
			onDelete: () => {
				propertiesPanel.set(null);
			},
			onDoubleClick: (node) => {
				let object = node.data;
				if (!object) return;

				if(object instanceof PointCloudTree){
					let box = this.viewer.getBoundingBox([object]);
					let n = new THREE.Object3D();
					n.boundingBox = box;
					this.viewer.zoomTo(n, 1, 500);
				}else if(object instanceof Measure){
					let points = object.points.map(p => p.position);
					let box = new THREE.Box3().setFromPoints(points);
					if(box.getSize(new THREE.Vector3()).length() > 0){
						let n = new THREE.Object3D();
						n.boundingBox = box;
						this.viewer.zoomTo(n, 2, 500);
					}
				}else if(object instanceof Profile){
					let points = object.points;
					let box = new THREE.Box3().setFromPoints(points);
					if(box.getSize(new THREE.Vector3()).length() > 0){
						let n = new THREE.Object3D();
						n.boundingBox = box;
						this.viewer.zoomTo(n, 1, 500);
					}
				}else if(object instanceof Volume){
					let box = object.boundingBox.clone().applyMatrix4(object.matrixWorld);
					if(box.getSize(new THREE.Vector3()).length() > 0){
						let n = new THREE.Object3D();
						n.boundingBox = box;
						this.viewer.zoomTo(n, 1, 500);
					}
				}else if(object instanceof Annotation){
					object.moveHere(this.viewer.scene.getActiveCamera());
				}else if(object instanceof PolygonClipVolume){
					let dir = object.camera.getWorldDirection(new THREE.Vector3());
					let target;

					if(object.camera instanceof THREE.OrthographicCamera){
						dir.multiplyScalar(object.camera.right);
						target = new THREE.Vector3().addVectors(object.camera.position, dir);
						this.viewer.setCameraMode(CameraMode.ORTHOGRAPHIC);
					}else if(object.camera instanceof THREE.PerspectiveCamera){
						dir.multiplyScalar(this.viewer.scene.view.radius);
						target = new THREE.Vector3().addVectors(object.camera.position, dir);
						this.viewer.setCameraMode(CameraMode.PERSPECTIVE);
					}
					
					this.viewer.scene.view.position.copy(object.camera.position);
					this.viewer.scene.view.lookAt(target);
				}else if(object.type === "SpotLight"){
					let distance = (object.distance > 0) ? object.distance / 4 : 5 * 1000;
					let position = object.position;
					let target = new THREE.Vector3().addVectors(
						position, 
						object.getWorldDirection(new THREE.Vector3()).multiplyScalar(distance));

					this.viewer.scene.view.position.copy(object.position);
					this.viewer.scene.view.lookAt(target);
				}else if(object instanceof THREE.Object3D){
					let box = new THREE.Box3().setFromObject(object);
					if(box.getSize(new THREE.Vector3()).length() > 0){
						let n = new THREE.Object3D();
						n.boundingBox = box;
						this.viewer.zoomTo(n, 1, 500);
					}
				}
			}
		});

		let tree = this.sceneTree;

		let createNode = (parent, text, icon, object) => {
			let nodeID = tree.createNode(parent, { 
				text: text, 
				icon: icon,
				data: object
			});
			
			if(object && object.visible){
				tree.checkNode(nodeID);
			}else{
				tree.uncheckNode(nodeID);
			}

			return nodeID;
		};

		let pcID = tree.createNode("#", { text: "<b>Point Clouds</b>", id: "pointclouds" });
		let measurementID = tree.createNode("#", { text: "<b>Measurements</b>", id: "measurements" });
		let annotationsID = tree.createNode("#", { text: "<b>Annotations</b>", id: "annotations" });
		let otherID = tree.createNode("#", { text: "<b>Other</b>", id: "other" });
		let vectorsID = tree.createNode("#", { text: "<b>Vectors</b>", id: "vectors" });
		let imagesID = tree.createNode("#", { text: "<b> Images</b>", id: "images" });

		tree.checkNode(pcID);
		tree.checkNode(measurementID);
		tree.checkNode(annotationsID);
		tree.checkNode(otherID);
		tree.checkNode(vectorsID);
		tree.checkNode(imagesID);

		let onPointCloudAdded = (e) => {
			let pointcloud = e.pointcloud;
			let cloudIcon = `${runtime.resourcePath}/icons/cloud.svg`;
			let node = createNode(pcID, pointcloud.name, cloudIcon, pointcloud);

			pointcloud.addEventListener("visibility_changed", () => {
				if(pointcloud.visible){
					tree.checkNode(node);
				}else{
					tree.uncheckNode(node);
				}
			});
		};

		let onMeasurementAdded = (e) => {
			let measurement = e.measurement;
			let icon = Utils.getMeasurementIcon(measurement);
			createNode(measurementID, measurement.name, icon, measurement);
		};

		let onVolumeAdded = (e) => {
			let volume = e.volume;
			let icon = Utils.getMeasurementIcon(volume);
			let node = createNode(measurementID, volume.name, icon, volume);

			volume.addEventListener("visibility_changed", () => {
				if(volume.visible){
					tree.checkNode(node);
				}else{
					tree.uncheckNode(node);
				}
			});
		};

		let onProfileAdded = (e) => {
			let profile = e.profile;
			let icon = Utils.getMeasurementIcon(profile);
			createNode(measurementID, profile.name, icon, profile);
		};

		let onAnnotationAdded = (e) => {
			let annotation = e.annotation;

			let annotationIcon = `${runtime.resourcePath}/icons/annotation.svg`;
			let parentID = this.annotationMapping.get(annotation.parent);
			let annotationID = createNode(parentID, annotation.title, annotationIcon, annotation);
			this.annotationMapping.set(annotation, annotationID);

			annotation.addEventListener("annotation_changed", (e) => {
				let node = tree.getNode(annotationID);
				if (node) {
					node.text = annotation.title;
					if (node.header) {
						let label = node.header.querySelector('.potree-tree-label');
						if (label) label.innerHTML = annotation.title;
					}
				}
			});
		};

		let onCameraAnimationAdded = (e) => {
			const animation = e.animation;
			const animationIcon = `${runtime.resourcePath}/icons/camera_animation.svg`;
			createNode(otherID, "animation", animationIcon, animation);
		};

		let onOrientedImagesAdded = (e) => {
			const images = e.images;
			const imagesIcon = `${runtime.resourcePath}/icons/picture.svg`;
			const node = createNode(imagesID, "images", imagesIcon, images);

			images.addEventListener("visibility_changed", () => {
				if(images.visible){
					tree.checkNode(node);
				}else{
					tree.uncheckNode(node);
				}
			});
		};

		let onImages360Added = (e) => {
			const images = e.images;
			const imagesIcon = `${runtime.resourcePath}/icons/picture.svg`;
			const node = createNode(imagesID, "360° images", imagesIcon, images);

			images.addEventListener("visibility_changed", () => {
				if(images.visible){
					tree.checkNode(node);
				}else{
					tree.uncheckNode(node);
				}
			});
		};

		const onGeopackageAdded = (e) => {
			const geopackage = e.geopackage;
			const geopackageIcon = `${runtime.resourcePath}/icons/triangle.svg`;
			const parentNode = "vectors";

			for(const layer of geopackage.node.children){
				const name = layer.name;

				let shpPointsID = tree.createNode(parentNode, { 
					text: name, 
					icon: geopackageIcon,
					data: layer,
				});
				if (layer.visible) {
					tree.checkNode(shpPointsID);
				} else {
					tree.uncheckNode(shpPointsID);
				}
			}
		};

		this.viewer.scene.addEventListener("pointcloud_added", onPointCloudAdded);
		this.viewer.scene.addEventListener("measurement_added", onMeasurementAdded);
		this.viewer.scene.addEventListener("profile_added", onProfileAdded);
		this.viewer.scene.addEventListener("volume_added", onVolumeAdded);
		this.viewer.scene.addEventListener("camera_animation_added", onCameraAnimationAdded);
		this.viewer.scene.addEventListener("oriented_images_added", onOrientedImagesAdded);
		this.viewer.scene.addEventListener("360_images_added", onImages360Added);
		this.viewer.scene.addEventListener("geopackage_added", onGeopackageAdded);
		this.viewer.scene.addEventListener("polygon_clip_volume_added", onVolumeAdded);
		this.viewer.scene.annotations.addEventListener("annotation_added", onAnnotationAdded);

		let onMeasurementRemoved = (e) => {
			this.removeTreeItem(e.measurement.uuid, 'measurements');
		};

		let onVolumeRemoved = (e) => {
			this.removeTreeItem(e.volume.uuid, 'measurements');
		};

		let onPolygonClipVolumeRemoved = (e) => {
			this.removeTreeItem(e.volume.uuid, 'measurements');
		};

		let onProfileRemoved = (e) => {
			this.removeTreeItem(e.profile.uuid, 'measurements');
		};

		this.viewer.scene.addEventListener("measurement_removed", onMeasurementRemoved);
		this.viewer.scene.addEventListener("volume_removed", onVolumeRemoved);
		this.viewer.scene.addEventListener("polygon_clip_volume_removed", onPolygonClipVolumeRemoved);
		this.viewer.scene.addEventListener("profile_removed", onProfileRemoved);


		{
			let annotationIcon = `${runtime.resourcePath}/icons/annotation.svg`;
			this.annotationMapping = new Map(); 
			this.annotationMapping.set(this.viewer.scene.annotations, annotationsID);
			this.viewer.scene.annotations.traverseDescendants(annotation => {
				let parentID = this.annotationMapping.get(annotation.parent);
				let annotationID = createNode(parentID, annotation.title, annotationIcon, annotation);
				this.annotationMapping.set(annotation, annotationID);
			});
		}

		const scene = this.viewer.scene;
		for(let pointcloud of scene.pointclouds){
			onPointCloudAdded({pointcloud: pointcloud});
		}

		for(let measurement of scene.measurements){
			onMeasurementAdded({measurement: measurement});
		}

		for(let volume of [...scene.volumes, ...scene.polygonClipVolumes]){
			onVolumeAdded({volume: volume});
		}

		for(let animation of scene.cameraAnimations){
			onCameraAnimationAdded({animation: animation});
		}

		for(let images of scene.orientedImages){
			onOrientedImagesAdded({images: images});
		}

		for(let images of scene.images360){
			onImages360Added({images: images});
		}

		for(const geopackage of scene.geopackages){
			onGeopackageAdded({geopackage: geopackage});
		}

		for(let profile of scene.profiles){
			onProfileAdded({profile: profile});
		}

		{
			createNode(otherID, "Camera", null, new THREE.Camera());
		}

		this.viewer.addEventListener("scene_changed", (e) => {
			propertiesPanel.setScene(e.scene);

			e.oldScene.removeEventListener("pointcloud_added", onPointCloudAdded);
			e.oldScene.removeEventListener("measurement_added", onMeasurementAdded);
			e.oldScene.removeEventListener("profile_added", onProfileAdded);
			e.oldScene.removeEventListener("volume_added", onVolumeAdded);
			e.oldScene.removeEventListener("polygon_clip_volume_added", onVolumeAdded);
			e.oldScene.removeEventListener("measurement_removed", onMeasurementRemoved);

			e.scene.addEventListener("pointcloud_added", onPointCloudAdded);
			e.scene.addEventListener("measurement_added", onMeasurementAdded);
			e.scene.addEventListener("profile_added", onProfileAdded);
			e.scene.addEventListener("volume_added", onVolumeAdded);
			e.scene.addEventListener("polygon_clip_volume_added", onVolumeAdded);
			e.scene.addEventListener("measurement_removed", onMeasurementRemoved);
		});

	}

	initClippingTool(){


		this.viewer.addEventListener("cliptask_changed", (event) => {
			console.log("TODO");
		});

		this.viewer.addEventListener("clipmethod_changed", (event) => {
			console.log("TODO");
		});

		{
			let currentClipTask = Object.keys(ClipTask).find(key => ClipTask[key] === this.viewer.clipTask) || 'NONE';
			this.clipTaskToggle = new ToggleGroup({
				container: '#cliptask_options',
				title: 'Clip Task',
				options: [
					{ value: 'NONE', label: 'None' },
					{ value: 'HIGHLIGHT', label: 'Highlight' },
					{ value: 'SHOW_INSIDE', label: 'Inside' },
					{ value: 'SHOW_OUTSIDE', label: 'Outside' }
				],
				value: currentClipTask,
				onChange: (val) => {
					this.viewer.setClipTask(ClipTask[val]);
				}
			});
		}

		{
			let currentClipMethod = Object.keys(ClipMethod).find(key => ClipMethod[key] === this.viewer.clipMethod) || 'INSIDE_ANY';
			this.clipMethodToggle = new ToggleGroup({
				container: '#clipmethod_options',
				title: 'Clip Method',
				options: [
					{ value: 'INSIDE_ANY', label: 'Inside Any' },
					{ value: 'INSIDE_ALL', label: 'Inside All' }
				],
				value: currentClipMethod,
				onChange: (val) => {
					this.viewer.setClipMethod(ClipMethod[val]);
				}
			});
		}

		let clippingToolBar = $("#clipping_tools");

		// CLIP VOLUME
		clippingToolBar.append(this.createToolIcon(
			runtime.resourcePath + '/icons/clip_volume.svg',
			'[title]tt.clip_volume',
			() => {
				let item = this.volumeTool.startInsertion({clip: true}); 
				this.selectTreeItem(item.uuid, 'measurements');
			}
		));

		// CLIP POLYGON
		clippingToolBar.append(this.createToolIcon(
			runtime.resourcePath + "/icons/clip-polygon.svg",
			"[title]tt.clip_polygon",
			() => {
				let item = this.viewer.clippingTool.startInsertion({type: "polygon"});
				this.selectTreeItem(item.uuid, 'measurements');
			}
		));

		{// SCREEN BOX SELECT
			let boxSelectTool = new ScreenBoxSelectTool(this.viewer);

			clippingToolBar.append(this.createToolIcon(
				runtime.resourcePath + "/icons/clip-screen.svg",
				"[title]tt.screen_clip_box",
				() => {
					if(!(this.viewer.scene.getActiveCamera() instanceof THREE.OrthographicCamera)){
						this.viewer.postMessage(`Switch to Orthographic Camera Mode before using the Screen-Box-Select tool.`, 
							{duration: 2000});
						return;
					}
					
					let item = boxSelectTool.startInsertion();
					this.selectTreeItem(item.uuid, 'measurements');
				}
			));
		}


		{ // REMOVE CLIPPING TOOLS
			clippingToolBar.append(this.createToolIcon(
				runtime.resourcePath + "/icons/remove.svg",
				"[title]tt.remove_all_clipping_volumes",
				() => {

					this.viewer.scene.removeAllClipVolumes();
				}
			));
		}

	}

	initFilters(){
		this.initClassificationList();
		this.initReturnFilters();
		this.initGPSTimeFilters();
		this.initPointSourceIDFilters();

	}

	initReturnFilters(){
		let elReturnFilterPanel = $('#return_filter_panel');

		{ // RETURN NUMBER
			let lblReturnNumber = elReturnFilterPanel.find('#lblReturnNumber');

			this.sldReturnNumber = new ModernSlider({
				container: elReturnFilterPanel.find('#sldReturnNumber')[0],
				range: true,
				min: 0, max: 7, step: 1,
				values: [0, 7],
				slide: (event, ui) => {
					this.viewer.setFilterReturnNumberRange(ui.values[0], ui.values[1]);
				}
			});

			let onReturnNumberChanged = (event) => {
				let [from, to] = this.viewer.filterReturnNumberRange;

				if (lblReturnNumber[0]) lblReturnNumber[0].innerHTML = `${from} to ${to}`;
				this.sldReturnNumber.setValues([from, to]);
			};

			this.viewer.addEventListener('filter_return_number_range_changed', onReturnNumberChanged);

			onReturnNumberChanged();
		}

		{ // NUMBER OF RETURNS
			let lblNumberOfReturns = elReturnFilterPanel.find('#lblNumberOfReturns');

			this.sldNumberOfReturns = new ModernSlider({
				container: elReturnFilterPanel.find('#sldNumberOfReturns')[0],
				range: true,
				min: 0, max: 7, step: 1,
				values: [0, 7],
				slide: (event, ui) => {
					this.viewer.setFilterNumberOfReturnsRange(ui.values[0], ui.values[1]);
				}
			});

			let onNumberOfReturnsChanged = (event) => {
				let [from, to] = this.viewer.filterNumberOfReturnsRange;

				if (lblNumberOfReturns[0]) lblNumberOfReturns[0].innerHTML = `${from} to ${to}`;
				this.sldNumberOfReturns.setValues([from, to]);
			};

			this.viewer.addEventListener('filter_number_of_returns_range_changed', onNumberOfReturnsChanged);

			onNumberOfReturnsChanged();
		}
	}

	initGPSTimeFilters(){

		let elGPSTimeFilterPanel = $('#gpstime_filter_panel');

		{
			let slider = new HierarchicalSlider({
				levels: 4,
				slide: (event) => {
					this.viewer.setFilterGPSTimeRange(...event.values);
				},
			});

			let initialized = false;

			let initialize = () => {
				
				let elRangeContainer = $("#gpstime_multilevel_range_container");
				elRangeContainer[0].prepend(slider.element);

				let extent = this.viewer.getGpsTimeExtent();

				slider.setRange(extent);
				slider.setValues(extent);


				initialized = true;
			};

			this.viewer.addEventListener("update", (e) => {
				let extent = this.viewer.getGpsTimeExtent();
				let gpsTimeAvailable = extent[0] !== Infinity;

				if(!initialized && gpsTimeAvailable){
					initialize();
				}

				slider.setRange(extent);
			});
		}


		{
			
			const txtGpsTime = elGPSTimeFilterPanel.find("#txtGpsTime");
			const btnFindGpsTime = elGPSTimeFilterPanel.find("#btnFindGpsTime");

			let targetTime = null;

			txtGpsTime.on("input", (e) => {
				const str = txtGpsTime.val();

				if(!isNaN(str)){
					const value = parseFloat(str);
					targetTime = value;

					txtGpsTime.css("background-color", "")
				}else{
					targetTime = null;

					txtGpsTime.css("background-color", "#ff9999")
				}

			});

			btnFindGpsTime.click( () => {
				
				if(targetTime !== null){
					viewer.moveToGpsTimeVicinity(targetTime);
				}
			});
		}

	}

	initPointSourceIDFilters() {
		let elPointSourceIDFilterPanel = $('#pointsourceid_filter_panel');

		{
			let slider = new HierarchicalSlider({
				levels: 4,
				range: [0, 65535],
				precision: 1,
				slide: (event) => {
					let values = event.values;
					this.viewer.setFilterPointSourceIDRange(values[0], values[1]);
				}
			});

			let initialized = false;

			let initialize = () => {
				elPointSourceIDFilterPanel[0].prepend(slider.element);

				initialized = true;
			};

			this.viewer.addEventListener("update", (e) => {
				let extent = this.viewer.filterPointSourceIDRange;

				if(!initialized){
					initialize();

					slider.setValues(extent);
				}
				
			});
		}

		// let lblPointSourceID = elPointSourceIDFilterPanel.find("#lblPointSourceID");
		// let elPointSourceID = elPointSourceIDFilterPanel.find("#spnPointSourceID");

		// let slider = new ZoomableSlider();
		// elPointSourceID[0].appendChild(slider.element);
		// slider.update();

		// slider.change( () => {
		// 	let range = slider.chosenRange;
		// 	this.viewer.setFilterPointSourceIDRange(range[0], range[1]);
		// });

		// let onPointSourceIDExtentChanged = (event) => {
		// 	let range = this.viewer.filterPointSourceIDExtent;
		// 	slider.setVisibleRange(range);
		// };

		// let onPointSourceIDChanged = (event) => {
		// 	let range = this.viewer.filterPointSourceIDRange;

		// 	let precision = 1;
		// 	let from = `${Utils.addCommas(range[0].toFixed(precision))}`;
		// 	let to = `${Utils.addCommas(range[1].toFixed(precision))}`;
		// 	lblPointSourceID[0].innerHTML = `${from} to ${to}`;

		// 	slider.setRange(range);
		// };

		// this.viewer.addEventListener('filter_point_source_id_range_changed', onPointSourceIDChanged);
		// this.viewer.addEventListener('filter_point_source_id_extent_changed', onPointSourceIDExtentChanged);

	}

	initClassificationList(){
		let elClassificationList = $('#classificationList');

		let addClassificationItem = (code, name) => {
			const classification = this.viewer.classifications[code];
			const inputID = 'chkClassification_' + code;
			const colorPickerID = 'colorPickerClassification_' + code;

			const checked = classification.visible ? "checked" : "";

			let element = $(`
				<li>
					<label style="whitespace: nowrap; display: flex">
						<input id="${inputID}" type="checkbox" ${checked}/>
						<span style="flex-grow: 1">${name}</span>
						<input id="${colorPickerID}" style="zoom: 0.5" />
					</label>
				</li>
			`);

			const elInput = element.find('input');
			const elColorPicker = element.find(`#${colorPickerID}`);

			elInput.click(event => {
				this.viewer.setClassificationVisibility(code, event.target.checked);
			});

			let defaultColor = classification.color.map(c => c *  255).join(", ");
			defaultColor = `rgb(${defaultColor})`;


			new ModernColorPicker({
				container: elColorPicker[0] || elColorPicker,
				color: defaultColor,
				change: color => {
					let rgb = color.toRgb();
					const c = [rgb.r / 255, rgb.g / 255, rgb.b / 255, 1];
					classification.color = c;
				}
			});

			elClassificationList.append(element);
		};

		const addToggleAllButton = () => { // toggle all button
			const element = $(`
				<li>
					<label style="whitespace: nowrap">
						<input id="toggleClassificationFilters" type="checkbox" checked/>
						<span>show/hide all</span>
					</label>
				</li>
			`);

			let elInput = element.find('input');

			elInput.click(event => {
				this.viewer.toggleAllClassificationsVisibility();
			});

			elClassificationList.append(element);
		}

		const addInvertButton = () => { 
			const element = $(`
				<li>
					<input type="button" value="invert" />
				</li>
			`);

			let elInput = element.find('input');

			elInput.click( () => {
				const classifications = this.viewer.classifications;
	
				for(let key of Object.keys(classifications)){
					let value = classifications[key];
					this.viewer.setClassificationVisibility(key, !value.visible);
				}
			});

			elClassificationList.append(element);
		};

		const populate = () => {
			addToggleAllButton();
			for (let classID in this.viewer.classifications) {
				addClassificationItem(classID, this.viewer.classifications[classID].name);
			}
			addInvertButton();
		};

		populate();

		this.viewer.addEventListener("classifications_changed", () => {
			elClassificationList.empty();
			populate();
		});

		this.viewer.addEventListener("classification_visibility_changed", () => {

			{ // set checked state of classification buttons
				for(const classID of Object.keys(this.viewer.classifications)){
					const classValue = this.viewer.classifications[classID];

					let elItem = elClassificationList.find(`#chkClassification_${classID}`);
					elItem.prop("checked", classValue.visible);
				}
			}

			{ // set checked state of toggle button based on state of all other buttons
				let numVisible = 0;
				let numItems = 0;
				for(const key of Object.keys(this.viewer.classifications)){
					if(this.viewer.classifications[key].visible){
						numVisible++;
					}
					numItems++;
				}
				const allVisible = numVisible === numItems;

				let elToggle = elClassificationList.find("#toggleClassificationFilters");
				elToggle.prop("checked", allVisible);
			}
		});
	}

	initAccordion(){
		$('.accordion > h3').each(function(){
			let header = $(this);
			let content = $(this).next();

			//header.addClass('accordion-header ui-widget');
			//content.addClass('accordion-content ui-widget');

			content.hide();

			header.click(() => {
				content.slideToggle();
			});
		});

		let languages = [
			["EN", "en"],
			["FR", "fr"],
			["DE", "de"],
			["JP", "jp"],
			["ES", "es"],
			["SE", "se"],
			["ZH", "zh"],
			["IT", "it"],
			["CA", "ca"]
		];

		let elLanguages = $('#potree_languages');
		for(let i = 0; i < languages.length; i++){
			let [key, value] = languages[i];
			let element = $(`<a>${key}</a>`);
			element.click(() => this.viewer.setLanguage(value));

			if(i === 0){
				element.css("margin-left", "30px");
			}
			
			elLanguages.append(element);

			if(i < languages.length - 1){
				elLanguages.append($(document.createTextNode(' - ')));	
			}
		}


		// to close all, call
		// $(".accordion > div").hide()

		// to open the, for example, tool menu, call:
		// $("#menu_tools").next().show()
	}

	initAppearance(){

		this.sldPointBudget = new ModernSlider({
			container: this.dom.find('#sldPointBudget')[0] || '#sldPointBudget',
			value: this.viewer.getPointBudget(),
			min: 100 * 1000,
			max: 10 * 1000 * 1000,
			step: 1000,
			slide: (event, ui) => { this.viewer.setPointBudget(ui.value); }
		});

		this.sldFOV = new ModernSlider({
			container: this.dom.find('#sldFOV')[0] || '#sldFOV',
			value: this.viewer.getFOV(),
			min: 20,
			max: 100,
			step: 1,
			slide: (event, ui) => { this.viewer.setFOV(ui.value); }
		});

		this.sldEDLRadius = new ModernSlider({
			container: this.dom.find('#sldEDLRadius')[0] || '#sldEDLRadius',
			value: this.viewer.getEDLRadius(),
			min: 1,
			max: 4,
			step: 0.01,
			slide: (event, ui) => { this.viewer.setEDLRadius(ui.value); }
		});

		this.sldEDLStrength = new ModernSlider({
			container: this.dom.find('#sldEDLStrength')[0] || '#sldEDLStrength',
			value: this.viewer.getEDLStrength(),
			min: 0,
			max: 5,
			step: 0.01,
			slide: (event, ui) => { this.viewer.setEDLStrength(ui.value); }
		});

		this.sldEDLOpacity = new ModernSlider({
			container: this.dom.find('#sldEDLOpacity')[0] || '#sldEDLOpacity',
			value: this.viewer.getEDLOpacity(),
			min: 0,
			max: 1,
			step: 0.01,
			slide: (event, ui) => { this.viewer.setEDLOpacity(ui.value); }
		});

		this.viewer.addEventListener('point_budget_changed', (event) => {
			$('#lblPointBudget')[0].innerHTML = Utils.addCommas(this.viewer.getPointBudget());
			this.sldPointBudget.setValue(this.viewer.getPointBudget());
		});

		this.viewer.addEventListener('fov_changed', (event) => {
			$('#lblFOV')[0].innerHTML = parseInt(this.viewer.getFOV());
			this.sldFOV.setValue(this.viewer.getFOV());
		});

		this.viewer.addEventListener('use_edl_changed', (event) => {
			$('#chkEDLEnabled')[0].checked = this.viewer.getEDLEnabled();
		});

		this.viewer.addEventListener('edl_radius_changed', (event) => {
			$('#lblEDLRadius')[0].innerHTML = this.viewer.getEDLRadius().toFixed(1);
			this.sldEDLRadius.setValue(this.viewer.getEDLRadius());
		});

		this.viewer.addEventListener('edl_strength_changed', (event) => {
			$('#lblEDLStrength')[0].innerHTML = this.viewer.getEDLStrength().toFixed(1);
			this.sldEDLStrength.setValue(this.viewer.getEDLStrength());
		});

		this.viewer.addEventListener('background_changed', (event) => {
			if (this.bgToggle) {
				this.bgToggle.setValue(this.viewer.getBackground(), false);
			}
		});

		$('#lblPointBudget')[0].innerHTML = Utils.addCommas(this.viewer.getPointBudget());
		$('#lblFOV')[0].innerHTML = parseInt(this.viewer.getFOV());
		$('#lblEDLRadius')[0].innerHTML = this.viewer.getEDLRadius().toFixed(1);
		$('#lblEDLStrength')[0].innerHTML = this.viewer.getEDLStrength().toFixed(1);
		$('#chkEDLEnabled')[0].checked = this.viewer.getEDLEnabled();
		
		{
			const elBackground = this.dom.find('#background_options')[0] || document.getElementById('background_options');
			this.bgToggle = new ToggleGroup({
				container: elBackground,
				value: this.viewer.getBackground(),
				onChange: (value) => {
					this.viewer.setBackground(value);
				}
			});
		}

		$('#chkEDLEnabled').click( () => {
			this.viewer.setEDLEnabled($('#chkEDLEnabled').prop("checked"));
		});
	}

	initNavigation(){
		let elNavigation = $('#navigation');
		let sldMoveSpeed = $('#sldMoveSpeed');
		let lblMoveSpeed = $('#lblMoveSpeed');

		elNavigation.append(this.createToolIcon(
			runtime.resourcePath + '/icons/earth_controls_1.png',
			'[title]tt.earth_control',
			() => { this.viewer.setControls(this.viewer.earthControls); }
		));

		elNavigation.append(this.createToolIcon(
			runtime.resourcePath + '/icons/fps_controls.svg',
			'[title]tt.flight_control',
			() => {
				this.viewer.setControls(this.viewer.fpControls);
				this.viewer.fpControls.lockElevation = false;
			}
		));

		elNavigation.append(this.createToolIcon(
			runtime.resourcePath + '/icons/helicopter_controls.svg',
			'[title]tt.heli_control',
			() => { 
				this.viewer.setControls(this.viewer.fpControls);
				this.viewer.fpControls.lockElevation = true;
			}
		));

		elNavigation.append(this.createToolIcon(
			runtime.resourcePath + '/icons/orbit_controls.svg',
			'[title]tt.orbit_control',
			() => { this.viewer.setControls(this.viewer.orbitControls); }
		));

		elNavigation.append(this.createToolIcon(
			runtime.resourcePath + '/icons/focus.svg',
			'[title]tt.focus_control',
			() => { this.viewer.fitToScreen(); }
		));

		elNavigation.append(this.createToolIcon(
			runtime.resourcePath + "/icons/navigation_cube.svg",
			"[title]tt.navigation_cube_control",
			() => {this.viewer.toggleNavigationCube()}
		));

		elNavigation.append(this.createToolIcon(
			runtime.resourcePath + "/images/compas.svg",
			"[title]tt.compass",
			() => {
				const visible = !this.viewer.compass.isVisible();
				this.viewer.compass.setVisible(visible);
			}
		));

		elNavigation.append(this.createToolIcon(
			runtime.resourcePath + "/icons/camera_animation.svg",
			"[title]tt.camera_animation",
			() => {
				const animation = CameraAnimation.defaultFromView(this.viewer);

				viewer.scene.addCameraAnimation(animation);
			}
		));


		elNavigation.append("<br>");


		elNavigation.append(this.createToolIcon(
			runtime.resourcePath + "/icons/left.svg",
			"[title]tt.left_view_control",
			() => {this.viewer.setLeftView()}
		));

		elNavigation.append(this.createToolIcon(
			runtime.resourcePath + "/icons/right.svg",
			"[title]tt.right_view_control",
			() => {this.viewer.setRightView()}
		));

		elNavigation.append(this.createToolIcon(
			runtime.resourcePath + "/icons/front.svg",
			"[title]tt.front_view_control",
			() => {this.viewer.setFrontView()}
		));

		elNavigation.append(this.createToolIcon(
			runtime.resourcePath + "/icons/back.svg",
			"[title]tt.back_view_control",
			() => {this.viewer.setBackView()}
		));

		elNavigation.append(this.createToolIcon(
			runtime.resourcePath + "/icons/top.svg",
			"[title]tt.top_view_control",
			() => {this.viewer.setTopView()}
		));

		elNavigation.append(this.createToolIcon(
			runtime.resourcePath + "/icons/bottom.svg",
			"[title]tt.bottom_view_control",
			() => {this.viewer.setBottomView()}
		));





		let elCameraProjection = $(`
			<selectgroup id="camera_projection_options">
				<option id="camera_projection_options_perspective" value="PERSPECTIVE">Perspective</option>
				<option id="camera_projection_options_orthigraphic" value="ORTHOGRAPHIC">Orthographic</option>
			</selectgroup>
		`);
		elNavigation.append(elCameraProjection);
		let cameraMode = Object.keys(CameraMode)
			.filter(key => CameraMode[key] === this.viewer.scene.cameraMode);

		this.camProjectionToggle = new ToggleGroup({
			container: elCameraProjection[0],
			title: "Camera Projection",
			value: cameraMode[0] || 'PERSPECTIVE',
			onChange: (val) => {
				this.viewer.setCameraMode(CameraMode[val]);
			}
		});

		let speedRange = new THREE.Vector2(1, 10 * 1000);

		let toLinearSpeed = (value) => {
			return Math.pow(value, 4) * speedRange.y + speedRange.x;
		};

		let toExpSpeed = (value) => {
			return Math.pow((value - speedRange.x) / speedRange.y, 1 / 4);
		};

		this.sldMoveSpeed = new ModernSlider({
			container: sldMoveSpeed[0] || sldMoveSpeed,
			value: toExpSpeed(this.viewer.getMoveSpeed()),
			min: 0,
			max: 1,
			step: 0.01,
			slide: (event, ui) => { this.viewer.setMoveSpeed(toLinearSpeed(ui.value)); }
		});

		this.viewer.addEventListener('move_speed_changed', (event) => {
			lblMoveSpeed.html(this.viewer.getMoveSpeed().toFixed(1));
			this.sldMoveSpeed.setValue(toExpSpeed(this.viewer.getMoveSpeed()));
		});

		lblMoveSpeed.html(this.viewer.getMoveSpeed().toFixed(1));
	}


	initSettings(){

		{
			this.sldMinNodeSize = new ModernSlider({
				container: $('#sldMinNodeSize')[0] || '#sldMinNodeSize',
				value: this.viewer.getMinNodeSize(),
				min: 0,
				max: 1000,
				step: 0.01,
				slide: (event, ui) => { this.viewer.setMinNodeSize(ui.value); }
			});

			this.viewer.addEventListener('minnodesize_changed', (event) => {
				$('#lblMinNodeSize').html(parseInt(this.viewer.getMinNodeSize()));
				this.sldMinNodeSize.setValue(this.viewer.getMinNodeSize());
			});
			$('#lblMinNodeSize').html(parseInt(this.viewer.getMinNodeSize()));
		}

		{
			let elSplatQuality = $("#splat_quality_options");
			let currentQuality = this.viewer.useHQ ? "hq" : "standard";
			this.splatQualityToggle = new ToggleGroup({
				container: elSplatQuality[0] || elSplatQuality,
				title: "Splat Quality",
				value: currentQuality,
				onChange: (value) => {
					if(value === "standard"){
						this.viewer.useHQ = false;
					}else if(value === "hq"){
						this.viewer.useHQ = true;
					}
				}
			});
		}

		$('#show_bounding_box').click(() => {
			this.viewer.setShowBoundingBox($('#show_bounding_box').prop("checked"));
		});

		$('#set_freeze').click(() => {
			this.viewer.setFreeze($('#set_freeze').prop("checked"));
		});
	}

}

