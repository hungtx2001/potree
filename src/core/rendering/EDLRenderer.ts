import * as THREE from 'three';
import { PointCloudSM } from './PointCloudSM.js';
import { EyeDomeLightingMaterial } from '../materials/EyeDomeLightingMaterial.js';
import { SphereVolume } from '../tools/Volume.js';
import { Utils } from '../utils/Utils.js';
import { runtime } from '../runtime/runtime.js';
import { updatePointClouds } from './Potree_update_visibility.js';

export class EDLRenderer {
	viewer: any;
	edlMaterial: EyeDomeLightingMaterial | null;
	rtRegular!: THREE.WebGLRenderTarget;
	rtEDL!: THREE.WebGLRenderTarget;
	gl: WebGLRenderingContext | WebGL2RenderingContext;
	shadowMap: PointCloudSM;
	screenshot?: { target: THREE.WebGLRenderTarget };

	constructor(viewer: any) {
		this.viewer = viewer;
		this.edlMaterial = null;
		this.gl = viewer.renderer.getContext();
		this.shadowMap = new PointCloudSM(this.viewer.pRenderer);
	}

	initEDL(): void {
		if (this.edlMaterial != null) {
			return;
		}

		this.edlMaterial = new EyeDomeLightingMaterial();
		this.edlMaterial.depthTest = true;
		this.edlMaterial.depthWrite = true;
		this.edlMaterial.transparent = true;

		this.rtEDL = new THREE.WebGLRenderTarget(1024, 1024, {
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			format: THREE.RGBAFormat,
			type: THREE.FloatType,
			depthTexture: new THREE.DepthTexture(1024, 1024, THREE.UnsignedIntType)
		});

		this.rtRegular = new THREE.WebGLRenderTarget(1024, 1024, {
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			format: THREE.RGBAFormat,
			depthTexture: new THREE.DepthTexture(1024, 1024, THREE.UnsignedIntType)
		});
	}

	resize(width: number, height: number): void {
		if (this.screenshot) {
			width = this.screenshot.target.width;
			height = this.screenshot.target.height;
		}

		this.rtEDL.setSize(width, height);
		this.rtRegular.setSize(width, height);
	}

	makeScreenshot(camera?: THREE.Camera | null, size?: { width: number; height: number } | null): { width: number; height: number; buffer: Uint8Array } {
		const activeCam = camera || this.viewer.scene.getActiveCamera();
		const renderSize = size || this.viewer.renderer.getSize(new THREE.Vector2());

		let width = 2 * renderSize.width;
		let height = 2 * renderSize.height;

		const target = new THREE.WebGLRenderTarget(width, height, {
			format: THREE.RGBAFormat,
		});

		this.screenshot = { target };

		this.render({ camera: activeCam });

		const pixelCount = width * height;
		const buffer = new Uint8Array(4 * pixelCount);

		this.viewer.renderer.readRenderTargetPixels(target, 0, 0, width, height, buffer);

		// flip vertically
		const bytesPerLine = width * 4;
		const halfHeight = Math.floor(height / 2);
		for (let i = 0; i < halfHeight; i++) {
			const j = height - i - 1;
			const lineI = buffer.slice(i * bytesPerLine, i * bytesPerLine + bytesPerLine);
			const lineJ = buffer.slice(j * bytesPerLine, j * bytesPerLine + bytesPerLine);
			buffer.set(lineJ, i * bytesPerLine);
			buffer.set(lineI, j * bytesPerLine);
		}

		this.screenshot.target.dispose();
		delete this.screenshot;

		return { width, height, buffer };
	}

	clearTargets(): void {
		const { renderer } = this.viewer;
		const oldTarget = renderer.getRenderTarget();

		renderer.setRenderTarget(this.rtEDL);
		renderer.clear(true, true, true);

		renderer.setRenderTarget(this.rtRegular);
		renderer.clear(true, true, false);

		renderer.setRenderTarget(oldTarget);
	}

	clear(): void {
		this.initEDL();
		const { renderer, background } = this.viewer;

		if (background === 'skybox' || background === 'gradient') {
			renderer.setClearColor(0x000000, 0);
		} else if (background === 'black') {
			renderer.setClearColor(0x000000, 1);
		} else if (background === 'white') {
			renderer.setClearColor(0xFFFFFF, 1);
		} else {
			renderer.setClearColor(0x000000, 0);
		}

		renderer.clear();
		this.clearTargets();
	}

	renderShadowMap(visiblePointClouds: any[], camera: THREE.Camera, lights: any[]): void {
		const { viewer } = this;
		const doShadows = lights.length > 0 && !(lights[0].disableShadowUpdates);
		if (doShadows) {
			const light = lights[0];
			this.shadowMap.setLight(light);

			const originalAttributes = new Map();
			for (const pointcloud of viewer.scene.pointclouds) {
				originalAttributes.set(pointcloud, pointcloud.material.activeAttributeName);
				pointcloud.material.disableEvents();
				pointcloud.material.activeAttributeName = 'depth';
			}

			this.shadowMap.render(viewer.scene.scenePointCloud, camera);

			for (const pointcloud of visiblePointClouds) {
				const originalAttribute = originalAttributes.get(pointcloud);
				pointcloud.material.activeAttributeName = originalAttribute;
				pointcloud.material.enableEvents();
			}

			if (viewer.shadowTestCam) {
				viewer.shadowTestCam.updateMatrixWorld();
				viewer.shadowTestCam.matrixWorldInverse.copy(viewer.shadowTestCam.matrixWorld).invert();
				viewer.shadowTestCam.updateProjectionMatrix();
			}
		}
	}

	render(params: { camera?: THREE.Camera } = {}): void {
		this.initEDL();

		const viewer = this.viewer;
		const camera = params.camera ? params.camera : viewer.scene.getActiveCamera();
		const { width, height } = viewer.renderer.getSize(new THREE.Vector2());

		viewer.dispatchEvent({ type: 'render.pass.begin', viewer });

		this.resize(width, height);

		const visiblePointClouds = viewer.scene.pointclouds.filter((pc: any) => pc.visible);

		if (this.screenshot) {
			const oldBudget = runtime.pointBudget;
			runtime.pointBudget = Math.max(10 * 1000 * 1000, 2 * oldBudget);
			updatePointClouds(viewer.scene.pointclouds, camera, viewer.renderer);
			runtime.pointBudget = oldBudget;
		}

		const lights: any[] = [];
		viewer.scene.scene.traverse((node: any) => {
			if (node.type === 'SpotLight') {
				lights.push(node);
			}
		});

		if (viewer.background === 'skybox' && viewer.skybox) {
			viewer.skybox.camera.rotation.copy(viewer.scene.cameraP.rotation);
			viewer.skybox.camera.fov = viewer.scene.cameraP.fov;
			viewer.skybox.camera.aspect = viewer.scene.cameraP.aspect;

			viewer.skybox.parent.rotation.x = 0;
			viewer.skybox.parent.updateMatrixWorld();

			viewer.skybox.camera.updateProjectionMatrix();
			viewer.renderer.render(viewer.skybox.scene, viewer.skybox.camera);
		} else if (viewer.background === 'gradient') {
			viewer.renderer.render(viewer.scene.sceneBG, viewer.scene.cameraBG);
		}

		this.renderShadowMap(visiblePointClouds, camera, lights);

		// COLOR & DEPTH PASS
		for (const pointcloud of visiblePointClouds) {
			const octreeSize = pointcloud.pcoGeometry.boundingBox.getSize(new THREE.Vector3()).x;

			const material = pointcloud.material;
			material.weighted = false;
			material.useLogarithmicDepthBuffer = false;
			material.useEDL = true;

			material.screenWidth = width;
			material.screenHeight = height;
			material.uniforms.visibleNodes.value = pointcloud.material.visibleNodesTexture;
			material.uniforms.octreeSize.value = octreeSize;
			material.spacing = pointcloud.pcoGeometry.spacing;
		}

		viewer.renderer.setRenderTarget(this.rtEDL);

		if (lights.length > 0) {
			viewer.pRenderer.render(viewer.scene.scenePointCloud, camera, this.rtEDL, {
				clipSpheres: viewer.scene.volumes.filter((v: any) => (v instanceof SphereVolume)),
				shadowMaps: [this.shadowMap],
				transparent: false,
			});
		} else {
			viewer.pRenderer.render(viewer.scene.scenePointCloud, camera, this.rtEDL, {
				clipSpheres: viewer.scene.volumes.filter((v: any) => (v instanceof SphereVolume)),
				transparent: false,
			});
		}

		viewer.dispatchEvent({ type: 'render.pass.scene', viewer, renderTarget: this.rtRegular });
		viewer.renderer.setRenderTarget(null);
		viewer.renderer.render(viewer.scene.scene, camera);

		// EDL PASS
		if (this.edlMaterial) {
			const uniforms = this.edlMaterial.uniforms;

			uniforms.screenWidth.value = width;
			uniforms.screenHeight.value = height;

			const proj = camera.projectionMatrix;
			const projArray = new Float32Array(16);
			projArray.set(proj.elements);

			uniforms.uNear.value = camera.near;
			uniforms.uFar.value = camera.far;
			uniforms.uEDLColor.value = this.rtEDL.texture;
			uniforms.uEDLDepth.value = this.rtEDL.depthTexture;
			uniforms.uProj.value = projArray;

			uniforms.edlStrength.value = viewer.edlStrength;
			uniforms.radius.value = viewer.edlRadius;
			uniforms.opacity.value = viewer.edlOpacity;

			Utils.screenPass.render(viewer.renderer, this.edlMaterial);

			if (this.screenshot) {
				Utils.screenPass.render(viewer.renderer, this.edlMaterial, this.screenshot.target);
			}
		}

		viewer.dispatchEvent({ type: 'render.pass.scene', viewer });

		viewer.renderer.clearDepth();

		viewer.transformationTool?.update();

		viewer.dispatchEvent({ type: 'render.pass.perspective_overlay', viewer });

		if (viewer.controls?.sceneControls) {
			viewer.renderer.render(viewer.controls.sceneControls, camera);
		}
		if (viewer.clippingTool?.sceneVolume) {
			viewer.renderer.render(viewer.clippingTool.sceneVolume, camera);
		}
		if (viewer.transformationTool?.scene) {
			viewer.renderer.render(viewer.transformationTool.scene, camera);
		}

		viewer.dispatchEvent({ type: 'render.pass.end', viewer });
	}
}
