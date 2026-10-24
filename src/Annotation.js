

import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import {Action} from "./Actions.js";
import {Utils} from "./utils.js";
import {EventDispatcher} from "./EventDispatcher.js";
import {runtime} from "./runtime.js";

export class Annotation extends EventDispatcher {
	constructor (args = {}) {
		super();

		this.scene = null;
		this._title = args.title || 'No Title';
		this._description = args.description || '';
		this.offset = new THREE.Vector3();
		this.uuid = THREE.Math.generateUUID();

		if (!args.position) {
			this.position = null;
		} else if (args.position.x != null) {
			this.position = args.position;
		} else {
			this.position = new THREE.Vector3(...args.position);
		}

		this.cameraPosition = (args.cameraPosition instanceof Array)
			? new THREE.Vector3().fromArray(args.cameraPosition) : args.cameraPosition;
		this.cameraTarget = (args.cameraTarget instanceof Array)
			? new THREE.Vector3().fromArray(args.cameraTarget) : args.cameraTarget;
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
		this.collapseThreshold = [args.collapseThreshold, 100].find(e => e !== undefined);

		this.children = [];
		this.parent = null;
		this.boundingBox = new THREE.Box3();

		const res = runtime.resourcePath || './resources';
		let iconClose = res + '/icons/close.svg';

		const container = document.createElement('div');
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

		const attachElHelpers = (el) => {
			if (!el) return el;
			el[0] = el;
			el.find = (sel) => el.querySelector(sel);
			el.empty = () => { el.innerHTML = ''; };
			el.append = (child) => {
				if (typeof child === 'string') el.insertAdjacentHTML('beforeend', child);
				else el.appendChild(child);
			};
			el.css = (prop, val) => {
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
		this.elTitlebar = attachElHelpers(this.domElement.querySelector('.annotation-titlebar'));
		this.elTitle = attachElHelpers(this.elTitlebar.querySelector('.annotation-label'));
		this.elTitle.textContent = this._title;
		this.elDescription = attachElHelpers(this.domElement.querySelector('.annotation-description'));
		this.elDescriptionClose = attachElHelpers(this.elDescription.querySelector('.annotation-description-close'));

		this.clickTitle = () => {
			if(this.hasView()){
				this.moveHere(this.scene.getActiveCamera());
			}
			this.dispatchEvent({type: 'click', target: this});
		};

		this.elTitle.addEventListener('click', this.clickTitle);

		this.actions = this.actions.map(a => {
			if (a instanceof Action) {
				return a;
			} else {
				return new Action(a);
			}
		});

		for (let action of this.actions) {
			action.pairWith(this);
		}

		let actions = this.actions.filter(
			a => a.showIn === undefined || a.showIn.includes('scene'));

		for (let action of actions) {
			let elButton = document.createElement('img');
			elButton.src = action.icon;
			elButton.className = 'annotation-action-icon';
			this.elTitlebar.appendChild(elButton);
			elButton.addEventListener('click', () => action.onclick({annotation: this}));
		}

		this.elDescriptionClose.addEventListener('mouseenter', () => { this.elDescriptionClose.style.opacity = '1'; });
		this.elDescriptionClose.addEventListener('mouseleave', () => { this.elDescriptionClose.style.opacity = '0.5'; });
		this.elDescriptionClose.addEventListener('click', () => this.setHighlighted(false));

		this.domElement.addEventListener('mouseenter', () => this.setHighlighted(true));
		this.domElement.addEventListener('mouseleave', () => this.setHighlighted(false));
		this.domElement.addEventListener('touchstart', () => {
			this.setHighlighted(!this.isHighlighted);
		});

		this.display = false;

	}

	installHandles(viewer){
		if(this.handles !== undefined){
			return;
		}

		let domElement = document.createElement('div');
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
		
		let svg = domElement.querySelector("svg");
		let elLine = domElement.querySelector("line");
		let elStart = domElement.querySelectorAll("circle")[0];
		let elEnd = domElement.querySelectorAll("circle")[1];

		let setCoordinates = (start, end) => {
			elStart.setAttribute("cx", `${start.x}`);
			elStart.setAttribute("cy", `${start.y}`);

			elEnd.setAttribute("cx", `${end.x}`);
			elEnd.setAttribute("cy", `${end.y}`);

			elLine.setAttribute("x1", start.x);
			elLine.setAttribute("y1", start.y);
			elLine.setAttribute("x2", end.x);
			elLine.setAttribute("y2", end.y);

			let box = svg.getBBox();
			svg.setAttribute("width", `${box.width}`);
			svg.setAttribute("height", `${box.height}`);
			svg.setAttribute("viewBox", `${box.x} ${box.y} ${box.width} ${box.height}`);

			let ya = start.y - end.y;
			let xa = start.x - end.x;

			if(ya > 0){
				start.y = start.y - ya;
			}
			if(xa > 0){
				start.x = start.x - xa;
			}

			domElement.style.left = `${start.x}px`;
			domElement.style.top = `${start.y}px`;

		};

		if (viewer.renderArea) {
			viewer.renderArea.appendChild(domElement);
		}


		let annotationStartPos = this.position.clone();
		let annotationStartOffset = this.offset.clone();

		let isDragging = false;
		let dragStartMouse = { x: 0, y: 0 };

		const onMouseDown = (event) => {
			if (event.button !== 0) return;
			isDragging = true;
			annotationStartPos = this.position.clone();
			annotationStartOffset = this.offset.clone();
			dragStartMouse = { x: event.clientX, y: event.clientY };
			const titlebar = this.domElement.querySelector(".annotation-titlebar");
			if (titlebar) titlebar.style.pointerEvents = "none";

			const onMouseMove = (moveEvent) => {
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

				const newOffset = new THREE.Vector3().subVectors(newPos, this.position);
				this.offset.copy(newOffset);
			};

			const onMouseUp = () => {
				isDragging = false;
				const titlebar = this.domElement.querySelector(".annotation-titlebar");
				if (titlebar) titlebar.style.pointerEvents = "";
				window.removeEventListener('mousemove', onMouseMove);
				window.removeEventListener('mouseup', onMouseUp);
			};

			window.addEventListener('mousemove', onMouseMove);
			window.addEventListener('mouseup', onMouseUp);
		};

		this.domElement.addEventListener('mousedown', onMouseDown);

		let updateCallback = () => {
			let position = this.position;
			let scene = viewer.scene;

			const renderAreaSize = viewer.renderer.getSize(new THREE.Vector2());
			let renderAreaWidth = renderAreaSize.width;
			let renderAreaHeight = renderAreaSize.height;

			let start = this.position.clone();
			let end = new THREE.Vector3().addVectors(this.position, this.offset);

			let toScreen = (position) => {
				let camera = scene.getActiveCamera();
				let screenPos = new THREE.Vector3();

				let worldView = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
				let ndc = new THREE.Vector4(position.x, position.y, position.z, 1.0).applyMatrix4(worldView);
				// limit w to small positive value, in case position is behind the camera
				ndc.w = Math.max(ndc.w, 0.1);
				ndc.divideScalar(ndc.w);

				screenPos.copy(ndc);
				screenPos.x = renderAreaWidth * (screenPos.x + 1) / 2;
				screenPos.y = renderAreaHeight * (1 - (screenPos.y + 1) / 2);

				return screenPos;
			};
			
			start = toScreen(start);
			end = toScreen(end);

			setCoordinates(start, end);

		};

		viewer.addEventListener("update", updateCallback);

		this.handles = {
			domElement: domElement,
			setCoordinates: setCoordinates,
			updateCallback: updateCallback
		};
	}

	removeHandles(viewer){
		if(this.handles === undefined){
			return;
		}

		//$(viewer.renderArea).remove(this.handles.domElement);
		this.handles.domElement.remove();
		viewer.removeEventListener("update", this.handles.updateCallback);

		delete this.handles;
	}

	get visible () {
		return this._visible;
	}

	set visible (value) {
		if (this._visible === value) {
			return;
		}

		this._visible = value;

		//this.traverse(node => {
		//	node.display = value;
		//});

		this.dispatchEvent({
			type: 'visibility_changed',
			annotation: this
		});
	}

	get display () {
		return this._display;
	}

	set display (display) {
		if (this._display === display) {
			return;
		}

		this._display = display;

		if (display) {
			// this.domElement.fadeIn(200);
			this.domElement.show();
		} else {
			// this.domElement.fadeOut(200);
			this.domElement.hide();
		}
	}

	get expand () {
		return this._expand;
	}

	set expand (expand) {
		if (this._expand === expand) {
			return;
		}

		if (expand) {
			this.display = false;
		} else {
			this.display = true;
			this.traverseDescendants(node => {
				node.display = false;
			});
		}

		this._expand = expand;
	}

	get title () {
		return this._title;
	}

	set title (title) {
		if (this._title === title) {
			return;
		}

		this._title = title;
		this.elTitle.empty();
		this.elTitle.append(this._title);

		this.dispatchEvent({
			type: "annotation_changed",
			annotation: this,
		});
	}

	get description () {
		return this._description;
	}

	set description (description) {
		if (this._description === description) {
			return;
		}

		this._description = description;

		const elDescriptionContent = this.elDescription.find(".annotation-description-content");
		elDescriptionContent.empty();
		elDescriptionContent.append(this._description);

		this.dispatchEvent({
			type: "annotation_changed",
			annotation: this,
		});
	}

	add (annotation) {
		if (!this.children.includes(annotation)) {
			this.children.push(annotation);
			annotation.parent = this;

			let descendants = [];
			annotation.traverse(a => { descendants.push(a); });

			for (let descendant of descendants) {
				let c = this;
				while (c !== null) {
					c.dispatchEvent({
						'type': 'annotation_added',
						'annotation': descendant
					});
					c = c.parent;
				}
			}
		}
	}

	level () {
		if (this.parent === null) {
			return 0;
		} else {
			return this.parent.level() + 1;
		}
	}

	hasChild(annotation) {
		return this.children.includes(annotation);
	}

	remove (annotation) {
		if (this.hasChild(annotation)) {
			annotation.removeAllChildren();
			annotation.dispose();
			this.children = this.children.filter(e => e !== annotation);
			annotation.parent = null;
		}
	}

	removeAllChildren() {
		this.children.forEach((child) => {
			if (child.children.length > 0) {
				child.removeAllChildren();
			}

			this.remove(child);
		});
	}

	updateBounds () {
		let box = new THREE.Box3();

		if (this.position) {
			box.expandByPoint(this.position);
		}

		for (let child of this.children) {
			child.updateBounds();

			box.union(child.boundingBox);
		}

		this.boundingBox.copy(box);
	}

	traverse (handler) {
		let expand = handler(this);

		if (expand === undefined || expand === true) {
			for (let child of this.children) {
				child.traverse(handler);
			}
		}
	}

	traverseDescendants (handler) {
		for (let child of this.children) {
			child.traverse(handler);
		}
	}

	flatten () {
		let annotations = [];

		this.traverse(annotation => {
			annotations.push(annotation);
		});

		return annotations;
	}

	descendants () {
		let annotations = [];

		this.traverse(annotation => {
			if (annotation !== this) {
				annotations.push(annotation);
			}
		});

		return annotations;
	}

	setHighlighted (highlighted) {
		if (highlighted) {
			this.domElement.css('opacity', '0.8');
			this.elTitlebar.css('box-shadow', '0 0 5px #fff');
			this.domElement.css('z-index', '1000');

			if (this._description) {
				this.descriptionVisible = true;
				this.elDescription.fadeIn(200);
				this.elDescription.css('position', 'relative');
			}
		} else {
			this.domElement.css('opacity', '0.5');
			this.elTitlebar.css('box-shadow', '');
			this.domElement.css('z-index', '100');
			this.descriptionVisible = false;
			this.elDescription.css('display', 'none');
		}

		this.isHighlighted = highlighted;
	}

	hasView () {
		let hasPosTargetView = this.cameraTarget.x != null;
		hasPosTargetView = hasPosTargetView && this.cameraPosition.x != null;

		let hasRadiusView = this.radius !== undefined;

		let hasView = hasPosTargetView || hasRadiusView;

		return hasView;
	};

	moveHere (camera) {
		if (!this.hasView()) {
			return;
		}

		let view = this.scene.view;
		let animationDuration = 500;
		let easing = TWEEN.Easing.Quartic.Out;

		let endTarget;
		if (this.cameraTarget) {
			endTarget = this.cameraTarget;
		} else if (this.position) {
			endTarget = this.position;
		} else {
			endTarget = this.boundingBox.getCenter(new THREE.Vector3());
		}

		if (this.cameraPosition) {
			let endPosition = this.cameraPosition;

			Utils.moveTo(this.scene, endPosition, endTarget);
		} else if (this.radius) {
			let direction = view.direction;
			let endPosition = endTarget.clone().add(direction.multiplyScalar(-this.radius));
			let startRadius = view.radius;
			let endRadius = this.radius;

			{ // animate camera position
				let tween = new TWEEN.Tween(view.position).to(endPosition, animationDuration);
				tween.easing(easing);
				tween.start();
			}

			{ // animate radius
				let t = {x: 0};

				let tween = new TWEEN.Tween(t)
					.to({x: 1}, animationDuration)
					.onUpdate(function () {
						view.radius = this.x * endRadius + (1 - this.x) * startRadius;
					});
				tween.easing(easing);
				tween.start();
			}
		}
	};

	dispose () {
		if (this.domElement.parentElement) {
			this.domElement.parentElement.removeChild(this.domElement);
		}
	};

	toString () {
		return 'Annotation: ' + this._title;
	}
};
