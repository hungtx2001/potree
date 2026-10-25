import { EventDispatcher } from '../core/EventDispatcher.js';
import { Viewer } from './viewer.js';
import { Profile } from '../core/tools/Profile.js';

export declare class ProfileWindow extends EventDispatcher {
	viewer: Viewer;
	elRoot: HTMLElement;
	renderArea: HTMLElement;
	autoFit: boolean;

	constructor(viewer: Viewer);
	init(): void;
	load(profile: Profile): void;
	show(): void;
	hide(): void;
}

export declare class ProfileWindowController {
	viewer: Viewer;
	profileWindow: ProfileWindow;

	constructor(viewer: Viewer);
	setProfile(profile: Profile): void;
	reset(): void;
}
