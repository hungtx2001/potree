
import * as THREE from 'three';

import {Utils} from "../utils.js";
import {runtime} from "../runtime.js";

export class Compass{

	constructor(viewer){
		this.viewer = viewer;

		this.visible = false;
		this.dom = this.createElement();

		viewer.addEventListener("update", () => {
			const direction = viewer.scene.view.direction.clone();
			direction.z = 0;
			direction.normalize();

			const camera = viewer.scene.getActiveCamera();

			const p1 = camera.getWorldPosition(new THREE.Vector3());
			const p2 = p1.clone().add(direction);

			const projection = viewer.getProjection();
			const azimuth = Utils.computeAzimuth(p1, p2, projection);
			
			this.dom.style.transform = `rotateZ(${-azimuth}rad)`;
		});

		this.dom.addEventListener('click', () => {
			viewer.setTopView();
		});

		if (viewer.renderArea) {
			viewer.renderArea.appendChild(this.dom);
		}

		this.setVisible(this.visible);
	}

	setVisible(visible){
		this.visible = visible;
		this.dom.style.display = visible ? "" : "none";
	}

	isVisible(){
		return this.visible;
	}

	createElement(){
		const img = document.createElement('img');
		img.style.cssText = "position: absolute; top: 10px; right: 10px; z-index: 10000; width: 64px; cursor: pointer;";
		const res = runtime.resourcePath || './resources';
		img.src = `${res}/images/compas.svg`;
		return img;
	}

};