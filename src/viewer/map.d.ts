import { Viewer } from './viewer.js';

export declare class MapView {
	viewer: Viewer;
	webMapService: string;
	mapProjectionName: string;
	mapProjection: any;
	sceneProjection: any;
	extentsLayer: any;
	cameraLayer: any;
	toolLayer: any;
	sourcesLayer: any;
	sourcesLabelLayer: any;
	images360Layer: any;
	enabled: boolean;

	constructor(viewer: Viewer);
	showSources(show: boolean): void;
	init(): void;
	setSceneProjection(sceneProjection: any): void;
	getMap(): any;
}
