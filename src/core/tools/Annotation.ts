import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { Action } from './Actions.js';
import { Utils } from '../utils/Utils.js';
import { EventDispatcher } from '../EventDispatcher.js';
import { runtime } from '../runtime/runtime.js';

export interface AnnotationArgs {
	title?: string;
	description?: string;
	position?: THREE.Vector3 | number[];
	cameraPosition?: THREE.Vector3 | number[];
	cameraTarget?: THREE.Vector3 | number[];
	radius?: number;
	view?: any;
	actions?: any[];
	collapseThreshold?: number;
	[key: string]: any;
}

export class Annotation extends EventDispatcher {
	public scene: any = null;
	public _title: string;
	public _description: string;
	public offset: THREE.Vector3 = new THREE.Vector3();
	public uuid: string;
	public position: THREE.Vector3 | null = null;
	public cameraPosition: THREE.Vector3 | null = null;
	public cameraTarget: THREE.Vector3 | null = null;
	public radius?: number;
	public view: any = null;
	public keepOpen: boolean = false;
	public descriptionVisible: boolean = false;
	public showDescription: boolean = true;
	public actions: Action[] = [];
	public isHighlighted: boolean = false;
	public _visible: boolean = true;
	public __visible: boolean = true;
	public _display: boolean = true;
	public _expand: boolean = false;
	public collapseThreshold?: number;
	public children: Annotation[] = [];
	public parent: Annotation | null = null;
	public boundingBox: THREE.Box3 = new THREE.Box3();
	public domElement: any;
	public elTitlebar: any;
	public elTitle: any;
	public elDescription: any;
	public elDescriptionClose: any;
	public clickTitle: () => void;
	public handles?: any;

	constructor(args: AnnotationArgs = {}) {
		super();

		this.scene = null;
		this._title = args.title || 'No Title';
		this._description = args.description || '';
		this.offset = new THREE.Vector3();
		this.uuid = THREE.MathUtils?.generateUUID?.() || Math.random().toString(36).substring(2);

		if (!args.position) {
			this.position = null;
		} else if ((args.position as any).x != null) {
			this.position = args.position as THREE.Vector3;
		} else {
			const posArr = args.position as number[];
			this.position = new THREE.Vector3(posArr[0], posArr[1], posArr[2]);
		}

		if (Array.isArray(args.cameraPosition)) {
			this.cameraPosition = new THREE.Vector3().fromArray(args.cameraPosition);
		} else {
			this.cameraPosition = (args.cameraPosition as THREE.Vector3) || null;
		}

		if (Array.isArray(args.cameraTarget)) {
			this.cameraTarget = new THREE.Vector3().fromArray(args.cameraTarget);
		} else {
			this.cameraTarget = (args.cameraTarget as THREE.Vector3) || null;
		}

		this.radius = args.radius;
		this.view = args.view || null;
		this.keepOpen = false;
		this.descriptionVisible = false;
		this.showDescription = true;
		this.actions = args.actions || [];
		this.isHighlighted = false;
		this._visible = true;
		this.__visible = true;
		this._display = true;
		this._expand = false;
		this.collapseThreshold = args.collapseThreshold !== undefined ? args.collapseThreshold : 100;

		this.children = [];
		this.parent = null;
		this.boundingBox = new THREE.Box3();

		const res = runtime.resourcePath || './resources';
		const iconClose = `${res}/icons/close.svg`;

		let container: HTMLElement | null = null;
		if (typeof document !== 'undefined') {
			container = document.createElement('div');
			container.className = 'annotation';
			container.oncontextmenu = () => false;
			container.innerHTML = `
				<div class="annotation-titlebar">
					<span class="annotation-label"></span>
				</div>
				<div class="annotation-description">
					<span class="annotation-description-close">
						<img src="${iconClose}" width="16px">
					</span>
					<span class="annotation-description-content">${this._description}</span>
				</div>
			`.trim();
		}

		const attachElHelpers = (el: any) => {
			if (!el) return el;
			el[0] = el;
			el.find = (sel: string) => el.querySelector(sel);
			el.empty = () => { el.innerHTML = ''; };
			el.append = (child: any) => {
				if (typeof child === 'string') el.insertAdjacentHTML('beforeend', child);
				else el.appendChild(child);
			};
			el.css = (prop: string, val: any) => {
				if (val !== undefined) {
					const styleKey = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
					el.style[styleKey] = val;
					return el;
				}
				return el.style[prop];
			};
			el.show = () => { el.style.display = ''; };
			el.hide = () => { el.style.display = 'none'; };
			el.fadeIn = (duration = 200) => {
				el.style.opacity = '0';
				el.style.display = '';
				el.style.transition = `opacity ${duration}ms ease`;
				requestAnimationFrame(() => { el.style.opacity = '1'; });
			};
			return el;
		};

		this.domElement = attachElHelpers(container);
		if (this.domElement) {
			this.elTitlebar = attachElHelpers(this.domElement.querySelector('.annotation-titlebar'));
			this.elTitle = attachElHelpers(this.elTitlebar?.querySelector('.annotation-label'));
			if (this.elTitle) this.elTitle.textContent = this._title;
			this.elDescription = attachElHelpers(this.domElement.querySelector('.annotation-description'));
			this.elDescriptionClose = attachElHelpers(this.elDescription?.querySelector('.annotation-description-close'));
		}

		this.clickTitle = () => {
			if (this.hasView() && this.scene) {
				this.moveHere(this.scene.getActiveCamera());
			}
			this.dispatchEvent({ type: 'click', target: this });
		};

		if (this.elTitle) {
			this.elTitle.addEventListener('click', this.clickTitle);
		}

		this.actions = this.actions.map((a: any) => {
			if (a instanceof Action) {
				return a;
			} else {
				return new Action(a);
			}
		});

		for (const action of this.actions) {
			action.pairWith(this);
		}

		if (typeof document !== 'undefined' && this.elTitlebar) {
			const actions = this.actions.filter(
				(a: any) => a.showIn === undefined || a.showIn.includes('scene')
			);

			for (const action of actions) {
				const elButton = document.createElement('img');
				elButton.src = action.icon;
				elButton.className = 'annotation-action-icon';
				this.elTitlebar.appendChild(elButton);
				elButton.addEventListener('click', () => {
					if (action.onclick) action.onclick({ annotation: this });
				});
			}
		}

		if (this.elDescriptionClose) {
			this.elDescriptionClose.addEventListener('mouseenter', () => { this.elDescriptionClose.style.opacity = '1'; });
			this.elDescriptionClose.addEventListener('mouseleave', () => { this.elDescriptionClose.style.opacity = '0.5'; });
			this.elDescriptionClose.addEventListener('click', () => this.setHighlighted(false));
		}

		if (this.domElement) {
			this.domElement.addEventListener('mouseenter', () => this.setHighlighted(true));
			this.domElement.addEventListener('mouseleave', () => this.setHighlighted(false));
			this.domElement.addEventListener('touchstart', () => {
				this.setHighlighted(!this.isHighlighted);
			});
		}

		this.display = false;
	}

	installHandles(viewer: any): void {
		if (this.handles !== undefined || typeof document === 'undefined') {
			return;
		}

		const domElement = document.createElement('div');
		domElement.style.position = 'absolute';
		domElement.style.left = '300px';
		domElement.style.top = '200px';
		domElement.style.pointerEvents = 'none';
		domElement.innerHTML = `
			<svg width="300" height="600">
				<line x1="0" y1="0" x2="1200" y2="200" style="stroke: black; stroke-width:2" />
				<circle cx="50" cy="50" r="4" stroke="black" stroke-width="2" fill="gray" />
				<circle cx="150" cy="50" r="4" stroke="black" stroke-width="2" fill="gray" />
			</svg>
		`.trim();

		const svg = domElement.querySelector('svg')!;
		const elLine = domElement.querySelector('line')!;
		const circles = domElement.querySelectorAll('circle');
		const elStart = circles[0];
		const elEnd = circles[1];

		const setCoordinates = (start: THREE.Vector3, end: THREE.Vector3) => {
			elStart.setAttribute('cx', `${start.x}`);
			elStart.setAttribute('cy', `${start.y}`);
			elEnd.setAttribute('cx', `${end.x}`);
			elEnd.setAttribute('cy', `${end.y}`);

			elLine.setAttribute('x1', `${start.x}`);
			elLine.setAttribute('y1', `${start.y}`);
			elLine.setAttribute('x2', `${end.x}`);
			elLine.setAttribute('y2', `${end.y}`);

			const box = svg.getBBox();
			svg.setAttribute('width', `${box.width}`);
			svg.setAttribute('height', `${box.height}`);
			svg.setAttribute('viewBox', `${box.x} ${box.y} ${box.width} ${box.height}`);

			const ya = start.y - end.y;
			const xa = start.x - end.x;

			if (ya > 0) start.y = start.y - ya;
			if (xa > 0) start.x = start.x - xa;

			domElement.style.left = `${start.x}px`;
			domElement.style.top = `${start.y}px`;
		};

		if (viewer.renderArea) {
			viewer.renderArea.appendChild(domElement);
		}

		let annotationStartPos = this.position ? this.position.clone() : new THREE.Vector3();
		let annotationStartOffset = this.offset.clone();
		let isDragging = false;
		let dragStartMouse = { x: 0, y: 0 };

		const onMouseDown = (event: MouseEvent) => {
			if (event.button !== 0) return;
			isDragging = true;
			annotationStartPos = this.position ? this.position.clone() : new THREE.Vector3();
			annotationStartOffset = this.offset.clone();
			dragStartMouse = { x: event.clientX, y: event.clientY };
			const titlebar = this.domElement.querySelector('.annotation-titlebar');
			if (titlebar) titlebar.style.pointerEvents = 'none';

			const onMouseMove = (moveEvent: MouseEvent) => {
				if (!isDragging) return;
				const renderAreaWidth = viewer.renderer.getSize(new THREE.Vector2()).width;
				const diff = {
					x: dragStartMouse.x - moveEvent.clientX,
					y: dragStartMouse.y - moveEvent.clientY
				};
				const nDiff = {
					x: -(diff.x / renderAreaWidth) * 2,
					y: (diff.y / renderAreaWidth) * 2
				};

				const camera = viewer.scene.getActiveCamera();
				const oldScreenPos = new THREE.Vector3()
					.addVectors(annotationStartPos, annotationStartOffset)
					.project(camera);

				const newScreenPos = oldScreenPos.clone();
				newScreenPos.x += nDiff.x;
				newScreenPos.y += nDiff.y;

				const newPos = newScreenPos.clone();
				newPos.unproject(camera);

				if (this.position) {
					const newOffset = new THREE.Vector3().subVectors(newPos, this.position);
					this.offset.copy(newOffset);
				}
			};

			const onMouseUp = () => {
				isDragging = false;
				const titlebar = this.domElement.querySelector('.annotation-titlebar');
				if (titlebar) titlebar.style.pointerEvents = '';
				window.removeEventListener('mousemove', onMouseMove);
				window.removeEventListener('mouseup', onMouseUp);
			};

			window.addEventListener('mousemove', onMouseMove);
			window.addEventListener('mouseup', onMouseUp);
		};

		if (this.domElement) {
			this.domElement.addEventListener('mousedown', onMouseDown);
		}

		const updateCallback = () => {
			if (!this.position) return;
			const scene = viewer.scene;
			const renderAreaSize = viewer.renderer.getSize(new THREE.Vector2());
			const renderAreaWidth = renderAreaSize.width;
			const renderAreaHeight = renderAreaSize.height;

			let start = this.position.clone();
			let end = new THREE.Vector3().addVectors(this.position, this.offset);

			const toScreen = (pos: THREE.Vector3) => {
				const camera = scene.getActiveCamera();
				const screenPos = new THREE.Vector3();
				const worldView = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
				const ndc = new THREE.Vector4(pos.x, pos.y, pos.z, 1.0).applyMatrix4(worldView);
				ndc.w = Math.max(ndc.w, 0.1);
				ndc.divideScalar(ndc.w);

				screenPos.copy(ndc as any);
				screenPos.x = renderAreaWidth * (screenPos.x + 1) / 2;
				screenPos.y = renderAreaHeight * (1 - (screenPos.y + 1) / 2);
				return screenPos;
			};

			start = toScreen(start);
			end = toScreen(end);
			setCoordinates(start, end);
		};

		viewer.addEventListener('update', updateCallback);

		this.handles = {
			domElement: domElement,
			setCoordinates: setCoordinates,
			updateCallback: updateCallback
		};
	}

	removeHandles(viewer: any): void {
		if (this.handles === undefined) return;
		this.handles.domElement.remove();
		viewer.removeEventListener('update', this.handles.updateCallback);
		delete this.handles;
	}

	get visible(): boolean {
		return this._visible;
	}

	set visible(value: boolean) {
		if (this._visible === value) return;
		this._visible = value;
		this.dispatchEvent({
			type: 'visibility_changed',
			annotation: this
		});
	}

	get display(): boolean {
		return this._display;
	}

	set display(display: boolean) {
		if (this._display === display) return;
		this._display = display;
		if (this.domElement) {
			if (display) {
				this.domElement.show();
			} else {
				this.domElement.hide();
			}
		}
	}

	get expand(): boolean {
		return this._expand;
	}

	set expand(expand: boolean) {
		if (this._expand === expand) return;
		if (expand) {
			this.display = false;
		} else {
			this.display = true;
			this.traverseDescendants((node: Annotation) => {
				node.display = false;
			});
		}
		this._expand = expand;
	}

	get title(): string {
		return this._title;
	}

	set title(title: string) {
		if (this._title === title) return;
		this._title = title;
		if (this.elTitle) {
			this.elTitle.empty();
			this.elTitle.append(this._title);
		}
		this.dispatchEvent({
			type: 'annotation_changed',
			annotation: this
		});
	}

	get description(): string {
		return this._description;
	}

	set description(description: string) {
		if (this._description === description) return;
		this._description = description;

		if (this.elDescription) {
			const elDescriptionContent = this.elDescription.find('.annotation-description-content');
			if (elDescriptionContent) {
				elDescriptionContent.empty();
				elDescriptionContent.append(this._description);
			}
		}

		this.dispatchEvent({
			type: 'annotation_changed',
			annotation: this
		});
	}

	add(annotation: Annotation): void {
		if (!this.children.includes(annotation)) {
			this.children.push(annotation);
			annotation.parent = this;

			const descendants: Annotation[] = [];
			annotation.traverse((a: Annotation) => { descendants.push(a); });

			for (const descendant of descendants) {
				let c: Annotation | null = this;
				while (c !== null) {
					c.dispatchEvent({
						type: 'annotation_added',
						annotation: descendant
					});
					c = c.parent;
				}
			}
		}
	}

	level(): number {
		if (this.parent === null) {
			return 0;
		} else {
			return this.parent.level() + 1;
		}
	}

	hasChild(annotation: Annotation): boolean {
		return this.children.includes(annotation);
	}

	remove(annotation: Annotation): void {
		if (this.hasChild(annotation)) {
			annotation.removeAllChildren();
			annotation.dispose();
			this.children = this.children.filter((e) => e !== annotation);
			annotation.parent = null;
		}
	}

	removeAllChildren(): void {
		this.children.forEach((child) => {
			if (child.children.length > 0) {
				child.removeAllChildren();
			}
			this.remove(child);
		});
	}

	updateBounds(): void {
		const box = new THREE.Box3();
		if (this.position) {
			box.expandByPoint(this.position);
		}
		for (const child of this.children) {
			child.updateBounds();
			box.union(child.boundingBox);
		}
		this.boundingBox.copy(box);
	}

	traverse(handler: (node: Annotation) => boolean | void): void {
		const expand = handler(this);
		if (expand === undefined || expand === true) {
			for (const child of this.children) {
				child.traverse(handler);
			}
		}
	}

	traverseDescendants(handler: (node: Annotation) => void): void {
		for (const child of this.children) {
			child.traverse(handler);
		}
	}

	flatten(): Annotation[] {
		const annotations: Annotation[] = [];
		this.traverse((annotation: Annotation) => {
			annotations.push(annotation);
		});
		return annotations;
	}

	descendants(): Annotation[] {
		const annotations: Annotation[] = [];
		this.traverse((annotation: Annotation) => {
			if (annotation !== this) {
				annotations.push(annotation);
			}
		});
		return annotations;
	}

	setHighlighted(highlighted: boolean): void {
		if (!this.domElement) return;
		if (highlighted) {
			this.domElement.css('opacity', '0.8');
			if (this.elTitlebar) this.elTitlebar.css('box-shadow', '0 0 5px #fff');
			this.domElement.css('z-index', '1000');

			if (this._description && this.elDescription) {
				this.descriptionVisible = true;
				this.elDescription.fadeIn(200);
				this.elDescription.css('position', 'relative');
			}
		} else {
			this.domElement.css('opacity', '0.5');
			if (this.elTitlebar) this.elTitlebar.css('box-shadow', '');
			this.domElement.css('z-index', '100');
			this.descriptionVisible = false;
			if (this.elDescription) this.elDescription.css('display', 'none');
		}

		this.isHighlighted = highlighted;
	}

	hasView(): boolean {
		const hasPosTargetView = this.cameraTarget !== null && this.cameraPosition !== null;
		const hasRadiusView = this.radius !== undefined;
		return hasPosTargetView || hasRadiusView;
	}

	moveHere(_camera?: any): void {
		if (!this.hasView() || !this.scene) return;

		const view = this.scene.view;
		const animationDuration = 500;
		const easing = TWEEN.Easing.Quartic.Out;

		let endTarget: THREE.Vector3;
		if (this.cameraTarget) {
			endTarget = this.cameraTarget;
		} else if (this.position) {
			endTarget = this.position;
		} else {
			endTarget = this.boundingBox.getCenter(new THREE.Vector3());
		}

		if (this.cameraPosition) {
			const endPosition = this.cameraPosition;
			Utils.moveTo(this.scene, endPosition, endTarget);
		} else if (this.radius) {
			const direction = view.direction;
			const endPosition = endTarget.clone().add(direction.multiplyScalar(-this.radius));
			const startRadius = view.radius;
			const endRadius = this.radius;

			const tween = new TWEEN.Tween(view.position).to(endPosition, animationDuration);
			tween.easing(easing);
			tween.start();

			const t = { x: 0 };
			const tweenRadius = new TWEEN.Tween(t)
				.to({ x: 1 }, animationDuration)
				.onUpdate(() => {
					view.radius = t.x * endRadius + (1 - t.x) * startRadius;
				});
			tweenRadius.easing(easing);
			tweenRadius.start();
		}
	}

	dispose(): void {
		if (this.domElement && this.domElement.parentElement) {
			this.domElement.parentElement.removeChild(this.domElement);
		}
	}

	toString(): string {
		return 'Annotation: ' + this._title;
	}
}
