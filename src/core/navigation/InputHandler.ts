import * as THREE from 'three';
import { KeyCodes } from '../types.js';
import { Utils } from '../utils/Utils.js';
import { EventDispatcher } from '../EventDispatcher.js';

export class InputHandler extends EventDispatcher {
	public viewer: any;
	public renderer: THREE.WebGLRenderer;
	public domElement: HTMLElement;
	public enabled: boolean = true;

	public scene: any = null;
	public interactiveScenes: any[] = [];
	public interactiveObjects: Set<any> = new Set();
	public inputListeners: any[] = [];
	public blacklist: Set<any> = new Set();
	public cesiumControls: any = null;

	public drag: any = null;
	public mouse: THREE.Vector2 = new THREE.Vector2(0, 0);

	public selection: any[] = [];
	public hoveredElements: any[] = [];
	public hoveredElement: any = null;
	public pressedKeys: Record<number, boolean> = {};

	public wheelDelta: number = 0;
	public speed: number = 1;
	public logMessages: boolean = false;
	public viewStart: any = null;

	constructor(viewer: any) {
		super();

		this.viewer = viewer;
		this.renderer = viewer.renderer;
		this.domElement = this.renderer.domElement;

		if (this.domElement.tabIndex === -1) {
			this.domElement.tabIndex = 2222;
		}

		this.domElement.addEventListener('contextmenu', (event: MouseEvent) => { event.preventDefault(); }, false);
		this.domElement.addEventListener('click', this.onMouseClick.bind(this), false);
		this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this), false);
		this.domElement.addEventListener('mouseup', this.onMouseUp.bind(this), false);
		this.domElement.addEventListener('mousemove', this.onMouseMove.bind(this), false);
		this.domElement.addEventListener('mousewheel', this.onMouseWheel.bind(this), false);
		this.domElement.addEventListener('DOMMouseScroll', this.onMouseWheel.bind(this), false);
		this.domElement.addEventListener('dblclick', this.onDoubleClick.bind(this));
		this.domElement.addEventListener('keydown', this.onKeyDown.bind(this));
		this.domElement.addEventListener('keyup', this.onKeyUp.bind(this));
		this.domElement.addEventListener('touchstart', this.onTouchStart.bind(this));
		this.domElement.addEventListener('touchend', this.onTouchEnd.bind(this));
		this.domElement.addEventListener('touchmove', this.onTouchMove.bind(this));
	}

	public addInputListener(listener: any): void {
		this.inputListeners.push(listener);
	}

	public removeInputListener(listener: any): void {
		this.inputListeners = this.inputListeners.filter(e => e !== listener);
	}

	public getSortedListeners(): any[] {
		return this.inputListeners.slice().sort((a, b) => {
			const ia = (a.importance !== undefined) ? a.importance : 0;
			const ib = (b.importance !== undefined) ? b.importance : 0;
			return ib - ia;
		});
	}

	public onTouchStart(e: TouchEvent): void {
		if (this.logMessages) console.log(this.constructor.name + ': onTouchStart');
		e.preventDefault();

		if (e.touches.length === 1) {
			const rect = this.domElement.getBoundingClientRect();
			const x = e.touches[0].pageX - rect.left;
			const y = e.touches[0].pageY - rect.top;
			this.mouse.set(x, y);

			this.startDragging(null);
		}

		for (const inputListener of this.getSortedListeners()) {
			inputListener.dispatchEvent({
				type: e.type,
				touches: e.touches,
				changedTouches: e.changedTouches,
			});
		}
	}

	public onTouchEnd(e: TouchEvent): void {
		if (this.logMessages) console.log(this.constructor.name + ': onTouchEnd');
		e.preventDefault();

		for (const inputListener of this.getSortedListeners()) {
			inputListener.dispatchEvent({
				type: 'drop',
				drag: this.drag,
				viewer: this.viewer,
			});
		}

		this.drag = null;

		for (const inputListener of this.getSortedListeners()) {
			inputListener.dispatchEvent({
				type: e.type,
				touches: e.touches,
				changedTouches: e.changedTouches,
			});
		}
	}

	public onTouchMove(e: TouchEvent): void {
		if (this.logMessages) console.log(this.constructor.name + ': onTouchMove');
		e.preventDefault();

		if (e.touches.length === 1) {
			const rect = this.domElement.getBoundingClientRect();
			const x = e.touches[0].pageX - rect.left;
			const y = e.touches[0].pageY - rect.top;
			this.mouse.set(x, y);

			if (this.drag) {
				this.drag.mouse = 1;
				this.drag.lastDrag.x = x - this.drag.end.x;
				this.drag.lastDrag.y = y - this.drag.end.y;
				this.drag.end.set(x, y);

				if (this.logMessages) console.log(this.constructor.name + ': drag: ');
				for (const inputListener of this.getSortedListeners()) {
					inputListener.dispatchEvent({
						type: 'drag',
						drag: this.drag,
						viewer: this.viewer,
					});
				}
			}
		}

		for (const inputListener of this.getSortedListeners()) {
			inputListener.dispatchEvent({
				type: e.type,
				touches: e.touches,
				changedTouches: e.changedTouches,
			});
		}
	}

	public onKeyDown(e: KeyboardEvent): void {
		if (this.logMessages) console.log(this.constructor.name + ': onKeyDown');

		if (e.keyCode === KeyCodes.DELETE && this.selection.length > 0) {
			this.dispatchEvent({
				type: 'delete',
				selection: this.selection,
			});
			this.deselectAll();
		}

		this.dispatchEvent({
			type: 'keydown',
			keyCode: e.keyCode,
			event: e,
		});

		this.pressedKeys[e.keyCode] = true;
	}

	public onKeyUp(e: KeyboardEvent): void {
		if (this.logMessages) console.log(this.constructor.name + ': onKeyUp');
		delete this.pressedKeys[e.keyCode];
		e.preventDefault();
	}

	public onDoubleClick(e: MouseEvent): void {
		if (this.logMessages) console.log(this.constructor.name + ': onDoubleClick');

		let consumed = false;
		for (const hovered of this.hoveredElements) {
			if (hovered._listeners && hovered._listeners['dblclick']) {
				hovered.object.dispatchEvent({
					type: 'dblclick',
					mouse: this.mouse,
					object: hovered.object,
				});
				consumed = true;
				break;
			}
		}

		if (!consumed) {
			for (const inputListener of this.getSortedListeners()) {
				inputListener.dispatchEvent({
					type: 'dblclick',
					mouse: this.mouse,
					object: null,
				});
			}
		}

		e.preventDefault();
	}

	public onMouseClick(e: MouseEvent): void {
		if (this.logMessages) console.log(this.constructor.name + ': onMouseClick');
		e.preventDefault();
	}

	public onMouseDown(e: MouseEvent): void {
		if (this.logMessages) console.log(this.constructor.name + ': onMouseDown');
		e.preventDefault();

		let consumed = false;
		const consume = () => { consumed = true; return true; };

		if (this.hoveredElements.length === 0) {
			for (const inputListener of this.getSortedListeners()) {
				inputListener.dispatchEvent({
					type: 'mousedown',
					viewer: this.viewer,
					mouse: this.mouse,
				});
			}
		} else {
			for (const hovered of this.hoveredElements) {
				const object = hovered.object;
				object.dispatchEvent({
					type: 'mousedown',
					viewer: this.viewer,
					consume: consume,
				});

				if (consumed) {
					break;
				}
			}
		}

		if (!this.drag) {
			const target = this.hoveredElements.find(el => (
				el.object._listeners &&
				el.object._listeners['drag'] &&
				el.object._listeners['drag'].length > 0
			));

			if (target) {
				this.startDragging(target.object, { location: target.point });
			} else {
				this.startDragging(null);
			}
		}

		if (this.scene) {
			this.viewStart = this.scene.view.clone();
		}
	}

	public onMouseUp(e: MouseEvent): void {
		if (this.logMessages) console.log(this.constructor.name + ': onMouseUp');
		e.preventDefault();

		const noMovement = this.getNormalizedDrag().length() === 0;

		let consumed = false;
		const consume = () => { consumed = true; return true; };

		if (this.hoveredElements.length === 0) {
			for (const inputListener of this.getSortedListeners()) {
				inputListener.dispatchEvent({
					type: 'mouseup',
					viewer: this.viewer,
					mouse: this.mouse,
					consume: consume,
				});

				if (consumed) {
					break;
				}
			}
		} else {
			const hovered = this.hoveredElements
				.map(el => el.object)
				.find(obj => (obj._listeners && obj._listeners['mouseup']));
			if (hovered) {
				hovered.dispatchEvent({
					type: 'mouseup',
					viewer: this.viewer,
					consume: consume,
				});
			}
		}

		if (this.drag) {
			if (this.drag.object) {
				if (this.logMessages) console.log(`${this.constructor.name}: drop ${this.drag.object.name}`);
				this.drag.object.dispatchEvent({
					type: 'drop',
					drag: this.drag,
					viewer: this.viewer,
				});
			} else {
				for (const inputListener of this.getSortedListeners()) {
					inputListener.dispatchEvent({
						type: 'drop',
						drag: this.drag,
						viewer: this.viewer,
					});
				}
			}

			const clicked = this.hoveredElements.map(h => h.object).find(v => v === this.drag.object) !== undefined;
			if (clicked) {
				if (this.logMessages) console.log(`${this.constructor.name}: click ${this.drag.object.name}`);
				this.drag.object.dispatchEvent({
					type: 'click',
					viewer: this.viewer,
					consume: consume,
				});
			}

			this.drag = null;
		}

		if (this.cesiumControls) {
			this.cesiumControls.setToolActive(false);
		}

		if (!consumed) {
			if (e.button === 0) { // THREE.MOUSE.LEFT
				if (noMovement) {
					let selectable = this.hoveredElements
						.find(el => el.object._listeners && el.object._listeners['select']);

					if (selectable) {
						const selObj = selectable.object;

						if (this.isSelected(selObj)) {
							this.selection
								.filter(el => el !== selObj)
								.forEach(el => this.toggleSelection(el));
						} else {
							this.deselectAll();
							this.toggleSelection(selObj);
						}
					} else {
						this.deselectAll();
					}
				}
			} else if (e.button === 2 && noMovement) { // THREE.MOUSE.RIGHT
				this.deselectAll();
			}
		}
	}

	public onMouseMove(e: MouseEvent): void {
		e.preventDefault();

		const rect = this.domElement.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		this.mouse.set(x, y);

		const hoveredElements = this.getHoveredElements();
		if (hoveredElements.length > 0) {
			const names = hoveredElements.map(h => h.object.name).join(', ');
			if (this.logMessages) console.log(`${this.constructor.name}: onMouseMove; hovered: '${names}'`);
		}

		if (this.drag) {
			this.drag.mouse = e.buttons;
			this.drag.lastDrag.x = x - this.drag.end.x;
			this.drag.lastDrag.y = y - this.drag.end.y;
			this.drag.end.set(x, y);

			if (this.drag.object) {
				if (this.logMessages) console.log(this.constructor.name + ': drag: ' + this.drag.object.name);
				this.drag.object.dispatchEvent({
					type: 'drag',
					drag: this.drag,
					viewer: this.viewer,
				});
			} else {
				if (this.logMessages) console.log(this.constructor.name + ': drag: ');
				let dragConsumed = false;
				for (const inputListener of this.getSortedListeners()) {
					inputListener.dispatchEvent({
						type: 'drag',
						drag: this.drag,
						viewer: this.viewer,
						consume: () => { dragConsumed = true; },
					});

					if (dragConsumed) {
						break;
					}
				}
			}
		} else {
			const curr = hoveredElements.length > 0 ? hoveredElements[0].object : null;
			const prev = this.hoveredElements.length > 0 ? this.hoveredElements[0].object : null;

			if (curr !== prev) {
				if (curr) {
					if (this.logMessages) console.log(`${this.constructor.name}: mouseover: ${curr.name}`);
					curr.dispatchEvent({
						type: 'mouseover',
						object: curr,
					});
				}
				if (prev) {
					if (this.logMessages) console.log(`${this.constructor.name}: mouseleave: ${prev.name}`);
					prev.dispatchEvent({
						type: 'mouseleave',
						object: prev,
					});
				}
			}

			if (hoveredElements.length > 0) {
				const object = hoveredElements
					.map(el => el.object)
					.find(obj => (obj._listeners && obj._listeners['mousemove']));

				if (object) {
					object.dispatchEvent({
						type: 'mousemove',
						object: object,
					});
				}
			}
		}

		this.hoveredElements = hoveredElements;
		this.hoveredElement = hoveredElements.length > 0 ? hoveredElements[0] : null;
	}

	public onMouseWheel(e: any): void {
		if (!this.enabled) return;
		if (this.logMessages) console.log(this.constructor.name + ': onMouseWheel');

		e.preventDefault();

		let delta = 0;
		if (e.wheelDelta !== undefined) {
			delta = e.wheelDelta;
		} else if (e.detail !== undefined) {
			delta = -e.detail;
		}

		const ndelta = Math.sign(delta);

		if (this.hoveredElement) {
			this.hoveredElement.object.dispatchEvent({
				type: 'mousewheel',
				delta: ndelta,
				object: this.hoveredElement.object,
			});
		} else {
			for (const inputListener of this.getSortedListeners()) {
				inputListener.dispatchEvent({
					type: 'mousewheel',
					delta: ndelta,
					object: null,
				});
			}
		}
	}

	public startDragging(object: any, args: any = null): void {
		const name = object ? object.name : 'no name';
		if (this.logMessages) console.log(`${this.constructor.name}: startDragging: '${name}'`);

		this.drag = {
			start: this.mouse.clone(),
			end: this.mouse.clone(),
			lastDrag: new THREE.Vector2(0, 0),
			startView: this.scene ? this.scene.view.clone() : null,
			object: object,
		};

		if (args) {
			for (const key of Object.keys(args)) {
				this.drag[key] = args[key];
			}
		}

		if (this.cesiumControls && object) {
			this.cesiumControls.setToolActive(true);
		}
	}

	public setCesiumMode(cesiumControls: any): void {
		this.cesiumControls = cesiumControls;
	}

	public getMousePointCloudIntersection(_mouse?: any): any {
		return Utils.getMousePointCloudIntersection(
			this.mouse,
			this.scene.getActiveCamera(),
			this.viewer,
			this.scene.pointclouds
		);
	}

	public toggleSelection(object: any): void {
		const oldSelection = this.selection.slice();
		const index = this.selection.indexOf(object);

		if (index === -1) {
			this.selection.push(object);
			object.dispatchEvent({ type: 'select' });
		} else {
			this.selection.splice(index, 1);
			object.dispatchEvent({ type: 'deselect' });
		}

		this.dispatchEvent({
			type: 'selection_changed',
			oldSelection: oldSelection,
			selection: this.selection,
		});
	}

	public deselect(object: any): void {
		const oldSelection = this.selection.slice();
		const index = this.selection.indexOf(object);

		if (index >= 0) {
			this.selection.splice(index, 1);
			object.dispatchEvent({ type: 'deselect' });

			this.dispatchEvent({
				type: 'selection_changed',
				oldSelection: oldSelection,
				selection: this.selection,
			});
		}
	}

	public deselectAll(): void {
		for (const object of this.selection) {
			object.dispatchEvent({ type: 'deselect' });
		}

		const oldSelection = this.selection.slice();

		if (this.selection.length > 0) {
			this.selection = [];
			this.dispatchEvent({
				type: 'selection_changed',
				oldSelection: oldSelection,
				selection: this.selection,
			});
		}
	}

	public isSelected(object: any): boolean {
		return this.selection.indexOf(object) !== -1;
	}

	public registerInteractiveObject(object: any): void {
		this.interactiveObjects.add(object);
	}

	public removeInteractiveObject(object: any): void {
		this.interactiveObjects.delete(object);
	}

	public registerInteractiveScene(scene: any): void {
		if (this.interactiveScenes.indexOf(scene) === -1) {
			this.interactiveScenes.push(scene);
		}
	}

	public unregisterInteractiveScene(scene: any): void {
		const index = this.interactiveScenes.indexOf(scene);
		if (index > -1) {
			this.interactiveScenes.splice(index, 1);
		}
	}

	public getHoveredElement(): any {
		const hoveredElements = this.getHoveredElements();
		return hoveredElements.length > 0 ? hoveredElements[0] : null;
	}

	public getHoveredElements(): any[] {
		if (!this.scene) return [];

		const scenes = this.interactiveScenes.concat(this.scene.scene);
		const interactableListeners = ['mouseup', 'mousemove', 'mouseover', 'mouseleave', 'drag', 'drop', 'click', 'select', 'deselect'];
		const interactables: THREE.Object3D[] = [];

		for (const scene of scenes) {
			if (!scene) continue;
			scene.traverseVisible((node: any) => {
				if (node._listeners && node.visible && !this.blacklist.has(node)) {
					const hasInteractableListener = interactableListeners.some(e => node._listeners[e] !== undefined);
					if (hasInteractableListener) {
						interactables.push(node);
					}
				}
			});
		}

		const camera = this.scene.getActiveCamera();
		if (!camera) return [];

		const ray = Utils.mouseToRay(this.mouse, camera, this.domElement.clientWidth, this.domElement.clientHeight);

		const raycaster = new THREE.Raycaster();
		raycaster.ray.set(ray.origin, ray.direction);
		(raycaster.params as any).Line = { threshold: 0.2 };

		const intersections = raycaster.intersectObjects(interactables.filter(o => o.visible), false);
		return intersections;
	}

	public setScene(scene: any): void {
		this.deselectAll();
		this.scene = scene;
	}

	public update(_delta?: number): void {}

	public getNormalizedDrag(): THREE.Vector2 {
		if (!this.drag) {
			return new THREE.Vector2(0, 0);
		}

		const diff = new THREE.Vector2().subVectors(this.drag.end, this.drag.start);
		diff.x = diff.x / this.domElement.clientWidth;
		diff.y = diff.y / this.domElement.clientHeight;

		return diff;
	}

	public getNormalizedLastDrag(): THREE.Vector2 {
		if (!this.drag) {
			return new THREE.Vector2(0, 0);
		}

		const lastDrag = this.drag.lastDrag.clone();
		lastDrag.x = lastDrag.x / this.domElement.clientWidth;
		lastDrag.y = lastDrag.y / this.domElement.clientHeight;

		return lastDrag;
	}
}
