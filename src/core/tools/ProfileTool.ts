import * as THREE from 'three';
import { Profile } from './Profile.js';
import { Utils } from '../utils/Utils.js';
import { EventDispatcher } from '../EventDispatcher.js';

export class ProfileTool extends EventDispatcher {
	viewer: any;
	renderer: any;
	scene: THREE.Scene;
	light: THREE.PointLight;
	onRemove: (e: any) => void;
	onAdd: (e: any) => void;

	constructor(viewer: any) {
		super();

		this.viewer = viewer;
		this.renderer = viewer.renderer;

		this.addEventListener('start_inserting_profile', () => {
			this.viewer.dispatchEvent({
				type: 'cancel_insertions'
			});
		});

		this.scene = new THREE.Scene();
		this.scene.name = 'scene_profile';
		this.light = new THREE.PointLight(0xffffff, 1.0);
		this.scene.add(this.light);

		this.viewer.inputHandler?.registerInteractiveScene(this.scene);

		this.onRemove = (e: any) => this.scene.remove(e.profile);
		this.onAdd = (e: any) => this.scene.add(e.profile);

		if (viewer.scene?.profiles) {
			for (const profile of viewer.scene.profiles) {
				this.onAdd({ profile });
			}
		}

		viewer.addEventListener('update', this.update.bind(this));
		viewer.addEventListener('render.pass.perspective_overlay', this.render.bind(this));
		viewer.addEventListener('scene_changed', this.onSceneChange.bind(this));

		viewer.scene?.addEventListener('profile_added', this.onAdd);
		viewer.scene?.addEventListener('profile_removed', this.onRemove);
	}

	onSceneChange(e: any): void {
		if (e.oldScene) {
			e.oldScene.removeEventListeners('profile_added', this.onAdd);
			e.oldScene.removeEventListeners('profile_removed', this.onRemove);
		}

		e.scene?.addEventListener('profile_added', this.onAdd);
		e.scene?.addEventListener('profile_removed', this.onRemove);
	}

	startInsertion(args: { name?: string } = {}): Profile {
		const domElement = this.viewer.renderer.domElement;

		const profile = new Profile();
		profile.name = args.name || 'Profile';

		this.dispatchEvent({
			type: 'start_inserting_profile',
			profile
		});

		this.scene.add(profile);

		const cancel: { callback: ((e?: any) => void) | null } = {
			callback: null
		};

		const insertionCallback = (e: MouseEvent) => {
			if (e.button === 0) { // MOUSE.LEFT
				if (profile.points.length <= 1) {
					const camera = this.viewer.scene.getActiveCamera();
					const distance = camera.position.distanceTo(profile.points[0]);
					const clientSize = this.viewer.renderer.getSize(new THREE.Vector2());
					const pr = Utils.projectedRadius(1, camera, distance, clientSize.width, clientSize.height);
					const width = (10 / pr);

					profile.setWidth(width);
				}

				profile.addMarker(profile.points[profile.points.length - 1].clone());

				this.viewer.inputHandler?.startDragging(
					profile.spheres[profile.spheres.length - 1]
				);
			} else if (e.button === 2) { // MOUSE.RIGHT
				if (cancel.callback) {
					cancel.callback();
				}
			}
		};

		cancel.callback = () => {
			profile.removeMarker(profile.points.length - 1);
			domElement.removeEventListener('mouseup', insertionCallback, false);
			if (cancel.callback) {
				this.viewer.removeEventListener('cancel_insertions', cancel.callback);
			}
		};

		this.viewer.addEventListener('cancel_insertions', cancel.callback);
		domElement.addEventListener('mouseup', insertionCallback, false);

		profile.addMarker(new THREE.Vector3(0, 0, 0));
		this.viewer.inputHandler?.startDragging(
			profile.spheres[profile.spheres.length - 1]
		);

		this.viewer.scene?.addProfile(profile);

		return profile;
	}

	update(): void {
		const camera = this.viewer.scene.getActiveCamera();
		const profiles = this.viewer.scene.profiles;
		const renderAreaSize = this.viewer.renderer.getSize(new THREE.Vector2());
		const clientWidth = renderAreaSize.width;
		const clientHeight = renderAreaSize.height;

		this.light.position.copy(camera.position);

		// make size independent of distance
		if (profiles) {
			for (const profile of profiles) {
				for (const sphere of profile.spheres) {
					const distance = camera.position.distanceTo(sphere.getWorldPosition(new THREE.Vector3()));
					const pr = Utils.projectedRadius(1, camera, distance, clientWidth, clientHeight);
					const scale = (15 / pr);
					sphere.scale.set(scale, scale, scale);
				}
			}
		}
	}

	render(): void {
		this.viewer.renderer.render(this.scene, this.viewer.scene.getActiveCamera());
	}
}
