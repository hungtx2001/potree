import * as THREE from 'three';
import { ClipVolume } from './ClipVolume.js';
import { PolygonClipVolume } from './PolygonClipVolume.js';
import { EventDispatcher } from '../EventDispatcher.js';

export class ClippingTool extends EventDispatcher {
	viewer: any;
	maxPolygonVertices: number;
	sceneMarker: THREE.Scene;
	sceneVolume: THREE.Scene;
	scene: any;
	onRemove: (e: any) => void;
	onAdd: (e: any) => void;

	constructor(viewer: any) {
		super();

		this.viewer = viewer;
		this.maxPolygonVertices = 8;

		this.addEventListener('start_inserting_clipping_volume', () => {
			this.viewer.dispatchEvent({
				type: 'cancel_insertions'
			});
		});

		this.sceneMarker = new THREE.Scene();
		this.sceneVolume = new THREE.Scene();
		this.sceneVolume.name = 'scene_clip_volume';
		this.viewer.inputHandler?.registerInteractiveScene(this.sceneVolume);

		this.onRemove = (e: any) => {
			this.sceneVolume.remove(e.volume);
		};

		this.onAdd = (e: any) => {
			this.sceneVolume.add(e.volume);
		};

		this.viewer.inputHandler?.addEventListener('delete', (e: any) => {
			const volumes = e.selection.filter((item: any) => (item instanceof ClipVolume));
			volumes.forEach((item: any) => this.viewer.scene.removeClipVolume(item));
			const polyVolumes = e.selection.filter((item: any) => (item instanceof PolygonClipVolume));
			polyVolumes.forEach((item: any) => this.viewer.scene.removePolygonClipVolume(item));
		});
	}

	setScene(scene: any): void {
		if (this.scene === scene) {
			return;
		}

		if (this.scene) {
			this.scene.removeEventListeners('clip_volume_added', this.onAdd);
			this.scene.removeEventListeners('clip_volume_removed', this.onRemove);
			this.scene.removeEventListeners('polygon_clip_volume_added', this.onAdd);
			this.scene.removeEventListeners('polygon_clip_volume_removed', this.onRemove);
		}

		this.scene = scene;

		this.scene.addEventListener('clip_volume_added', this.onAdd);
		this.scene.addEventListener('clip_volume_removed', this.onRemove);
		this.scene.addEventListener('polygon_clip_volume_added', this.onAdd);
		this.scene.addEventListener('polygon_clip_volume_removed', this.onRemove);
	}

	startInsertion(args: { type?: any } = {}): PolygonClipVolume | null {
		const type = args.type || null;
		if (!type) return null;

		const domElement = this.viewer.renderer.domElement;
		const canvasSize = this.viewer.renderer.getSize(new THREE.Vector2());

		const template = document.createElement('template');
		template.innerHTML = `
		<svg height="${canvasSize.height}" width="${canvasSize.width}" style="position:absolute; pointer-events: none">
			<defs>
				 <marker id="diamond" markerWidth="24" markerHeight="24" refX="12" refY="12"
						markerUnits="userSpaceOnUse">
					<circle cx="12" cy="12" r="6" fill="white" stroke="black" stroke-width="3"/>
				</marker>
			</defs>
			<polyline fill="none" stroke="black" 
				style="stroke:rgb(0, 0, 0); stroke-width:6;"
				stroke-dasharray="9, 6"
				stroke-dashoffset="2" />
			<polyline fill="none" stroke="black" 
				style="stroke:rgb(255, 255, 255); stroke-width:2;"
				stroke-dasharray="5, 10"
				marker-start="url(#diamond)" 
				marker-mid="url(#diamond)" 
				marker-end="url(#diamond)" />
		</svg>`.trim();
		const svg = template.content.firstElementChild as SVGSVGElement | null;
		if (domElement.parentElement && svg) {
			domElement.parentElement.appendChild(svg);
		}

		const polyClipVol = new PolygonClipVolume(this.viewer.scene.getActiveCamera().clone());

		this.dispatchEvent({ type: 'start_inserting_clipping_volume' });

		this.viewer.scene?.addPolygonClipVolume(polyClipVol);
		this.sceneMarker.add(polyClipVol);

		const cancel: { callback: ((e?: any) => void) | null } = {
			callback: null
		};

		const insertionCallback = (e: MouseEvent) => {
			if (e.button === 0) { // MOUSE.LEFT
				polyClipVol.addMarker();

				// SVG Screen Line
				if (svg) {
					svg.querySelectorAll('polyline').forEach((target: SVGPolylineElement) => {
						const newPoint = svg.createSVGPoint();
						newPoint.x = e.offsetX;
						newPoint.y = e.offsetY;
						target.points.appendItem(newPoint);
					});
				}

				if (polyClipVol.markers.length > this.maxPolygonVertices) {
					if (cancel.callback) cancel.callback();
				}

				this.viewer.inputHandler?.startDragging(
					polyClipVol.markers[polyClipVol.markers.length - 1]
				);
			} else if (e.button === 2) { // MOUSE.RIGHT
				if (cancel.callback) cancel.callback(e);
			}
		};

		cancel.callback = () => {
			if (svg) {
				svg.remove();
			}

			if (polyClipVol.markers.length > 3) {
				polyClipVol.removeLastMarker();
				polyClipVol.initialized = true;
			} else {
				this.viewer.scene?.removePolygonClipVolume(polyClipVol);
			}

			this.viewer.renderer.domElement.removeEventListener('mouseup', insertionCallback, true);
			if (cancel.callback) {
				this.viewer.removeEventListener('cancel_insertions', cancel.callback);
			}
			if (this.viewer.inputHandler) {
				this.viewer.inputHandler.enabled = true;
			}
		};

		this.viewer.addEventListener('cancel_insertions', cancel.callback);
		this.viewer.renderer.domElement.addEventListener('mouseup', insertionCallback, true);
		if (this.viewer.inputHandler) {
			this.viewer.inputHandler.enabled = false;
		}

		polyClipVol.addMarker();
		this.viewer.inputHandler?.startDragging(
			polyClipVol.markers[polyClipVol.markers.length - 1]
		);

		return polyClipVol;
	}

	update(): void {}
}
