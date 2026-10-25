import * as THREE from 'three';
import { EventDispatcher } from '../core/EventDispatcher.js';
import { Scene } from '../core/Scene.js';
import { PotreeStore } from './store/PotreeStore.js';
import { CesiumControls } from '../core/navigation/CesiumControls.js';
import {
	ClippingTool,
	TransformationTool,
	MeasuringTool,
	ProfileTool,
	VolumeTool,
	Compass
} from '../core/tools/index.js';
import {
	InputHandler,
	NavigationCube
} from '../core/navigation/index.js';
import {
	ClipTask,
	ClipMethod,
	CameraMode,
	LengthUnits,
	ElevationGradientRepeat
} from '../core/types.js';

export interface ViewerArgs {
	onPointCloudLoaded?: (e: any) => void;
	noDragAndDrop?: boolean;
	[key: string]: any;
}

export declare class Viewer extends EventDispatcher {
	renderArea: HTMLElement | null;
	store: PotreeStore;
	guiLoaded: boolean;
	guiLoadTasks: any[];
	onVrListeners: any[];
	cesiumControls: CesiumControls | null;
	messages: any[];
	elMessages: HTMLElement;
	descriptionContainer: HTMLElement | null;
	annotationContainer: HTMLElement | null;
	quickButtonsContainer: HTMLElement | null;
	pointCloudLoadedCallback: (e: any) => void;
	server: any;
	fov: number;
	isFlipYZ: boolean;
	useDEMCollisions: boolean;
	generateDEM: boolean;
	minNodeSize: number;
	edlStrength: number;
	edlRadius: number;
	edlOpacity: number;
	useEDL: boolean;
	description: string;
	classifications: Record<string | number, any>;
	moveSpeed: number;
	lengthUnit: LengthUnits;
	lengthUnitDisplay: LengthUnits;
	showBoundingBox: boolean;
	showAnnotations: boolean;
	freeze: boolean;
	clipTask: ClipTask;
	clipMethod: ClipMethod;
	elevationGradientRepeat: ElevationGradientRepeat;
	filterReturnNumberRange: [number, number];
	filterNumberOfReturnsRange: [number, number];
	filterGPSTimeRange: [number, number];
	filterPointSourceIDRange: [number, number];
	potreeRenderer: any;
	edlRenderer: any;
	renderer: THREE.WebGLRenderer;
	pRenderer: any;
	scene: Scene;
	sceneVR: THREE.Scene | null;
	overlay: THREE.Scene | null;
	overlayCamera: THREE.Camera | null;
	inputHandler: InputHandler;
	controls: any;
	clippingTool: ClippingTool;
	transformationTool: TransformationTool;
	navigationCube: NavigationCube;
	compass: Compass;
	measuringTool: MeasuringTool;
	profileTool: ProfileTool;
	volumeTool: VolumeTool;
	skybox: any;
	clock: THREE.Clock;
	background: string | null;

	constructor(domElement: HTMLElement | null, args?: ViewerArgs);

	setCesiumViewer(cesiumViewer: any): CesiumControls;
	_lockProjectionZone(proj: string): void;
	getProjection(): string | null;
	destroy(): void;

	setScene(scene: Scene): void;
	getPointBudget(): number;
	setPointBudget(budget: number): void;
	getFOV(): number;
	setFOV(fov: number): void;
	getEDLEnabled(): boolean;
	setEDLEnabled(enabled: boolean): void;
	getEDLRadius(): number;
	setEDLRadius(radius: number): void;
	getEDLStrength(): number;
	setEDLStrength(strength: number): void;
	getEDLOpacity(): number;
	setEDLOpacity(opacity: number): void;
	getBackground(): string | null;
	setBackground(bg: string | null): void;
	getMinNodeSize(): number;
	setMinNodeSize(size: number): void;
	getShowBoundingBox(): boolean;
	setShowBoundingBox(show: boolean): void;
	getMoveSpeed(): number;
	setMoveSpeed(speed: number): void;
	setLengthUnit(unit: LengthUnits): void;
	setLengthUnitDisplay(unit: LengthUnits): void;
	setElevationGradientRepeat(repeat: ElevationGradientRepeat): void;
	setClipTask(task: ClipTask): void;
	setClipMethod(method: ClipMethod): void;
	setClassifications(classifications: any): void;
	setClassification(classification: any): void;
	setFilterReturnNumberRange(range: [number, number]): void;
	setFilterNumberOfReturnsRange(range: [number, number]): void;
	setFilterGPSTimeRange(range: [number, number]): void;
	setFilterPointSourceIDRange(range: [number, number]): void;

	fitToScreen(object?: any, factor?: number): void;
	zoomTo(object: any, factor?: number, duration?: number): void;
	loadGUI(callback?: () => void): Promise<void>;
	toggleSidebar(): void;
	postMessage(content: string, params?: any): void;
}
