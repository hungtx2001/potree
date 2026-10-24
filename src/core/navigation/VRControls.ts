import * as THREE from 'three';
import { EventDispatcher } from '../EventDispatcher.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { TextSprite } from '../../TextSprite.js';
import { Utils } from '../../utils.js';
import { runtime } from '../../runtime.js';

const fakeCam = new THREE.PerspectiveCamera();

function toScene(vec: THREE.Vector3, ref: THREE.Object3D): THREE.Vector3 {
	const node = ref.clone();
	node.updateMatrix();
	node.updateMatrixWorld();

	const result = vec.clone().applyMatrix4(node.matrix);
	result.z -= 0.8 * node.scale.x;

	return result;
}

function computeMove(vrControls: VRControls, controller: any): THREE.Vector3 | null {
	if (!controller || !controller.inputSource || !controller.inputSource.gamepad) {
		return null;
	}

	const pad = controller.inputSource.gamepad;
	const axes = pad.axes;
	let y = 0;
	if (axes.length === 2) {
		y = axes[1];
	} else if (axes.length === 4) {
		y = axes[3];
	}

	y = Math.sign(y) * Math.pow(2 * y, 2);

	let maxSize = 0;
	const viewer = vrControls.viewer;
	if (viewer?.scene?.pointclouds) {
		for (const pc of viewer.scene.pointclouds) {
			const size = pc.boundingBox.min.distanceTo(pc.boundingBox.max);
			maxSize = Math.max(maxSize, size);
		}
	}
	const multiplicator = Math.pow(maxSize, 0.5) / 2;

	const scale = vrControls.node.scale.x;
	const moveSpeed = viewer.getMoveSpeed ? viewer.getMoveSpeed() : 10;
	const amount = multiplicator * y * Math.pow(moveSpeed, 0.5) / scale;

	const rotation = new THREE.Quaternion().setFromEuler(controller.rotation);
	const dir = new THREE.Vector3(0, 0, -1);
	dir.applyQuaternion(rotation);

	let move = dir.clone().multiplyScalar(amount);

	const p1 = vrControls.toScene(controller.position);
	const p2 = vrControls.toScene(controller.position.clone().add(move));

	move = p2.clone().sub(p1);

	return move;
}

class FlyMode {
	public moveFactor: number = 1;
	public dbgLabel: any = null;

	start(vrControls: VRControls): void {
		if (!this.dbgLabel) {
			this.dbgLabel = new TextSprite('abc');
			this.dbgLabel.name = 'debug label';
			vrControls.viewer.sceneVR.add(this.dbgLabel);
			this.dbgLabel.visible = false;
		}
	}

	end(_vrControls?: VRControls): void {}

	update(vrControls: VRControls, delta: number): void {
		const primary = vrControls.cPrimary;
		const secondary = vrControls.cSecondary;

		let move1 = computeMove(vrControls, primary);
		let move2 = computeMove(vrControls, secondary);

		if (!move1) {
			move1 = new THREE.Vector3();
		}
		if (!move2) {
			move2 = new THREE.Vector3();
		}

		const move = move1.clone().add(move2);
		move.multiplyScalar(-delta * this.moveFactor);
		vrControls.node.position.add(move);

		const scale = vrControls.node.scale.x;
		const camVR = (vrControls.viewer.renderer as any).xr.getCamera(fakeCam);

		const vrPos = camVR.getWorldPosition(new THREE.Vector3());
		const vrDir = camVR.getWorldDirection(new THREE.Vector3());

		const scenePos = toScene(vrPos, vrControls.node);
		const sceneDir = toScene(vrPos.clone().add(vrDir), vrControls.node).sub(scenePos);
		sceneDir.normalize().multiplyScalar(scale);
		const sceneTarget = scenePos.clone().add(sceneDir);

		vrControls.viewer.scene.view.setView(scenePos, sceneTarget);

		if ((runtime as any)?.debug?.message) {
			this.dbgLabel.visible = true;
			this.dbgLabel.setText((runtime as any).debug.message);
			this.dbgLabel.scale.set(0.1, 0.1, 0.1);
			this.dbgLabel.position.copy(primary.position);
		}
	}
}

class TranslationMode {
	public controller: any = null;
	public startPos: THREE.Vector3 | null = null;
	public debugLine: any = null;

	start(vrControls: VRControls): void {
		this.controller = vrControls.triggered.values().next().value;
		this.startPos = vrControls.node.position.clone();
	}

	end(_vrControls?: VRControls): void {}

	update(vrControls: VRControls, _delta: number): void {
		if (!this.controller || !this.startPos) return;

		let start = this.controller.start.position;
		let end = this.controller.position;

		start = vrControls.toScene(start);
		end = vrControls.toScene(end);

		const diff = end.clone().sub(start);
		diff.set(-diff.x, -diff.y, -diff.z);

		const pos = new THREE.Vector3().addVectors(this.startPos, diff);
		vrControls.node.position.copy(pos);
	}
}

class RotScaleMode {
	public line: any = null;
	public startState: THREE.Object3D | null = null;
	public dbgLabel: any = null;

	start(vrControls: VRControls): void {
		if (!this.line) {
			this.line = Utils.debugLine(
				vrControls.viewer.sceneVR,
				new THREE.Vector3(0, 0, 0),
				new THREE.Vector3(0, 0, 0),
				0xffff00
			);

			this.dbgLabel = new TextSprite('abc');
			this.dbgLabel.scale.set(0.1, 0.1, 0.1);
			vrControls.viewer.sceneVR.add(this.dbgLabel);
		}

		this.line.node.visible = true;
		this.startState = vrControls.node.clone();
	}

	end(_vrControls?: VRControls): void {
		if (this.line?.node) this.line.node.visible = false;
		if (this.dbgLabel) this.dbgLabel.visible = false;
	}

	update(vrControls: VRControls, _delta: number): void {
		if (!this.startState) return;

		const start_c1 = vrControls.cPrimary.start.position.clone();
		const start_c2 = vrControls.cSecondary.start.position.clone();
		const start_center = start_c1.clone().add(start_c2).multiplyScalar(0.5);
		const start_c1_c2 = start_c2.clone().sub(start_c1);
		const end_c1 = vrControls.cPrimary.position.clone();
		const end_c2 = vrControls.cSecondary.position.clone();
		const end_center = end_c1.clone().add(end_c2).multiplyScalar(0.5);
		const end_c1_c2 = end_c2.clone().sub(end_c1);

		const d1 = start_c1_c2.length();
		const d2 = end_c1_c2.length();

		const angleStart = new THREE.Vector2(start_c1_c2.x, start_c1_c2.z).angle();
		const angleEnd = new THREE.Vector2(end_c1_c2.x, end_c1_c2.z).angle();
		const angleDiff = angleEnd - angleStart;

		const scale = d2 / d1;

		const node = this.startState.clone();
		node.updateMatrix();
		node.matrixAutoUpdate = false;

		const originArr = toScene(start_center, this.startState).multiplyScalar(-1).toArray();
		const mToOrigin = new THREE.Matrix4().makeTranslation(originArr[0], originArr[1], originArr[2]);
		const startArr = toScene(start_center, this.startState).toArray();
		const mToStart = new THREE.Matrix4().makeTranslation(startArr[0], startArr[1], startArr[2]);
		const mRotate = new THREE.Matrix4().makeRotationZ(angleDiff);
		const mScale = new THREE.Matrix4().makeScale(1 / scale, 1 / scale, 1 / scale);

		node.applyMatrix4(mToOrigin);
		node.applyMatrix4(mRotate);
		node.applyMatrix4(mScale);
		node.applyMatrix4(mToStart);

		const oldScenePos = toScene(start_center, this.startState);
		const newScenePos = toScene(end_center, node);
		const toNew = oldScenePos.clone().sub(newScenePos);
		const newArr = toNew.toArray();
		const mToNew = new THREE.Matrix4().makeTranslation(newArr[0], newArr[1], newArr[2]);
		node.applyMatrix4(mToNew);

		node.matrix.decompose(node.position, node.quaternion, node.scale);

		vrControls.node.position.copy(node.position);
		vrControls.node.quaternion.copy(node.quaternion);
		vrControls.node.scale.copy(node.scale);
		vrControls.node.updateMatrix();

		{
			const currentScale = vrControls.node.scale.x;
			const camVR = (vrControls.viewer.renderer as any).xr.getCamera(fakeCam);

			const vrPos = camVR.getWorldPosition(new THREE.Vector3());
			const vrDir = camVR.getWorldDirection(new THREE.Vector3());

			const scenePos = toScene(vrPos, this.startState);
			const sceneDir = toScene(vrPos.clone().add(vrDir), this.startState).sub(scenePos);
			sceneDir.normalize().multiplyScalar(currentScale);
			const sceneTarget = scenePos.clone().add(sceneDir);

			vrControls.viewer.scene.view.setView(scenePos, sceneTarget);
			vrControls.viewer.setMoveSpeed(currentScale);
		}

		{
			this.line.set(end_c1, end_c2);

			const currentScale = vrControls.node.scale.x;
			this.dbgLabel.visible = true;
			this.dbgLabel.position.copy(end_center);
			this.dbgLabel.setText(`scale: 1 : ${currentScale.toFixed(2)}`);
			this.dbgLabel.scale.set(0.05, 0.05, 0.05);
		}
	}
}

export class VRControls extends EventDispatcher {
	public viewer: any;
	public node: THREE.Object3D;
	public triggered: Set<any>;
	public menu: any = null;
	public cPrimary: any;
	public cSecondary: any;
	public mode_fly: FlyMode;
	public mode_translate: TranslationMode;
	public mode_rotScale: RotScaleMode;
	public mode: any;
	public scene: any;

	constructor(viewer: any) {
		super();

		this.viewer = viewer;

		viewer.addEventListener('vr_start', this.onStart.bind(this));
		viewer.addEventListener('vr_end', this.onEnd.bind(this));

		this.node = new THREE.Object3D();
		this.node.up.set(0, 0, 1);
		this.triggered = new Set();

		const xr = viewer.renderer.xr;

		{
			const light = new THREE.PointLight(0xffffff, 5, 0, 1);
			light.position.set(0, 2, 0);
			this.viewer.sceneVR.add(light);
		}

		const controllerModelFactory = new XRControllerModelFactory();
		const sg = new THREE.SphereGeometry(1, 32, 32);
		const sm = new THREE.MeshNormalMaterial();

		{
			const controller = xr.getController(0);
			const grip = xr.getControllerGrip(0);
			grip.name = 'grip(0)';

			grip.add(controllerModelFactory.createControllerModel(grip));
			this.viewer.sceneVR.add(grip);

			const sphere = new THREE.Mesh(sg, sm);
			sphere.scale.set(0.005, 0.005, 0.005);

			controller.add(sphere);
			controller.visible = true;
			this.viewer.sceneVR.add(controller);

			{
				const lineGeometry = new LineGeometry();
				lineGeometry.setPositions([0, 0, -0.15, 0, 0, 0.05]);

				const lineMaterial = new LineMaterial({
					color: 0xff0000,
					linewidth: 2,
					resolution: new THREE.Vector2(1000, 1000),
				});

				const line = new Line2(lineGeometry, lineMaterial);
				controller.add(line);
			}

			controller.addEventListener('connected', (event: any) => {
				controller.inputSource = event.data;
			});

			controller.addEventListener('selectstart', () => { this.onTriggerStart(controller); });
			controller.addEventListener('selectend', () => { this.onTriggerEnd(controller); });

			this.cPrimary = controller;
		}

		{
			const controller = xr.getController(1);
			const grip = xr.getControllerGrip(1);

			const model = controllerModelFactory.createControllerModel(grip);
			grip.add(model);
			this.viewer.sceneVR.add(grip);

			const sphere = new THREE.Mesh(sg, sm);
			sphere.scale.set(0.005, 0.005, 0.005);
			controller.add(sphere);
			controller.visible = true;
			this.viewer.sceneVR.add(controller);

			{
				const lineGeometry = new LineGeometry();
				lineGeometry.setPositions([0, 0, -0.15, 0, 0, 0.05]);

				const lineMaterial = new LineMaterial({
					color: 0xff0000,
					linewidth: 2,
					resolution: new THREE.Vector2(1000, 1000),
				});

				const line = new Line2(lineGeometry, lineMaterial);
				controller.add(line);
			}

			controller.addEventListener('connected', (event: any) => {
				controller.inputSource = event.data;
				this.initMenu(controller);
			});

			controller.addEventListener('selectstart', () => { this.onTriggerStart(controller); });
			controller.addEventListener('selectend', () => { this.onTriggerEnd(controller); });

			this.cSecondary = controller;
		}

		this.mode_fly = new FlyMode();
		this.mode_translate = new TranslationMode();
		this.mode_rotScale = new RotScaleMode();
		this.setMode(this.mode_fly);
	}

	public createSlider(label: string, _min: number, _max: number): THREE.Object3D {
		const sg = new THREE.SphereGeometry(1, 8, 8);
		const cg = new THREE.CylinderGeometry(1, 1, 1, 8);
		const matHandle = new THREE.MeshBasicMaterial({ color: 0xff0000 });
		const matScale = new THREE.MeshBasicMaterial({ color: 0xff4444 });
		const matValue = new THREE.MeshNormalMaterial();

		const node = new THREE.Object3D();
		node.name = 'slider';
		const nLabel = new TextSprite(`${label}: 0`);
		const nMax = new THREE.Mesh(sg, matHandle);
		const nMin = new THREE.Mesh(sg, matHandle);
		const nValue = new THREE.Mesh(sg, matValue);
		const nScale = new THREE.Mesh(cg, matScale);

		nLabel.scale.set(0.2, 0.2, 0.2);
		nLabel.position.set(0, 0.35, 0);

		nMax.scale.set(0.02, 0.02, 0.02);
		nMax.position.set(0, 0.25, 0);

		nMin.scale.set(0.02, 0.02, 0.02);
		nMin.position.set(0, -0.25, 0);

		nValue.scale.set(0.02, 0.02, 0.02);
		nValue.position.set(0, 0, 0);

		nScale.scale.set(0.005, 0.5, 0.005);

		node.add(nLabel);
		node.add(nMax);
		node.add(nMin);
		node.add(nValue);
		node.add(nScale);

		return node;
	}

	public createInfo(): THREE.Mesh {
		const texture = new THREE.TextureLoader().load(`${runtime.resourcePath}/images/vr_controller_help.jpg`);
		const plane = new THREE.PlaneGeometry(1, 1, 1, 1);
		const infoMaterial = new THREE.MeshBasicMaterial({ map: texture });
		const infoNode = new THREE.Mesh(plane, infoMaterial);

		return infoNode;
	}

	public initMenu(_controller: any): void {
		if (this.menu) {
			return;
		}

		const node = new THREE.Object3D();
		node.name = 'vr menu';
		this.menu = node;
		(window as any).vrMenu = node;
	}

	public toScene(vec: THREE.Vector3): THREE.Vector3 {
		const camVR = this.getCamera();
		const mat = camVR.matrixWorld;
		return vec.clone().applyMatrix4(mat);
	}

	public toVR(vec: THREE.Vector3): THREE.Vector3 {
		const camVR = this.getCamera();
		const mat = camVR.matrixWorld.clone();
		mat.invert();
		return vec.clone().applyMatrix4(mat);
	}

	public setMode(mode: any): void {
		if (this.mode === mode) {
			return;
		}

		if (this.mode) {
			this.mode.end(this);
		}

		for (const controller of [this.cPrimary, this.cSecondary]) {
			if (!controller) continue;
			controller.start = {
				position: controller.position.clone(),
				rotation: controller.rotation.clone(),
			};
		}

		this.mode = mode;
		this.mode.start(this);
	}

	public onTriggerStart(controller: any): void {
		this.triggered.add(controller);

		if (this.triggered.size === 0) {
			this.setMode(this.mode_fly);
		} else if (this.triggered.size === 1) {
			this.setMode(this.mode_translate);
		} else if (this.triggered.size === 2) {
			this.setMode(this.mode_rotScale);
		}
	}

	public onTriggerEnd(controller: any): void {
		this.triggered.delete(controller);

		if (this.triggered.size === 0) {
			this.setMode(this.mode_fly);
		} else if (this.triggered.size === 1) {
			this.setMode(this.mode_translate);
		} else if (this.triggered.size === 2) {
			this.setMode(this.mode_rotScale);
		}
	}

	public onStart(): void {
		const position = this.viewer.scene.view.position.clone();
		const direction = this.viewer.scene.view.direction;
		direction.multiplyScalar(-1);

		const target = position.clone().add(direction);
		target.z = position.z;

		const scale = this.viewer.getMoveSpeed();

		this.node.position.copy(position);
		this.node.lookAt(target);
		this.node.scale.set(scale, scale, scale);
		this.node.updateMatrix();
		this.node.updateMatrixWorld();
	}

	public onEnd(): void {}

	public setScene(scene: any): void {
		this.scene = scene;
	}

	public getCamera(): THREE.PerspectiveCamera {
		const camera = new THREE.PerspectiveCamera();
		const scale = this.viewer.getMoveSpeed();
		camera.near = 0.1;
		camera.far = 1000;
		camera.up.set(0, 0, 1);
		camera.lookAt(new THREE.Vector3(0, -1, 0));
		camera.updateMatrix();
		camera.updateMatrixWorld();

		camera.position.copy(this.node.position);
		camera.rotation.copy(this.node.rotation);
		camera.scale.set(scale, scale, scale);
		camera.updateMatrix();
		camera.updateMatrixWorld();
		camera.matrixAutoUpdate = false;
		camera.parent = camera;

		return camera;
	}

	public update(delta: number): void {
		this.mode.update(this, delta);
	}
}
