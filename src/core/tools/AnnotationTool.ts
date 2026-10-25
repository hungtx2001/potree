import * as THREE from 'three';
import { Annotation, AnnotationArgs } from './Annotation.js';
import { Utils } from '../utils/Utils.js';
import { EventDispatcher } from '../EventDispatcher.js';

export class AnnotationTool extends EventDispatcher {
	public viewer: any;
	public renderer: any;
	public sg: THREE.SphereGeometry;
	public sm: THREE.MeshNormalMaterial;
	public s: THREE.Mesh;

	constructor(viewer: any) {
		super();

		this.viewer = viewer;
		this.renderer = viewer.renderer;

		this.sg = new THREE.SphereGeometry(0.1);
		this.sm = new THREE.MeshNormalMaterial();
		this.s = new THREE.Mesh(this.sg, this.sm);
	}

	startInsertion(args: AnnotationArgs = {}): Annotation {
		const domElement = this.viewer.renderer.domElement;

		const annotation = new Annotation({
			position: [589748.270, 231444.540, 753.675],
			title: 'Annotation Title',
			description: 'Annotation Description',
			...args
		});
		this.dispatchEvent({ type: 'start_inserting_annotation', annotation });

		const annotations = this.viewer.scene.annotations;
		annotations.add(annotation);

		const callbacks: { cancel: any; finish: any } = {
			cancel: null,
			finish: null,
		};

		const insertionCallback = (e: MouseEvent) => {
			if (e.button === 0) {
				callbacks.finish();
			} else if (e.button === 2) {
				callbacks.cancel();
			}
		};

		callbacks.cancel = () => {
			annotations.remove(annotation);
			domElement.removeEventListener('mouseup', insertionCallback, true);
		};

		callbacks.finish = () => {
			domElement.removeEventListener('mouseup', insertionCallback, true);
		};

		domElement.addEventListener('mouseup', insertionCallback, true);

		const drag = (e: any) => {
			const I = Utils.getMousePointCloudIntersection(
				e.drag.end,
				this.viewer.scene.getActiveCamera(),
				this.viewer,
				this.viewer.scene.pointclouds,
				{ pickClipped: true }
			);

			if (I) {
				this.s.position.copy(I.location);
				if (annotation.position) {
					annotation.position.copy(I.location);
				} else {
					annotation.position = I.location.clone();
				}
			}
		};

		const drop = () => {
			this.viewer.scene.scene.remove(this.s);
			(this.s as any).removeEventListener('drag', drag);
			(this.s as any).removeEventListener('drop', drop);
		};

		(this.s as any).addEventListener('drag', drag);
		(this.s as any).addEventListener('drop', drop);

		this.viewer.scene.scene.add(this.s);
		this.viewer.inputHandler.startDragging(this.s);

		return annotation;
	}

	update(): void {}

	render(): void {}
}
