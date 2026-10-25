import * as THREE from 'three';
import { Utils } from '../utils/Utils.js';
import { runtime } from '../runtime/runtime.js';

export class Compass {
	viewer: any;
	visible: boolean;
	dom: HTMLImageElement;

	constructor(viewer: any) {
		this.viewer = viewer;

		this.visible = false;
		this.dom = this.createElement();

		viewer.addEventListener('update', () => {
			const direction = viewer.scene.view.direction.clone();
			direction.z = 0;
			direction.normalize();

			const camera = viewer.scene.getActiveCamera();

			const p1 = camera.getWorldPosition(new THREE.Vector3());
			const p2 = p1.clone().add(direction);

			const projection = viewer.getProjection?.();
			const azimuth = Utils.computeAzimuth(p1, p2, projection);

			this.dom.style.transform = `rotateZ(${-azimuth}rad)`;
		});

		this.dom.addEventListener('click', () => {
			viewer.setTopView?.();
		});

		if (viewer.renderArea) {
			viewer.renderArea.appendChild(this.dom);
		}

		this.setVisible(this.visible);
	}

	setVisible(visible: boolean): void {
		this.visible = visible;
		this.dom.style.display = visible ? '' : 'none';
	}

	isVisible(): boolean {
		return this.visible;
	}

	createElement(): HTMLImageElement {
		const img = document.createElement('img');
		img.style.cssText = 'position: absolute; top: 10px; right: 10px; z-index: 10000; width: 64px; cursor: pointer;';
		const res = runtime.resourcePath || './resources';
		img.src = `${res}/images/compas.svg`;
		return img;
	}
}
