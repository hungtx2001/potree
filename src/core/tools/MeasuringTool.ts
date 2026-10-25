import * as THREE from 'three';
import { Measure } from './Measure.js';
import { Utils } from '../utils/Utils.js';
import { CameraMode } from '../types.js';
import { EventDispatcher } from '../EventDispatcher.js';
import { runtime } from '../runtime/runtime.js';

function updateAzimuth(viewer: any, measure: Measure): void {
	const azimuth = measure.azimuth;
	const isOkay = measure.points.length === 2;

	azimuth.node.visible = isOkay && measure.showAzimuth;
	if (!azimuth.node.visible) {
		return;
	}

	const camera = viewer.scene.getActiveCamera();
	const renderAreaSize = viewer.renderer.getSize(new THREE.Vector2());
	const width = renderAreaSize.width;
	const height = renderAreaSize.height;

	const [p0, p1] = measure.points;
	const r = p0.position.distanceTo(p1.position);
	const northVec = Utils.getNorthVec(p0.position, r, viewer.getProjection ? viewer.getProjection() : undefined);
	const northPos = p0.position.clone().add(northVec);

	azimuth.center.position.copy(p0.position);
	azimuth.center.scale.set(2, 2, 2);
	azimuth.center.visible = false;

	{ // north
		azimuth.north.position.copy(northPos);
		azimuth.north.scale.set(2, 2, 2);

		const distance = azimuth.north.position.distanceTo(camera.position);
		const pr = Utils.projectedRadius(1, camera, distance, width, height);
		const scale = (5 / pr);
		azimuth.north.scale.set(scale, scale, scale);
	}

	{ // target
		azimuth.target.position.copy(p1.position);
		azimuth.target.position.z = azimuth.north.position.z;

		const distance = azimuth.target.position.distanceTo(camera.position);
		const pr = Utils.projectedRadius(1, camera, distance, width, height);
		const scale = (5 / pr);
		azimuth.target.scale.set(scale, scale, scale);
	}

	azimuth.circle.position.copy(p0.position);
	azimuth.circle.scale.set(r, r, r);
	azimuth.circle.material.resolution.set(width, height);

	// to target
	azimuth.centerToTarget.geometry.setPositions([
		0, 0, 0,
		...p1.position.clone().sub(p0.position).toArray(),
	]);
	azimuth.centerToTarget.position.copy(p0.position);
	azimuth.centerToTarget.geometry.computeBoundingSphere();
	azimuth.centerToTarget.computeLineDistances();
	azimuth.centerToTarget.material.resolution.set(width, height);

	// to target ground
	azimuth.centerToTargetground.geometry.setPositions([
		0, 0, 0,
		p1.position.x - p0.position.x,
		p1.position.y - p0.position.y,
		0,
	]);
	azimuth.centerToTargetground.position.copy(p0.position);
	azimuth.centerToTargetground.geometry.computeBoundingSphere();
	azimuth.centerToTargetground.computeLineDistances();
	azimuth.centerToTargetground.material.resolution.set(width, height);

	// to north
	azimuth.centerToNorth.geometry.setPositions([
		0, 0, 0,
		northPos.x - p0.position.x,
		northPos.y - p0.position.y,
		0,
	]);
	azimuth.centerToNorth.position.copy(p0.position);
	azimuth.centerToNorth.geometry.computeBoundingSphere();
	azimuth.centerToNorth.computeLineDistances();
	azimuth.centerToNorth.material.resolution.set(width, height);

	// label
	const radians = Utils.computeAzimuth(p0.position, p1.position, viewer.getProjection ? viewer.getProjection() : undefined);
	let degrees = THREE.MathUtils.radToDeg(radians);
	if (degrees < 0) {
		degrees = 360 + degrees;
	}
	const txtDegrees = `${degrees.toFixed(2)}\u00B0`;
	const labelDir = northPos.clone().add(p1.position).multiplyScalar(0.5).sub(p0.position);
	if (labelDir.length() > 0) {
		labelDir.z = 0;
		labelDir.normalize();
		const labelVec = labelDir.clone().multiplyScalar(r);
		const labelPos = p0.position.clone().add(labelVec);
		azimuth.label.position.copy(labelPos);
	}
	azimuth.label.setText(txtDegrees);
	const distance = azimuth.label.position.distanceTo(camera.position);
	const pr = Utils.projectedRadius(1, camera, distance, width, height);
	const scale = (70 / pr);
	azimuth.label.scale.set(scale, scale, scale);
}

export class MeasuringTool extends EventDispatcher {
	public viewer: any;
	public renderer: any;
	public showLabels: boolean = true;
	public scene: THREE.Scene;
	public light: THREE.PointLight;
	public onRemove: (e: any) => void;
	public onAdd: (e: any) => void;

	constructor(viewer: any) {
		super();

		this.viewer = viewer;
		this.renderer = viewer.renderer;

		this.addEventListener('start_inserting_measurement', () => {
			this.viewer.dispatchEvent({
				type: 'cancel_insertions'
			});
		});

		this.showLabels = true;
		this.scene = new THREE.Scene();
		this.scene.name = 'scene_measurement';
		this.light = new THREE.PointLight(0xffffff, 1.0);
		this.scene.add(this.light);

		this.viewer.inputHandler.registerInteractiveScene(this.scene);

		this.onRemove = (e: any) => { this.scene.remove(e.measurement); };
		this.onAdd = (e: any) => { this.scene.add(e.measurement); };

		for (const measurement of viewer.scene.measurements) {
			this.onAdd({ measurement });
		}

		viewer.addEventListener('update', this.update.bind(this));
		viewer.addEventListener('render.pass.perspective_overlay', this.render.bind(this));
		viewer.addEventListener('scene_changed', this.onSceneChange.bind(this));

		viewer.scene.addEventListener('measurement_added', this.onAdd);
		viewer.scene.addEventListener('measurement_removed', this.onRemove);
	}

	onSceneChange(e: any): void {
		if (e.oldScene) {
			e.oldScene.removeEventListener('measurement_added', this.onAdd);
			e.oldScene.removeEventListener('measurement_removed', this.onRemove);
		}

		e.scene.addEventListener('measurement_added', this.onAdd);
		e.scene.addEventListener('measurement_removed', this.onRemove);
	}

	startInsertion(args: any = {}): Measure {
		const domElement = this.viewer.renderer.domElement;
		const measure = new Measure();

		this.dispatchEvent({
			type: 'start_inserting_measurement',
			measure: measure
		});

		const pick = (defaul: any, alternative: any) => {
			return defaul != null ? defaul : alternative;
		};

		measure.showDistances = (args.showDistances === null) ? true : args.showDistances;
		measure.showArea = pick(args.showArea, false);
		measure.showAngles = pick(args.showAngles, false);
		measure.showCoordinates = pick(args.showCoordinates, false);
		measure.showHeight = pick(args.showHeight, false);
		measure.showCircle = pick(args.showCircle, false);
		measure.showAzimuth = pick(args.showAzimuth, false);
		measure.showEdges = pick(args.showEdges, true);
		measure.closed = pick(args.closed, false);
		measure.maxMarkers = pick(args.maxMarkers, Infinity);
		measure.name = args.name || 'Measurement';

		this.scene.add(measure);

		const cancel: { removeLastMarker: boolean; callback: any } = {
			removeLastMarker: measure.maxMarkers > 3,
			callback: null
		};

		const insertionCallback = (e: MouseEvent) => {
			if (e.button === 0) {
				measure.addMarker(measure.points[measure.points.length - 1].position.clone());

				if (measure.points.length >= measure.maxMarkers) {
					cancel.callback();
				}

				this.viewer.inputHandler.startDragging(
					measure.spheres[measure.spheres.length - 1]
				);
			} else if (e.button === 2) {
				cancel.callback();
			}
		};

		cancel.callback = () => {
			if (cancel.removeLastMarker) {
				measure.removeMarker(measure.points.length - 1);
			}
			domElement.removeEventListener('mouseup', insertionCallback, false);
			this.viewer.removeEventListener('cancel_insertions', cancel.callback);
		};

		if (measure.maxMarkers > 1) {
			this.viewer.addEventListener('cancel_insertions', cancel.callback);
			domElement.addEventListener('mouseup', insertionCallback, false);
		}

		measure.addMarker(new THREE.Vector3(0, 0, 0));
		this.viewer.inputHandler.startDragging(
			measure.spheres[measure.spheres.length - 1]
		);

		this.viewer.scene.addMeasurement(measure);

		return measure;
	}

	update(): void {
		const camera = this.viewer.scene.getActiveCamera();
		const measurements = this.viewer.scene.measurements;
		const renderAreaSize = this.renderer.getSize(new THREE.Vector2());
		const clientWidth = renderAreaSize.width;
		const clientHeight = renderAreaSize.height;

		this.light.position.copy(camera.position);

		for (const measure of measurements) {
			measure.lengthUnit = this.viewer.lengthUnit;
			measure.lengthUnitDisplay = this.viewer.lengthUnitDisplay;
			measure.update();

			updateAzimuth(this.viewer, measure);

			for (const sphere of measure.spheres) {
				const distance = camera.position.distanceTo(sphere.getWorldPosition(new THREE.Vector3()));
				const pr = Utils.projectedRadius(1, camera, distance, clientWidth, clientHeight);
				const scale = (15 / pr);
				sphere.scale.set(scale, scale, scale);
			}

			const labels = measure.edgeLabels.concat(measure.angleLabels);
			for (const label of labels) {
				const distance = camera.position.distanceTo(label.getWorldPosition(new THREE.Vector3()));
				const pr = Utils.projectedRadius(1, camera, distance, clientWidth, clientHeight);
				let scale = (70 / pr);

				if (runtime.debug?.scale) {
					scale = (runtime.debug.scale / pr);
				}

				label.scale.set(scale, scale, scale);
			}

			for (let j = 0; j < measure.coordinateLabels.length; j++) {
				const label = measure.coordinateLabels[j];
				const sphere = measure.spheres[j];

				const distance = camera.position.distanceTo(sphere.getWorldPosition(new THREE.Vector3()));
				const screenPos = sphere.getWorldPosition(new THREE.Vector3()).clone().project(camera);
				screenPos.x = Math.round((screenPos.x + 1) * clientWidth / 2);
				screenPos.y = Math.round((-screenPos.y + 1) * clientHeight / 2);
				screenPos.z = 0;
				screenPos.y -= 30;

				let labelPos = new THREE.Vector3(
					(screenPos.x / clientWidth) * 2 - 1,
					-(screenPos.y / clientHeight) * 2 + 1,
					0.5
				);
				labelPos.unproject(camera);
				if (this.viewer.scene.cameraMode === CameraMode.PERSPECTIVE) {
					const direction = labelPos.sub(camera.position).normalize();
					labelPos = new THREE.Vector3().addVectors(camera.position, direction.multiplyScalar(distance));
				}
				label.position.copy(labelPos);
				const pr = Utils.projectedRadius(1, camera, distance, clientWidth, clientHeight);
				const scale = (70 / pr);
				label.scale.set(scale, scale, scale);
			}

			if (measure.showHeight) {
				const label = measure.heightLabel;
				const distance = label.position.distanceTo(camera.position);
				const pr = Utils.projectedRadius(1, camera, distance, clientWidth, clientHeight);
				const scale = (70 / pr);
				label.scale.set(scale, scale, scale);

				const edge = measure.heightEdge;
				const sorted = measure.points.slice().sort((a, b) => a.position.z - b.position.z);
				const lowPoint = sorted[0].position.clone();
				const highPoint = sorted[sorted.length - 1].position.clone();
				const min = lowPoint.z;
				const max = highPoint.z;

				const start = new THREE.Vector3(highPoint.x, highPoint.y, min);
				const end = new THREE.Vector3(highPoint.x, highPoint.y, max);

				const lowScreen = lowPoint.clone().project(camera);
				const startScreen = start.clone().project(camera);
				const endScreen = end.clone().project(camera);

				const toPixelCoordinates = (v: THREE.Vector3) => {
					const r = v.clone().addScalar(1).divideScalar(2);
					r.x = r.x * clientWidth;
					r.y = r.y * clientHeight;
					r.z = 0;
					return r;
				};

				const lowEL = toPixelCoordinates(lowScreen);
				const startEL = toPixelCoordinates(startScreen);
				const endEL = toPixelCoordinates(endScreen);

				const lToS = lowEL.distanceTo(startEL);
				const sToE = startEL.distanceTo(endEL);

				(edge.geometry as any).lineDistances = [0, lToS, lToS, lToS + sToE];
				(edge.geometry as any).lineDistancesNeedUpdate = true;
				edge.material.dashSize = 10;
				edge.material.gapSize = 10;
			}

			{
				const label = measure.areaLabel;
				const distance = label.position.distanceTo(camera.position);
				const pr = Utils.projectedRadius(1, camera, distance, clientWidth, clientHeight);
				const scale = (70 / pr);
				label.scale.set(scale, scale, scale);
			}

			{
				const label = measure.circleRadiusLabel;
				const distance = label.position.distanceTo(camera.position);
				const pr = Utils.projectedRadius(1, camera, distance, clientWidth, clientHeight);
				const scale = (70 / pr);
				label.scale.set(scale, scale, scale);
			}

			{
				const materials = [
					measure.circleRadiusLine.material,
					...measure.edges.map((e) => e.material),
					measure.heightEdge.material,
					measure.circleLine.material,
				];
				for (const material of materials) {
					material.resolution.set(clientWidth, clientHeight);
				}
			}

			if (!this.showLabels) {
				const labels = [
					...measure.sphereLabels,
					...measure.edgeLabels,
					...measure.angleLabels,
					...measure.coordinateLabels,
					measure.heightLabel,
					measure.areaLabel,
					measure.circleRadiusLabel,
				];
				for (const label of labels) {
					label.visible = false;
				}
			}
		}
	}

	render(): void {
		this.viewer.renderer.render(this.scene, this.viewer.scene.getActiveCamera());
	}
}
