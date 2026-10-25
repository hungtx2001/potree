import * as THREE from 'three';
import { Volume, BoxVolume, VolumeArgs } from './Volume.js';
import { Utils } from '../utils/Utils.js';
import { EventDispatcher } from '../EventDispatcher.js';

export class VolumeTool extends EventDispatcher {
	public viewer: any;
	public renderer: any;
	public scene: THREE.Scene;
	public onRemove: (e: any) => void;
	public onAdd: (e: any) => void;

	constructor(viewer: any) {
		super();

		this.viewer = viewer;
		this.renderer = viewer.renderer;

		this.addEventListener('start_inserting_volume', () => {
			this.viewer.dispatchEvent({
				type: 'cancel_insertions'
			});
		});

		this.scene = new THREE.Scene();
		this.scene.name = 'scene_volume';
		this.viewer.inputHandler.registerInteractiveScene(this.scene);

		this.onRemove = (e: any) => {
			this.scene.remove(e.volume);
		};

		this.onAdd = (e: any) => {
			this.scene.add(e.volume);
		};

		for (const volume of viewer.scene.volumes) {
			this.onAdd({ volume });
		}

		this.viewer.inputHandler.addEventListener('delete', (e: any) => {
			const volumes = e.selection.filter((item: any) => item instanceof Volume);
			volumes.forEach((vol: Volume) => this.viewer.scene.removeVolume(vol));
		});

		viewer.addEventListener('update', this.update.bind(this));
		viewer.addEventListener('render.pass.scene', (e: any) => this.render(e));
		viewer.addEventListener('scene_changed', this.onSceneChange.bind(this));

		viewer.scene.addEventListener('volume_added', this.onAdd);
		viewer.scene.addEventListener('volume_removed', this.onRemove);
	}

	onSceneChange(e: any): void {
		if (e.oldScene) {
			e.oldScene.removeEventListener('volume_added', this.onAdd);
			e.oldScene.removeEventListener('volume_removed', this.onRemove);
		}

		e.scene.addEventListener('volume_added', this.onAdd);
		e.scene.addEventListener('volume_removed', this.onRemove);
	}

	startInsertion(args: VolumeArgs = {}): Volume {
		let volume: Volume;
		if (args.type) {
			volume = new args.type();
		} else {
			volume = new BoxVolume();
		}

		volume.clip = args.clip || false;
		volume.name = args.name || 'Volume';

		this.dispatchEvent({
			type: 'start_inserting_volume',
			volume: volume
		});

		this.viewer.scene.addVolume(volume);
		this.scene.add(volume);

		const cancel: { callback: any } = {
			callback: null
		};

		const drag = (e: any) => {
			const camera = this.viewer.scene.getActiveCamera();
			const I = Utils.getMousePointCloudIntersection(
				e.drag.end,
				this.viewer.scene.getActiveCamera(),
				this.viewer,
				this.viewer.scene.pointclouds,
				{ pickClipped: false }
			);

			if (I) {
				volume.position.copy(I.location);
				const wp = volume.getWorldPosition(new THREE.Vector3()).applyMatrix4(camera.matrixWorldInverse);
				const w = Math.abs(wp.z / 5);
				volume.scale.set(w, w, w);
			}
		};

		const drop = () => {
			(volume as any).removeEventListener('drag', drag);
			cancel.callback();
		};

		cancel.callback = () => {
			this.viewer.removeEventListener('cancel_insertions', cancel.callback);
			this.viewer.inputHandler.removeEventListener('drop', drop);
		};

		this.viewer.addEventListener('cancel_insertions', cancel.callback);
		this.viewer.inputHandler.addEventListener('drop', drop);
		(volume as any).addEventListener('drag', drag);

		this.viewer.inputHandler.startDragging(volume);
		return volume;
	}

	update(): void {
		const renderAreaSize = this.renderer.getSize(new THREE.Vector2());
		const clientWidth = renderAreaSize.width;
		const clientHeight = renderAreaSize.height;

		const volumes = this.viewer.scene.volumes;
		for (const volume of volumes) {
			const label = volume.label;
			if (!label) continue;

			if (volume.showVolumeLabel) {
				label.visible = true;
				const volVal = volume.getVolume();
				let txt = Utils.addCommas(volVal.toFixed(2));
				if (this.viewer.lengthUnit) {
					txt += ` ${this.viewer.lengthUnit.code}\u00B3`;
				}
				label.setText(txt);

				const camera = this.viewer.scene.getActiveCamera();
				const distance = label.position.distanceTo(camera.position);
				const pr = Utils.projectedRadius(1, camera, distance, clientWidth, clientHeight);
				const scale = (70 / pr);
				label.scale.set(scale, scale, scale);
			} else {
				label.visible = false;
			}
		}
	}

	render(e?: any): void {
		const camera = this.viewer.scene.getActiveCamera();
		if (e?.renderTarget) {
			this.viewer.renderer.setRenderTarget(e.renderTarget);
			this.viewer.renderer.render(this.scene, camera);
			this.viewer.renderer.setRenderTarget(null);
		} else {
			this.viewer.renderer.render(this.scene, camera);
		}
	}
}
