import * as THREE from 'three';
export * from './core';
import { PointCloudOctree } from './core';

export declare class Scene {
	scene: THREE.Scene;
	scenePointCloud: THREE.Scene;
	cameraP: THREE.PerspectiveCamera;
	cameraO: THREE.OrthographicCamera;
	camera: THREE.Camera;
	pointclouds: PointCloudOctree[];
	addPointCloud(pointcloud: PointCloudOctree): void;
	removePointCloud(pointcloud: PointCloudOctree): void;
}

export declare class Viewer {
	constructor(domElement: HTMLElement, args?: Record<string, any>);
	renderArea: HTMLElement;
	scene: Scene;
	renderer: THREE.WebGLRenderer;
	setEDLEnabled(enabled: boolean): void;
	setFOV(fov: number): void;
	setPointBudget(budget: number): void;
	setBackground(bg: 'skybox' | 'gradient' | 'black' | 'white' | 'none'): void;
	setDescription(desc: string): void;
	loadSettingsFromURL(): void;
	loadGUI(callback?: () => void): Promise<void>;
	toggleSidebar(): void;
	setLanguage(lang: string): void;
	fitToScreen(factor?: number): void;
}
