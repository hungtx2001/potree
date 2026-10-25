import * as THREE from 'three';
import { SphereVolume } from '../tools/Volume.js';

export class StandardRenderer {
	viewer: any;
	renderer: THREE.WebGLRenderer;
	dummyScene: THREE.Scene;
	dummyMesh: THREE.Mesh;

	constructor(viewer: any) {
		this.viewer = viewer;
		this.renderer = viewer.renderer;

		const dummyScene = new THREE.Scene();
		const geometry = new THREE.SphereGeometry(0.001, 2, 2);
		const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
		mesh.position.set(36453, 35163, 764712);
		dummyScene.add(mesh);

		this.dummyMesh = mesh;
		this.dummyScene = dummyScene;
	}

	clearTargets(): void {}

	clear(): void {
		const { viewer, renderer } = this;

		if (viewer.background === 'skybox') {
			renderer.setClearColor(0xff0000, 1);
		} else if (viewer.background === 'gradient') {
			renderer.setClearColor(0x00ff00, 1);
		} else if (viewer.background === 'black') {
			renderer.setClearColor(0x000000, 1);
		} else if (viewer.background === 'white') {
			renderer.setClearColor(0xFFFFFF, 1);
		} else {
			renderer.setClearColor(0x000000, 0);
		}

		renderer.clear();
	}

	render(params: { camera?: THREE.Camera; viewport?: [number, number, number, number] } = {}): void {
		const { viewer, renderer } = this;
		const camera = params.camera ? params.camera : viewer.scene.getActiveCamera();

		viewer.dispatchEvent({ type: 'render.pass.begin', viewer });

		// render skybox
		if (viewer.background === 'skybox' && viewer.skybox) {
			viewer.skybox.camera.rotation.copy(viewer.scene.cameraP.rotation);
			viewer.skybox.camera.fov = viewer.scene.cameraP.fov;
			viewer.skybox.camera.aspect = viewer.scene.cameraP.aspect;

			viewer.skybox.parent.rotation.x = 0;
			viewer.skybox.parent.updateMatrixWorld();

			viewer.skybox.camera.updateProjectionMatrix();
			renderer.render(viewer.skybox.scene, viewer.skybox.camera);
		} else if (viewer.background === 'gradient') {
			renderer.render(viewer.scene.sceneBG, viewer.scene.cameraBG);
		}

		if (viewer.scene?.pointclouds) {
			for (const pointcloud of viewer.scene.pointclouds) {
				const { material } = pointcloud;
				if (material) {
					material.useEDL = false;
				}
			}
		}

		viewer.pRenderer.render(viewer.scene.scenePointCloud, camera, null, {
			clipSpheres: viewer.scene.volumes.filter((v: any) => (v instanceof SphereVolume)),
		});

		// render scene
		renderer.render(viewer.scene.scene, camera);

		viewer.dispatchEvent({ type: 'render.pass.scene', viewer });

		viewer.clippingTool?.update();
		if (viewer.clippingTool?.sceneMarker) {
			renderer.render(viewer.clippingTool.sceneMarker, viewer.scene.cameraScreenSpace);
		}
		if (viewer.clippingTool?.sceneVolume) {
			renderer.render(viewer.clippingTool.sceneVolume, camera);
		}

		if (viewer.controls?.sceneControls) {
			renderer.render(viewer.controls.sceneControls, camera);
		}

		renderer.clearDepth();

		viewer.transformationTool?.update();

		viewer.dispatchEvent({ type: 'render.pass.perspective_overlay', viewer });

		viewer.dispatchEvent({ type: 'render.pass.end', viewer });
	}
}

export { StandardRenderer as PotreeRenderer };
