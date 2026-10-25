import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { Utils } from '../utils/Utils.js';
import { runtime } from '../runtime/runtime.js';

export interface TransformHandle {
	name: string;
	node: THREE.Object3D;
	color: number;
	alignment: [number, number, number];
	translateNode?: THREE.Object3D;
}

export class TransformationTool {
	viewer: any;
	scene: THREE.Scene;
	selection: any[];
	pivot: THREE.Vector3;
	dragging: boolean;
	showPickVolumes: boolean;
	activeHandle: TransformHandle | null;
	scaleHandles: Record<string, TransformHandle>;
	focusHandles: Record<string, TransformHandle>;
	translationHandles: Record<string, TransformHandle>;
	rotationHandles: Record<string, TransformHandle>;
	handles: Record<string, TransformHandle>;
	pickVolumes: THREE.Mesh[];
	frame: THREE.LineSegments;

	constructor(viewer: any) {
		this.viewer = viewer;

		this.scene = new THREE.Scene();

		this.selection = [];
		this.pivot = new THREE.Vector3();
		this.dragging = false;
		this.showPickVolumes = false;

		this.viewer.inputHandler?.registerInteractiveScene(this.scene);
		this.viewer.inputHandler?.addEventListener('selection_changed', (e: any) => {
			for (const selected of this.selection) {
				this.viewer.inputHandler.blacklist.delete(selected);
			}

			this.selection = e.selection;

			for (const selected of this.selection) {
				this.viewer.inputHandler.blacklist.add(selected);
			}
		});

		const red = 0xE73100;
		const green = 0x44A24A;
		const blue = 0x2669E7;

		this.activeHandle = null;
		this.scaleHandles = {
			'scale.x+': { name: 'scale.x+', node: new THREE.Object3D(), color: red, alignment: [+1, +0, +0] },
			'scale.x-': { name: 'scale.x-', node: new THREE.Object3D(), color: red, alignment: [-1, +0, +0] },
			'scale.y+': { name: 'scale.y+', node: new THREE.Object3D(), color: green, alignment: [+0, +1, +0] },
			'scale.y-': { name: 'scale.y-', node: new THREE.Object3D(), color: green, alignment: [+0, -1, +0] },
			'scale.z+': { name: 'scale.z+', node: new THREE.Object3D(), color: blue, alignment: [+0, +0, +1] },
			'scale.z-': { name: 'scale.z-', node: new THREE.Object3D(), color: blue, alignment: [+0, +0, -1] },
		};
		this.focusHandles = {
			'focus.x+': { name: 'focus.x+', node: new THREE.Object3D(), color: red, alignment: [+1, +0, +0] },
			'focus.x-': { name: 'focus.x-', node: new THREE.Object3D(), color: red, alignment: [-1, +0, +0] },
			'focus.y+': { name: 'focus.y+', node: new THREE.Object3D(), color: green, alignment: [+0, +1, +0] },
			'focus.y-': { name: 'focus.y-', node: new THREE.Object3D(), color: green, alignment: [+0, -1, +0] },
			'focus.z+': { name: 'focus.z+', node: new THREE.Object3D(), color: blue, alignment: [+0, +0, +1] },
			'focus.z-': { name: 'focus.z-', node: new THREE.Object3D(), color: blue, alignment: [+0, +0, -1] },
		};
		this.translationHandles = {
			'translation.x': { name: 'translation.x', node: new THREE.Object3D(), color: red, alignment: [1, 0, 0] },
			'translation.y': { name: 'translation.y', node: new THREE.Object3D(), color: green, alignment: [0, 1, 0] },
			'translation.z': { name: 'translation.z', node: new THREE.Object3D(), color: blue, alignment: [0, 0, 1] },
		};
		this.rotationHandles = {
			'rotation.x': { name: 'rotation.x', node: new THREE.Object3D(), color: red, alignment: [1, 0, 0] },
			'rotation.y': { name: 'rotation.y', node: new THREE.Object3D(), color: green, alignment: [0, 1, 0] },
			'rotation.z': { name: 'rotation.z', node: new THREE.Object3D(), color: blue, alignment: [0, 0, 1] },
		};
		this.handles = Object.assign({}, this.scaleHandles, this.focusHandles, this.translationHandles, this.rotationHandles);
		this.pickVolumes = [];

		this.initializeScaleHandles();
		this.initializeFocusHandles();
		this.initializeTranslationHandles();
		this.initializeRotationHandles();

		// Modern BufferGeometry wireframe box
		const boxFrameGeometry = new THREE.BufferGeometry();
		const boxVertices = new Float32Array([
			// bottom
			-0.5, -0.5,  0.5,   0.5, -0.5,  0.5,
			 0.5, -0.5,  0.5,   0.5, -0.5, -0.5,
			 0.5, -0.5, -0.5,  -0.5, -0.5, -0.5,
			-0.5, -0.5, -0.5,  -0.5, -0.5,  0.5,
			// top
			-0.5,  0.5,  0.5,   0.5,  0.5,  0.5,
			 0.5,  0.5,  0.5,   0.5,  0.5, -0.5,
			 0.5,  0.5, -0.5,  -0.5,  0.5, -0.5,
			-0.5,  0.5, -0.5,  -0.5,  0.5,  0.5,
			// sides
			-0.5, -0.5,  0.5,  -0.5,  0.5,  0.5,
			 0.5, -0.5,  0.5,   0.5,  0.5,  0.5,
			 0.5, -0.5, -0.5,   0.5,  0.5, -0.5,
			-0.5, -0.5, -0.5,  -0.5,  0.5, -0.5,
		]);
		boxFrameGeometry.setAttribute('position', new THREE.BufferAttribute(boxVertices, 3));

		this.frame = new THREE.LineSegments(boxFrameGeometry, new THREE.LineBasicMaterial({ color: 0xffff00 }));
		this.scene.add(this.frame);
	}

	initializeScaleHandles(): void {
		const sgSphere = new THREE.SphereGeometry(1, 32, 32);
		const sgLowPolySphere = new THREE.SphereGeometry(1, 16, 16);

		for (const handleName of Object.keys(this.scaleHandles)) {
			const handle = this.scaleHandles[handleName];
			const node = handle.node;
			this.scene.add(node);
			node.position.set(...handle.alignment).multiplyScalar(0.5);

			const material = new THREE.MeshBasicMaterial({
				color: handle.color,
				opacity: 0.4,
				transparent: true
			});

			const outlineMaterial = new THREE.MeshBasicMaterial({
				color: 0x000000,
				side: THREE.BackSide,
				opacity: 0.4,
				transparent: true
			});

			const pickMaterial = new THREE.MeshNormalMaterial({
				opacity: 0.2,
				transparent: true,
				visible: this.showPickVolumes
			});

			const sphere = new THREE.Mesh(sgSphere, material);
			sphere.scale.set(1.3, 1.3, 1.3);
			sphere.name = `${handleName}.handle`;
			node.add(sphere);

			const outline = new THREE.Mesh(sgSphere, outlineMaterial);
			outline.scale.set(1.4, 1.4, 1.4);
			outline.name = `${handleName}.outline`;
			sphere.add(outline);

			const pickSphere = new THREE.Mesh(sgLowPolySphere, pickMaterial);
			pickSphere.name = `${handleName}.pick_volume`;
			pickSphere.scale.set(3, 3, 3);
			sphere.add(pickSphere);
			(pickSphere as any).handle = handleName;
			this.pickVolumes.push(pickSphere);

			(node as any).setOpacity = (target: number) => {
				const opacity = { x: material.opacity };
				const t = new TWEEN.Tween(opacity).to({ x: target }, 100);
				t.onUpdate(() => {
					sphere.visible = opacity.x > 0;
					pickSphere.visible = opacity.x > 0;
					material.opacity = opacity.x;
					outlineMaterial.opacity = opacity.x;
					pickMaterial.opacity = opacity.x * 0.5;
				});
				t.start();
			};

			(pickSphere as any).addEventListener('drag', (e: any) => this.dragScaleHandle(e));
			(pickSphere as any).addEventListener('drop', (e: any) => this.dropScaleHandle(e));
			(pickSphere as any).addEventListener('click', (e: any) => {
				e.consume();
			});
		}
	}

	initializeFocusHandles(): void {
		const sgPlane = new THREE.PlaneGeometry(4, 4, 1, 1);
		const sgLowPolySphere = new THREE.SphereGeometry(1, 16, 16);

		const res = runtime.resourcePath || './resources';
		const texture = new THREE.TextureLoader().load(`${res}/icons/eye_2.png`);

		for (const handleName of Object.keys(this.focusHandles)) {
			const handle = this.focusHandles[handleName];
			const node = handle.node;
			this.scene.add(node);
			const align = handle.alignment;

			node.lookAt(new THREE.Vector3(...align));

			const off = 0.8;
			if (align[0] === 1) {
				node.position.set(1, off, -off).multiplyScalar(0.5);
				node.rotation.z = Math.PI / 2;
			} else if (align[0] === -1) {
				node.position.set(-1, -off, -off).multiplyScalar(0.5);
				node.rotation.z = Math.PI / 2;
			} else if (align[1] === 1) {
				node.position.set(-off, 1, -off).multiplyScalar(0.5);
				node.rotation.set(Math.PI / 2, Math.PI, 0.0);
			} else if (align[1] === -1) {
				node.position.set(off, -1, -off).multiplyScalar(0.5);
				node.rotation.set(Math.PI / 2, 0.0, 0.0);
			} else if (align[2] === 1) {
				node.position.set(off, off, 1).multiplyScalar(0.5);
			} else if (align[2] === -1) {
				node.position.set(-off, off, -1).multiplyScalar(0.5);
			}

			const material = new THREE.MeshBasicMaterial({
				color: handle.color,
				opacity: 0,
				transparent: true,
				map: texture
			});

			const pickMaterial = new THREE.MeshNormalMaterial({
				transparent: true,
				visible: this.showPickVolumes
			});

			const box = new THREE.Mesh(sgPlane, material);
			box.name = `${handleName}.handle`;
			box.scale.set(1.5, 1.5, 1.5);
			box.position.set(0, 0, 0);
			box.visible = false;
			node.add(box);

			const pickSphere = new THREE.Mesh(sgLowPolySphere, pickMaterial);
			pickSphere.name = `${handleName}.pick_volume`;
			pickSphere.scale.set(3, 3, 3);
			box.add(pickSphere);
			(pickSphere as any).handle = handleName;
			this.pickVolumes.push(pickSphere);

			(node as any).setOpacity = (target: number) => {
				const opacity = { x: material.opacity };
				const t = new TWEEN.Tween(opacity).to({ x: target }, 100);
				t.onUpdate(() => {
					pickSphere.visible = opacity.x > 0;
					box.visible = opacity.x > 0;
					material.opacity = opacity.x;
					pickMaterial.opacity = opacity.x * 0.5;
				});
				t.start();
			};

			(pickSphere as any).addEventListener('drag', () => {});
			(pickSphere as any).addEventListener('mouseup', (e: any) => {
				e.consume();
			});
			(pickSphere as any).addEventListener('mousedown', (e: any) => {
				e.consume();
			});
			(pickSphere as any).addEventListener('click', (e: any) => {
				e.consume();

				const selected = this.selection[0];
				if (!selected) return;

				const maxScale = Math.max(...selected.scale.toArray());
				const handleLength = Math.abs(selected.scale.dot(new THREE.Vector3(...handle.alignment)));
				const alignment = new THREE.Vector3(...handle.alignment).multiplyScalar(2 * maxScale / handleLength);
				alignment.applyMatrix4(selected.matrixWorld);
				const newCamPos = alignment;
				const newCamTarget = selected.getWorldPosition(new THREE.Vector3());

				Utils.moveTo(this.viewer.scene, newCamPos, newCamTarget);
			});
		}
	}

	initializeTranslationHandles(): void {
		const boxGeometry = new THREE.BoxGeometry(1, 1, 1);

		for (const handleName of Object.keys(this.translationHandles)) {
			const handle = this.handles[handleName];
			const node = handle.node;
			this.scene.add(node);

			const material = new THREE.MeshBasicMaterial({
				color: handle.color,
				opacity: 0.4,
				transparent: true
			});

			const outlineMaterial = new THREE.MeshBasicMaterial({
				color: 0x000000,
				side: THREE.BackSide,
				opacity: 0.4,
				transparent: true
			});

			const pickMaterial = new THREE.MeshNormalMaterial({
				opacity: 0.2,
				transparent: true,
				visible: this.showPickVolumes
			});

			const box = new THREE.Mesh(boxGeometry, material);
			box.name = `${handleName}.handle`;
			box.scale.set(0.2, 0.2, 40);
			box.lookAt(new THREE.Vector3(...handle.alignment));
			box.renderOrder = 10;
			node.add(box);
			handle.translateNode = box;

			const outline = new THREE.Mesh(boxGeometry, outlineMaterial);
			outline.name = `${handleName}.outline`;
			outline.scale.set(3, 3, 1.03);
			outline.renderOrder = 0;
			box.add(outline);

			const pickVolume = new THREE.Mesh(boxGeometry, pickMaterial);
			pickVolume.name = `${handleName}.pick_volume`;
			pickVolume.scale.set(12, 12, 1.1);
			(pickVolume as any).handle = handleName;
			box.add(pickVolume);
			this.pickVolumes.push(pickVolume);

			(node as any).setOpacity = (target: number) => {
				const opacity = { x: material.opacity };
				const t = new TWEEN.Tween(opacity).to({ x: target }, 100);
				t.onUpdate(() => {
					box.visible = opacity.x > 0;
					pickVolume.visible = opacity.x > 0;
					material.opacity = opacity.x;
					outlineMaterial.opacity = opacity.x;
					pickMaterial.opacity = opacity.x * 0.5;
				});
				t.start();
			};

			(pickVolume as any).addEventListener('drag', (e: any) => { this.dragTranslationHandle(e); });
			(pickVolume as any).addEventListener('drop', (e: any) => { this.dropTranslationHandle(e); });
		}
	}

	initializeRotationHandles(): void {
		const adjust = 0.5;
		const torusGeometry = new THREE.TorusGeometry(1, adjust * 0.015, 8, 64, Math.PI / 2);
		const outlineGeometry = new THREE.TorusGeometry(1, adjust * 0.04, 8, 64, Math.PI / 2);
		const pickGeometry = new THREE.TorusGeometry(1, adjust * 0.1, 6, 4, Math.PI / 2);

		for (const handleName of Object.keys(this.rotationHandles)) {
			const handle = this.handles[handleName];
			const node = handle.node;
			this.scene.add(node);

			const material = new THREE.MeshBasicMaterial({
				color: handle.color,
				opacity: 0.4,
				transparent: true
			});

			const outlineMaterial = new THREE.MeshBasicMaterial({
				color: 0x000000,
				side: THREE.BackSide,
				opacity: 0.4,
				transparent: true
			});

			const pickMaterial = new THREE.MeshNormalMaterial({
				opacity: 0.2,
				transparent: true,
				visible: this.showPickVolumes
			});

			const box = new THREE.Mesh(torusGeometry, material);
			box.name = `${handleName}.handle`;
			box.scale.set(20, 20, 20);
			box.lookAt(new THREE.Vector3(...handle.alignment));
			node.add(box);
			handle.translateNode = box;

			const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
			outline.name = `${handleName}.outline`;
			outline.scale.set(1, 1, 1);
			outline.renderOrder = 0;
			box.add(outline);

			const pickVolume = new THREE.Mesh(pickGeometry, pickMaterial);
			pickVolume.name = `${handleName}.pick_volume`;
			pickVolume.scale.set(1, 1, 1);
			(pickVolume as any).handle = handleName;
			box.add(pickVolume);
			this.pickVolumes.push(pickVolume);

			(node as any).setOpacity = (target: number) => {
				const opacity = { x: material.opacity };
				const t = new TWEEN.Tween(opacity).to({ x: target }, 100);
				t.onUpdate(() => {
					box.visible = opacity.x > 0;
					pickVolume.visible = opacity.x > 0;
					material.opacity = opacity.x;
					outlineMaterial.opacity = opacity.x;
					pickMaterial.opacity = opacity.x * 0.5;
				});
				t.start();
			};

			(pickVolume as any).addEventListener('drag', (e: any) => { this.dragRotationHandle(e); });
			(pickVolume as any).addEventListener('drop', (e: any) => { this.dropRotationHandle(e); });
		}
	}

	dragRotationHandle(e: any): void {
		const drag = e.drag;
		let handle = this.activeHandle;
		const camera = this.viewer.scene.getActiveCamera();

		if (!handle) {
			return;
		}

		const localNormal = new THREE.Vector3(...handle.alignment);
		const n = new THREE.Vector3();
		const v4 = new THREE.Vector4(localNormal.x, localNormal.y, localNormal.z, 0).applyMatrix4(handle.node.matrixWorld);
		n.set(v4.x, v4.y, v4.z).normalize();

		if (!drag.intersectionStart) {
			drag.intersectionStart = drag.location;
			drag.objectStart = drag.object.getWorldPosition(new THREE.Vector3());
			drag.handle = handle;

			const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n, drag.intersectionStart);
			drag.dragPlane = plane;
			drag.pivot = drag.intersectionStart;
		} else {
			handle = drag.handle;
		}

		if (!handle) return;

		this.dragging = true;

		const mouse = drag.end;
		const domElement = this.viewer.renderer.domElement;
		const ray = Utils.mouseToRay(mouse, camera, domElement.clientWidth, domElement.clientHeight);

		const I = ray.intersectPlane(drag.dragPlane, new THREE.Vector3());

		if (I) {
			const center = this.scene.getWorldPosition(new THREE.Vector3());
			const from = drag.pivot;
			const to = I;

			const v1 = from.clone().sub(center).normalize();
			const v2 = to.clone().sub(center).normalize();

			let angle = Math.acos(Math.max(-1, Math.min(1, v1.dot(v2))));
			const sign = Math.sign(v1.cross(v2).dot(n));
			angle = angle * sign;
			if (Number.isNaN(angle)) {
				return;
			}

			const normal = new THREE.Vector3(...handle.alignment);
			for (const selection of this.selection) {
				selection.rotateOnAxis(normal, angle);
				selection.dispatchEvent({
					type: 'orientation_changed',
					object: selection
				});
			}

			drag.pivot = I;
		}
	}

	dropRotationHandle(_e: any): void {
		this.dragging = false;
		this.setActiveHandle(null);
	}

	dragTranslationHandle(e: any): void {
		const drag = e.drag;
		let handle = this.activeHandle;
		const camera = this.viewer.scene.getActiveCamera();

		if (!drag.intersectionStart && handle) {
			drag.intersectionStart = drag.location;
			drag.objectStart = drag.object.getWorldPosition(new THREE.Vector3());

			const start = drag.intersectionStart;
			const v4 = new THREE.Vector4(...handle.alignment, 0).applyMatrix4(this.scene.matrixWorld);
			const dir = new THREE.Vector3(v4.x, v4.y, v4.z);
			const end = new THREE.Vector3().addVectors(start, dir);
			const line = new THREE.Line3(start.clone(), end.clone());
			drag.line = line;

			const camOnLine = line.closestPointToPoint(camera.position, false, new THREE.Vector3());
			const normal = new THREE.Vector3().subVectors(camera.position, camOnLine);
			const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, drag.intersectionStart);
			drag.dragPlane = plane;
			drag.pivot = drag.intersectionStart;
		} else {
			handle = drag.handle;
		}

		if (!handle) return;

		this.dragging = true;

		const mouse = drag.end;
		const domElement = this.viewer.renderer.domElement;
		const ray = Utils.mouseToRay(mouse, camera, domElement.clientWidth, domElement.clientHeight);
		const I = ray.intersectPlane(drag.dragPlane, new THREE.Vector3());

		if (I) {
			const iOnLine = drag.line.closestPointToPoint(I, false, new THREE.Vector3());
			const diff = new THREE.Vector3().subVectors(iOnLine, drag.pivot);

			for (const selection of this.selection) {
				selection.position.add(diff);
				selection.dispatchEvent({
					type: 'position_changed',
					object: selection
				});
			}

			drag.pivot = drag.pivot.add(diff);
		}
	}

	dropTranslationHandle(_e: any): void {
		this.dragging = false;
		this.setActiveHandle(null);
	}

	dropScaleHandle(_e: any): void {
		this.dragging = false;
		this.setActiveHandle(null);
	}

	dragScaleHandle(e: any): void {
		const drag = e.drag;
		let handle = this.activeHandle;
		const camera = this.viewer.scene.getActiveCamera();

		if (!drag.intersectionStart) {
			drag.intersectionStart = drag.location;
			drag.objectStart = drag.object.getWorldPosition(new THREE.Vector3());
			drag.handle = handle;

			if (!handle) return;

			const start = drag.intersectionStart;
			const v4 = new THREE.Vector4(...handle.alignment, 0).applyMatrix4(this.scene.matrixWorld);
			const dir = new THREE.Vector3(v4.x, v4.y, v4.z);
			const end = new THREE.Vector3().addVectors(start, dir);
			const line = new THREE.Line3(start.clone(), end.clone());
			drag.line = line;

			const camOnLine = line.closestPointToPoint(camera.position, false, new THREE.Vector3());
			const normal = new THREE.Vector3().subVectors(camera.position, camOnLine);
			const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, drag.intersectionStart);
			drag.dragPlane = plane;
			drag.pivot = drag.intersectionStart;
		} else {
			handle = drag.handle;
		}

		if (!handle) return;

		this.dragging = true;

		const mouse = drag.end;
		const domElement = this.viewer.renderer.domElement;
		const ray = Utils.mouseToRay(mouse, camera, domElement.clientWidth, domElement.clientHeight);
		const I = ray.intersectPlane(drag.dragPlane, new THREE.Vector3());

		if (I) {
			const iOnLine = drag.line.closestPointToPoint(I, false, new THREE.Vector3());
			const direction = handle.alignment.reduce((a: number, v: number) => a + v, 0);

			const toObjectSpace = this.selection[0].matrixWorld.clone().invert();
			const iOnLineOS = iOnLine.clone().applyMatrix4(toObjectSpace);
			const pivotOS = drag.pivot.clone().applyMatrix4(toObjectSpace);
			const diffOS = new THREE.Vector3().subVectors(iOnLineOS, pivotOS);
			const dragDirectionOS = diffOS.clone().normalize();
			if (iOnLine.distanceTo(drag.pivot) === 0) {
				dragDirectionOS.set(0, 0, 0);
			}
			const dragDirection = dragDirectionOS.dot(new THREE.Vector3(...handle.alignment));

			const diff = new THREE.Vector3().subVectors(iOnLine, drag.pivot);
			const diffScale = new THREE.Vector3(...handle.alignment).multiplyScalar(diff.length() * direction * dragDirection);
			const diffPosition = diff.clone().multiplyScalar(0.5);

			for (const selection of this.selection) {
				selection.scale.add(diffScale);
				selection.scale.x = Math.max(0.1, selection.scale.x);
				selection.scale.y = Math.max(0.1, selection.scale.y);
				selection.scale.z = Math.max(0.1, selection.scale.z);
				selection.position.add(diffPosition);
				selection.dispatchEvent({
					type: 'position_changed',
					object: selection
				});
				selection.dispatchEvent({
					type: 'scale_changed',
					object: selection
				});
			}

			drag.pivot.copy(iOnLine);
		}
	}

	setActiveHandle(handle: TransformHandle | null): void {
		if (this.dragging) {
			return;
		}

		if (this.activeHandle === handle) {
			return;
		}

		this.activeHandle = handle;

		if (handle === null) {
			for (const handleName of Object.keys(this.handles)) {
				const h = this.handles[handleName];
				(h.node as any).setOpacity(0);
			}
		}

		for (const handleName of Object.keys(this.focusHandles)) {
			const h = this.focusHandles[handleName];
			if (this.activeHandle === h) {
				(h.node as any).setOpacity(1.0);
			} else {
				(h.node as any).setOpacity(0.4);
			}
		}

		for (const handleName of Object.keys(this.translationHandles)) {
			const h = this.translationHandles[handleName];
			if (this.activeHandle === h) {
				(h.node as any).setOpacity(1.0);
			} else {
				(h.node as any).setOpacity(0.4);
			}
		}

		for (const handleName of Object.keys(this.rotationHandles)) {
			const h = this.rotationHandles[handleName];
			(h.node as any).setOpacity(0.4);
		}

		for (const handleName of Object.keys(this.scaleHandles)) {
			const h = this.scaleHandles[handleName];
			if (this.activeHandle === h) {
				(h.node as any).setOpacity(1.0);

				const relatedFocusHandle = this.focusHandles[h.name.replace('scale', 'focus')];
				if (relatedFocusHandle) {
					(relatedFocusHandle.node as any).setOpacity(0.4);
				}

				for (const translationHandleName of Object.keys(this.translationHandles)) {
					const translationHandle = this.translationHandles[translationHandleName];
					(translationHandle.node as any).setOpacity(0.4);
				}
			} else {
				(h.node as any).setOpacity(0.4);
			}
		}

		if (handle) {
			(handle.node as any).setOpacity(1.0);
		}
	}

	update(): void {
		if (this.selection.length === 1) {
			this.scene.visible = true;

			this.scene.updateMatrix();
			this.scene.updateMatrixWorld();

			const selected = this.selection[0];
			const camera = this.viewer.scene.getActiveCamera();
			const domElement = this.viewer.renderer.domElement;
			const mouse = this.viewer.inputHandler?.mouse || new THREE.Vector2();

			const center = selected.boundingBox.getCenter(new THREE.Vector3()).clone().applyMatrix4(selected.matrixWorld);

			this.scene.scale.copy(selected.boundingBox.getSize(new THREE.Vector3()).multiply(selected.scale));
			this.scene.position.copy(center);
			this.scene.rotation.copy(selected.rotation);

			this.scene.updateMatrixWorld();

			// adjust scale of components
			for (const handleName of Object.keys(this.handles)) {
				const handle = this.handles[handleName];
				const node = handle.node;

				const handlePos = node.getWorldPosition(new THREE.Vector3());
				const distance = handlePos.distanceTo(camera.position);
				const pr = Utils.projectedRadius(1, camera, distance, domElement.clientWidth, domElement.clientHeight);

				const ws = node.parent?.getWorldScale(new THREE.Vector3()) || new THREE.Vector3(1, 1, 1);

				const s = (7 / pr);
				const scale = new THREE.Vector3(s, s, s).divide(ws);

				const rot = new THREE.Matrix4().makeRotationFromEuler(node.rotation);
				const rotInv = rot.clone().invert();

				scale.applyMatrix4(rotInv);
				scale.x = Math.abs(scale.x);
				scale.y = Math.abs(scale.y);
				scale.z = Math.abs(scale.z);

				node.scale.copy(scale);
			}

			// adjust rotation handles
			if (!this.dragging) {
				const tWorld = this.scene.matrixWorld;
				const tObject = tWorld.clone().invert();
				const camObjectPos = camera.getWorldPosition(new THREE.Vector3()).applyMatrix4(tObject);

				const x = this.rotationHandles['rotation.x'].node.rotation;
				const y = this.rotationHandles['rotation.y'].node.rotation;
				const z = this.rotationHandles['rotation.z'].node.rotation;

				(x as any).order = 'ZYX';
				(y as any).order = 'ZYX';

				const above = camObjectPos.z > 0;
				const below = !above;
				const PI_HALF = Math.PI / 2;

				if (above) {
					if (camObjectPos.x > 0 && camObjectPos.y > 0) {
						x.x = 1 * PI_HALF;
						y.y = 3 * PI_HALF;
						z.z = 0 * PI_HALF;
					} else if (camObjectPos.x < 0 && camObjectPos.y > 0) {
						x.x = 1 * PI_HALF;
						y.y = 2 * PI_HALF;
						z.z = 1 * PI_HALF;
					} else if (camObjectPos.x < 0 && camObjectPos.y < 0) {
						x.x = 2 * PI_HALF;
						y.y = 2 * PI_HALF;
						z.z = 2 * PI_HALF;
					} else if (camObjectPos.x > 0 && camObjectPos.y < 0) {
						x.x = 2 * PI_HALF;
						y.y = 3 * PI_HALF;
						z.z = 3 * PI_HALF;
					}
				} else if (below) {
					if (camObjectPos.x > 0 && camObjectPos.y > 0) {
						x.x = 0 * PI_HALF;
						y.y = 0 * PI_HALF;
						z.z = 0 * PI_HALF;
					} else if (camObjectPos.x < 0 && camObjectPos.y > 0) {
						x.x = 0 * PI_HALF;
						y.y = 1 * PI_HALF;
						z.z = 1 * PI_HALF;
					} else if (camObjectPos.x < 0 && camObjectPos.y < 0) {
						x.x = 3 * PI_HALF;
						y.y = 1 * PI_HALF;
						z.z = 2 * PI_HALF;
					} else if (camObjectPos.x > 0 && camObjectPos.y < 0) {
						x.x = 3 * PI_HALF;
						y.y = 0 * PI_HALF;
						z.z = 3 * PI_HALF;
					}
				}
			}

			const ray = Utils.mouseToRay(mouse, camera, domElement.clientWidth, domElement.clientHeight);
			const raycaster = new THREE.Raycaster(ray.origin, ray.direction);
			const intersects = raycaster.intersectObjects(this.pickVolumes.filter(v => v.visible), true);

			if (intersects.length > 0) {
				const I = intersects[0];
				const handleName = (I.object as any).handle;
				this.setActiveHandle(this.handles[handleName]);
			} else {
				this.setActiveHandle(null);
			}
		} else {
			this.scene.visible = false;
		}
	}
}
