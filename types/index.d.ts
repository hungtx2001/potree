import * as THREE from 'three';
export * from './core';
import { PointCloudOctree, PotreeStore } from './core';

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

export declare class FloatingToolbar {
	constructor(viewer: Viewer);
	element: HTMLElement;
	destroy(): void;
}

export declare class ToggleGroup {
	constructor(options?: any);
	element: HTMLElement;
	setValue(value: string, trigger?: boolean): void;
	getValue(): string;
	static upgrade(target: any, options?: any): ToggleGroup;
	static installJQueryPlugin($: any): void;
}

export declare class ModernSlider {
	constructor(options?: any);
	element: HTMLElement;
	setValue(value: number, trigger?: boolean): void;
	getValue(): number;
	setValues(values: number[], trigger?: boolean): void;
	getValues(): number[];
	static attach(target: any, options?: any): ModernSlider;
	static installJQueryPlugin($: any): void;
}

export declare class ModernColorPicker {
	constructor(options?: any);
	element: HTMLElement;
	setColor(hex: string): void;
	getColor(): any;
	static attach(target: any, options?: any): ModernColorPicker;
	static installJQueryPlugin($: any): void;
}

export declare class SceneTree {
	constructor(options?: any);
	element: HTMLElement;
	createNode(parentId: string, data: any): string;
	checkNode(id: string): void;
	uncheckNode(id: string): void;
	selectNode(id: string): void;
	deselectAll(): void;
	deleteNode(id: string): void;
	static installJQueryPlugin($: any): void;
}

export declare class CesiumControls {
	constructor(viewer: Viewer, cesiumViewer: any, projection: string, cesiumLib?: any);
	setToolActive(active: boolean): void;
	flyToPointCloud(duration?: number): Promise<void>;
	destroy(): void;
}

export declare class Viewer {
	constructor(domElement: HTMLElement, args?: Record<string, any>);
	renderArea: HTMLElement;
	scene: Scene;
	renderer: THREE.WebGLRenderer;
	store: PotreeStore;
	floatingToolbar?: FloatingToolbar;
	cesiumControls?: CesiumControls;
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
	setCesiumViewer(cesiumViewer: any, projection: string, cesiumLib?: any): CesiumControls;
	_lockProjectionZone(projection: string): void;
	destroy(): void;
}

