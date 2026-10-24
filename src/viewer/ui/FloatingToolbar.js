/**
 * Potree Modern Floating Toolbar
 * Sleek glassmorphism toolbar mounted on the 3D viewer canvas
 */

import { getIcon } from './icons.js';
import { CameraMode } from '../../defines.js';

export class FloatingToolbar {
	constructor(viewer) {
		this.viewer = viewer;
		this.element = null;
		this.isDarkMode = true;
		this.init();
	}

	init() {
		this.element = document.createElement('div');
		this.element.className = 'potree-floating-toolbar potree-glass';
		this.element.innerHTML = `
			<button class="potree-toolbar-btn" data-action="toggle-sidebar" title="Toggle Sidebar">
				${getIcon('menu', 18)}
			</button>
			<div class="potree-toolbar-divider"></div>
			<button class="potree-toolbar-btn" data-action="fit-to-screen" title="Fit to Screen">
				${getIcon('focus', 18)}
			</button>
			<button class="potree-toolbar-btn" data-action="top-view" title="Top View">
				<span class="potree-toolbar-label">TOP</span>
			</button>
			<button class="potree-toolbar-btn" data-action="front-view" title="Front View">
				<span class="potree-toolbar-label">FRONT</span>
			</button>
			<button class="potree-toolbar-btn" data-action="toggle-camera" title="Toggle Perspective / Orthographic">
				<span class="potree-toolbar-label" id="potree_cam_label">PERSP</span>
			</button>
			<div class="potree-toolbar-divider"></div>
			<button class="potree-toolbar-btn" data-action="measure-dist" title="Measure Distance">
				${getIcon('ruler', 18)}
			</button>
			<button class="potree-toolbar-btn" data-action="clip-box" title="Volume Clip Box">
				${getIcon('box', 18)}
			</button>
			<div class="potree-toolbar-divider"></div>
			<button class="potree-toolbar-btn" data-action="toggle-theme" title="Toggle Dark/Light Mode">
				<span id="potree_theme_icon">${getIcon('sun', 18)}</span>
			</button>
			<button class="potree-toolbar-btn" data-action="toggle-fullscreen" title="Toggle Fullscreen">
				${getIcon('maximize', 18)}
			</button>
		`;

		this.bindEvents();

		// Mount to viewer DOM container
		const container = this.viewer.renderArea || document.body;
		container.appendChild(this.element);
	}

	bindEvents() {
		this.element.addEventListener('click', (e) => {
			const btn = e.target.closest('.potree-toolbar-btn');
			if (!btn) return;
			const action = btn.dataset.action;

			switch (action) {
				case 'toggle-sidebar':
					this.viewer.toggleSidebar();
					break;
				case 'fit-to-screen':
					this.viewer.fitToScreen();
					break;
				case 'top-view':
					this.viewer.setTopView();
					break;
				case 'front-view':
					this.viewer.setFrontView();
					break;
				case 'toggle-camera':
					this.toggleCameraMode();
					break;
				case 'measure-dist':
					this.viewer.measuringTool?.startInsertion({
						showDistances: true,
						showAngles: false,
						showArea: false,
						closed: false,
						maxMarkers: 2
					});
					break;
				case 'clip-box':
					this.viewer.volumeTool?.startInsertion({ type: 'BoxVolume' });
					break;
				case 'toggle-theme':
					this.toggleTheme();
					break;
				case 'toggle-fullscreen':
					this.toggleFullscreen();
					break;
			}
		});
	}

	toggleCameraMode() {
		const current = this.viewer.scene.cameraMode;
		const next = (current === CameraMode.PERSPECTIVE) ? CameraMode.ORTHOGRAPHIC : CameraMode.PERSPECTIVE;
		this.viewer.setCameraMode(next);
		const label = this.element.querySelector('#potree_cam_label');
		if (label) {
			label.textContent = next === CameraMode.PERSPECTIVE ? 'PERSP' : 'ORTHO';
		}
	}

	toggleTheme() {
		this.isDarkMode = !this.isDarkMode;
		const targetTheme = this.isDarkMode ? 'dark' : 'light';
		document.documentElement.setAttribute('data-theme', targetTheme);
		const container = document.querySelector('.potree_container') || document.body;
		container.setAttribute('data-theme', targetTheme);

		const themeIcon = this.element.querySelector('#potree_theme_icon');
		if (themeIcon) {
			themeIcon.innerHTML = getIcon(this.isDarkMode ? 'sun' : 'moon', 18);
		}
	}

	toggleFullscreen() {
		const container = this.viewer.renderArea?.closest('.potree_container') || document.documentElement;
		if (!document.fullscreenElement) {
			container.requestFullscreen?.().catch(() => {});
		} else {
			document.exitFullscreen?.().catch(() => {});
		}
	}

	destroy() {
		if (this.element && this.element.parentNode) {
			this.element.parentNode.removeChild(this.element);
		}
	}
}
