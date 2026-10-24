/**
 * Potree Modern Floating Toolbar (TypeScript)
 * Extensible, reactive, declarative action-based toolbar.
 * Replaces monolithic hardcoded DOM templates with typed command/action registry.
 */

import { getIcon } from './icons.js';
import { CameraMode } from '../../defines.js';

export interface ToolbarActionContext {
	viewer: any;
	toolbar: FloatingToolbar;
	event: MouseEvent;
	action: ToolbarAction;
}

export type DynamicValue<T> = T | ((context: { viewer: any; toolbar: FloatingToolbar }) => T);

export interface ToolbarAction {
	id: string;
	title?: DynamicValue<string>;
	icon?: DynamicValue<string>;
	label?: DynamicValue<string>;
	type?: 'button' | 'toggle' | 'divider';
	group?: string;
	active?: DynamicValue<boolean>;
	disabled?: DynamicValue<boolean>;
	visible?: DynamicValue<boolean>;
	badge?: DynamicValue<string | number | null>;
	execute?: (context: ToolbarActionContext) => void | Promise<void>;
}

export interface FloatingToolbarOptions {
	container?: HTMLElement;
	position?: 'top-center' | 'top-left' | 'top-right' | 'bottom-center' | 'bottom-left' | 'bottom-right';
	actions?: ToolbarAction[];
	onActionExecute?: (action: ToolbarAction, context: ToolbarActionContext) => void;
}

export class FloatingToolbar {
	public viewer: any;
	public element!: HTMLElement;
	public isDarkMode = true;
	public position: string;

	private actions: Map<string, ToolbarAction> = new Map();
	private actionOrder: string[] = [];
	private actionElements: Map<string, HTMLElement> = new Map();
	private container: HTMLElement | null = null;
	private options: FloatingToolbarOptions;
	private cleanups: Array<() => void> = [];

	constructor(viewer: any, options: FloatingToolbarOptions = {}) {
		this.viewer = viewer;
		this.options = options;
		this.position = options.position || 'top-center';

		// Initialize actions (either custom or default set)
		const initialActions = options.actions || this.createDefaultActions();
		for (const action of initialActions) {
			this.actions.set(action.id, action);
			this.actionOrder.push(action.id);
		}

		this.element = this._render();
		this.bindViewerListeners();

		const targetContainer = options.container || this.viewer.renderArea || document.body;
		this.mount(targetContainer);
	}

	/**
	 * Default action definitions following the Command Pattern
	 */
	public createDefaultActions(): ToolbarAction[] {
		return [
			{
				id: 'sidebar-toggle',
				group: 'navigation',
				title: 'Toggle Sidebar',
				icon: () => getIcon('menu', 18),
				execute: ({ viewer }) => {
					if (typeof viewer.toggleSidebar === 'function') {
						viewer.toggleSidebar();
					}
				},
			},
			{
				id: 'nav-divider',
				type: 'divider',
				group: 'navigation',
			},
			{
				id: 'fit-to-screen',
				group: 'view',
				title: 'Fit to Screen',
				icon: () => getIcon('focus', 18),
				execute: ({ viewer }) => {
					if (typeof viewer.fitToScreen === 'function') {
						viewer.fitToScreen();
					}
				},
			},
			{
				id: 'top-view',
				group: 'view',
				title: 'Top View',
				label: 'TOP',
				execute: ({ viewer }) => {
					if (typeof viewer.setTopView === 'function') {
						viewer.setTopView();
					}
				},
			},
			{
				id: 'front-view',
				group: 'view',
				title: 'Front View',
				label: 'FRONT',
				execute: ({ viewer }) => {
					if (typeof viewer.setFrontView === 'function') {
						viewer.setFrontView();
					}
				},
			},
			{
				id: 'camera-mode',
				group: 'view',
				type: 'toggle',
				title: ({ viewer }) =>
					viewer.scene?.cameraMode === CameraMode.PERSPECTIVE
						? 'Switch to Orthographic (Currently Perspective)'
						: 'Switch to Perspective (Currently Orthographic)',
				label: ({ viewer }) =>
					viewer.scene?.cameraMode === CameraMode.PERSPECTIVE ? 'PERSP' : 'ORTHO',
				active: ({ viewer }) => viewer.scene?.cameraMode === CameraMode.ORTHOGRAPHIC,
				execute: ({ viewer, toolbar }) => {
					const current = viewer.scene?.cameraMode;
					const next =
						current === CameraMode.PERSPECTIVE
							? CameraMode.ORTHOGRAPHIC
							: CameraMode.PERSPECTIVE;
					if (typeof viewer.setCameraMode === 'function') {
						viewer.setCameraMode(next);
					}
					toolbar.update();
				},
			},
			{
				id: 'view-divider',
				type: 'divider',
				group: 'view',
			},
			{
				id: 'measure-distance',
				group: 'tools',
				title: 'Measure Distance',
				icon: () => getIcon('ruler', 18),
				execute: ({ viewer }) => {
					viewer.measuringTool?.startInsertion?.({
						showDistances: true,
						showAngles: false,
						showArea: false,
						closed: false,
						maxMarkers: 2,
					});
				},
			},
			{
				id: 'clip-box',
				group: 'tools',
				title: 'Volume Clip Box',
				icon: () => getIcon('box', 18),
				execute: ({ viewer }) => {
					viewer.volumeTool?.startInsertion?.({ type: 'BoxVolume' });
				},
			},
			{
				id: 'tools-divider',
				type: 'divider',
				group: 'tools',
			},
			{
				id: 'theme-toggle',
				group: 'system',
				type: 'toggle',
				title: ({ toolbar }) =>
					toolbar.isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode',
				icon: ({ toolbar }) => getIcon(toolbar.isDarkMode ? 'sun' : 'moon', 18),
				execute: ({ toolbar }) => {
					toolbar.toggleTheme();
				},
			},
			{
				id: 'fullscreen-toggle',
				group: 'system',
				title: () => (document.fullscreenElement ? 'Exit Fullscreen' : 'Enter Fullscreen'),
				icon: () => getIcon(document.fullscreenElement ? 'minimize' : 'maximize', 18),
				execute: ({ toolbar }) => {
					toolbar.toggleFullscreen();
				},
			},
		];
	}

	/**
	 * Resolves dynamic action properties (can be static value or factory function)
	 */
	private resolveValue<T>(val: DynamicValue<T> | undefined, fallback: T): T {
		if (val === undefined) return fallback;
		if (typeof val === 'function') {
			return (val as any)({ viewer: this.viewer, toolbar: this });
		}
		return val;
	}

	/**
	 * Build semantic DOM tree
	 */
	private _render(): HTMLElement {
		const root = document.createElement('nav');
		root.className = `potree-floating-toolbar potree-glass potree-toolbar-pos-${this.position}`;
		root.setAttribute('role', 'toolbar');
		root.setAttribute('aria-label', 'Point Cloud Viewer Controls');

		this.actionElements.clear();

		for (const id of this.actionOrder) {
			const action = this.actions.get(id);
			if (!action) continue;

			if (action.type === 'divider') {
				const divider = document.createElement('div');
				divider.className = 'potree-toolbar-divider';
				divider.setAttribute('role', 'separator');
				root.appendChild(divider);
				this.actionElements.set(id, divider);
				continue;
			}

			const btn = document.createElement('button');
			btn.type = 'button';
			btn.className = 'potree-toolbar-btn';
			btn.dataset.actionId = action.id;

			const title = this.resolveValue(action.title, '');
			if (title) {
				btn.title = title;
				btn.setAttribute('aria-label', title);
			}

			if (action.type === 'toggle') {
				const isActive = this.resolveValue(action.active, false);
				btn.setAttribute('aria-pressed', String(isActive));
				if (isActive) btn.classList.add('active');
			}

			const isDisabled = this.resolveValue(action.disabled, false);
			btn.disabled = isDisabled;
			if (isDisabled) btn.classList.add('disabled');

			const isVisible = this.resolveValue(action.visible, true);
			if (!isVisible) btn.style.display = 'none';

			// Icon container
			const iconHtml = this.resolveValue(action.icon, '');
			if (iconHtml) {
				const iconSpan = document.createElement('span');
				iconSpan.className = 'potree-toolbar-icon';
				iconSpan.innerHTML = iconHtml;
				btn.appendChild(iconSpan);
			}

			// Label container
			const labelText = this.resolveValue(action.label, '');
			if (labelText) {
				const labelSpan = document.createElement('span');
				labelSpan.className = 'potree-toolbar-label';
				labelSpan.textContent = labelText;
				btn.appendChild(labelSpan);
			}

			// Direct action click binding (No monolithic switch statements!)
			btn.addEventListener('click', (event: MouseEvent) => {
				event.preventDefault();
				this.executeAction(action.id, event);
			});

			root.appendChild(btn);
			this.actionElements.set(id, btn);
		}

		return root;
	}

	/**
	 * Executes an action by ID
	 */
	public async executeAction(actionId: string, event?: MouseEvent): Promise<void> {
		const action = this.actions.get(actionId);
		if (!action || this.resolveValue(action.disabled, false)) return;

		const mouseEvent = event || new MouseEvent('click');
		const context: ToolbarActionContext = {
			viewer: this.viewer,
			toolbar: this,
			event: mouseEvent,
			action,
		};

		try {
			if (typeof action.execute === 'function') {
				await action.execute(context);
			}
			if (typeof this.options.onActionExecute === 'function') {
				this.options.onActionExecute(action, context);
			}
			this.element.dispatchEvent(
				new CustomEvent('action_executed', { detail: { action, context } })
			);
		} catch (error) {
			console.error(`[FloatingToolbar] Error executing action '${actionId}':`, error);
		}

		this.update();
	}

	/**
	 * Reactive update: synchronizes active states, icons, labels without full DOM rebuild
	 */
	public update(): void {
		for (const [id, element] of this.actionElements.entries()) {
			const action = this.actions.get(id);
			if (!action || action.type === 'divider') continue;

			const btn = element as HTMLButtonElement;

			// Visibility
			const isVisible = this.resolveValue(action.visible, true);
			btn.style.display = isVisible ? '' : 'none';
			if (!isVisible) continue;

			// Active state
			const isActive = this.resolveValue(action.active, false);
			btn.classList.toggle('active', isActive);
			if (action.type === 'toggle') {
				btn.setAttribute('aria-pressed', String(isActive));
			}

			// Disabled state
			const isDisabled = this.resolveValue(action.disabled, false);
			btn.disabled = isDisabled;
			btn.classList.toggle('disabled', isDisabled);

			// Title / Tooltip
			const title = this.resolveValue(action.title, '');
			if (title) {
				btn.title = title;
				btn.setAttribute('aria-label', title);
			}

			// Dynamic Icon
			const iconHtml = this.resolveValue(action.icon, '');
			const iconSpan = btn.querySelector('.potree-toolbar-icon');
			if (iconSpan && iconHtml) {
				iconSpan.innerHTML = iconHtml;
			}

			// Dynamic Label
			const labelText = this.resolveValue(action.label, '');
			const labelSpan = btn.querySelector('.potree-toolbar-label');
			if (labelSpan && labelText) {
				labelSpan.textContent = labelText;
			}
		}
	}

	/**
	 * Register a new custom action into the toolbar
	 */
	public registerAction(
		action: ToolbarAction,
		options?: { before?: string; after?: string; at?: number }
	): void {
		this.actions.set(action.id, action);

		// Remove from old order if already present
		this.actionOrder = this.actionOrder.filter((id) => id !== action.id);

		if (options?.before) {
			const idx = this.actionOrder.indexOf(options.before);
			if (idx !== -1) {
				this.actionOrder.splice(idx, 0, action.id);
			} else {
				this.actionOrder.push(action.id);
			}
		} else if (options?.after) {
			const idx = this.actionOrder.indexOf(options.after);
			if (idx !== -1) {
				this.actionOrder.splice(idx + 1, 0, action.id);
			} else {
				this.actionOrder.push(action.id);
			}
		} else if (typeof options?.at === 'number') {
			this.actionOrder.splice(options.at, 0, action.id);
		} else {
			this.actionOrder.push(action.id);
		}

		this.rebuild();
	}

	/**
	 * Unregister an action by ID
	 */
	public unregisterAction(actionId: string): void {
		this.actions.delete(actionId);
		this.actionOrder = this.actionOrder.filter((id) => id !== actionId);
		this.rebuild();
	}

	/**
	 * Get an action definition by ID
	 */
	public getAction(actionId: string): ToolbarAction | undefined {
		return this.actions.get(actionId);
	}

	/**
	 * Get all registered actions
	 */
	public getActions(): ToolbarAction[] {
		return this.actionOrder.map((id) => this.actions.get(id)!).filter(Boolean);
	}

	/**
	 * Rebuild the DOM
	 */
	public rebuild(): void {
		const parent = this.element.parentNode;
		const next = this._render();
		if (parent) {
			parent.replaceChild(next, this.element);
		}
		this.element = next;
	}

	/**
	 * Subscribe to viewer & DOM events to trigger automatic updates
	 */
	private bindViewerListeners(): void {
		const onCameraChanged = () => this.update();
		const onFullscreenChange = () => this.update();

		if (this.viewer?.addEventListener) {
			this.viewer.addEventListener('camera_changed', onCameraChanged);
			this.cleanups.push(() => {
				this.viewer.removeEventListener('camera_changed', onCameraChanged);
			});
		}

		document.addEventListener('fullscreenchange', onFullscreenChange);
		this.cleanups.push(() => {
			document.removeEventListener('fullscreenchange', onFullscreenChange);
		});

		// If viewer has PotreeStore attached, subscribe to reactive state changes
		if (this.viewer?.store?.subscribe) {
			const unsub = this.viewer.store.subscribe(() => this.update());
			this.cleanups.push(unsub);
		}
	}

	public toggleTheme(): void {
		this.isDarkMode = !this.isDarkMode;
		const targetTheme = this.isDarkMode ? 'dark' : 'light';
		document.documentElement.setAttribute('data-theme', targetTheme);

		const container = document.querySelector('.potree_container') || document.body;
		container.setAttribute('data-theme', targetTheme);

		this.update();
	}

	public toggleFullscreen(): void {
		const container =
			this.viewer.renderArea?.closest('.potree_container') || document.documentElement;
		if (!document.fullscreenElement) {
			container.requestFullscreen?.().catch(() => {});
		} else {
			document.exitFullscreen?.().catch(() => {});
		}
		this.update();
	}

	public mount(container: HTMLElement): void {
		if (this.element.parentNode) {
			this.element.parentNode.removeChild(this.element);
		}
		this.container = container;
		container.appendChild(this.element);
	}

	public destroy(): void {
		for (const cleanup of this.cleanups) {
			cleanup();
		}
		this.cleanups = [];

		if (this.element && this.element.parentNode) {
			this.element.parentNode.removeChild(this.element);
		}
		this.actionElements.clear();
		this.actions.clear();
	}
}
