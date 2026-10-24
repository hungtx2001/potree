import React, { useEffect, useState } from 'react';
import type { FloatingToolbarProps, ToolbarAction } from './types.js';
import { CameraMode } from '../defines.js';

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
	viewer,
	actions: customActions,
	position = 'top-center',
	className = '',
}) => {
	const [cameraMode, setCameraMode] = useState<number>(
		viewer?.scene?.cameraMode ?? CameraMode.PERSPECTIVE
	);
	const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
	const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

	useEffect(() => {
		if (!viewer) return;

		const handleCameraChange = () => {
			if (viewer.scene) {
				setCameraMode(viewer.scene.cameraMode);
			}
		};

		const handleFullscreenChange = () => {
			setIsFullscreen(Boolean(document.fullscreenElement));
		};

		viewer.addEventListener?.('camera_changed', handleCameraChange);
		document.addEventListener('fullscreenchange', handleFullscreenChange);

		return () => {
			viewer.removeEventListener?.('camera_changed', handleCameraChange);
			document.removeEventListener('fullscreenchange', handleFullscreenChange);
		};
	}, [viewer]);

	const toggleCameraMode = () => {
		if (!viewer) return;
		const next = cameraMode === CameraMode.PERSPECTIVE ? CameraMode.ORTHOGRAPHIC : CameraMode.PERSPECTIVE;
		viewer.setCameraMode?.(next);
		setCameraMode(next);
	};

	const toggleTheme = () => {
		const next = !isDarkMode;
		setIsDarkMode(next);
		const targetTheme = next ? 'dark' : 'light';
		document.documentElement.setAttribute('data-theme', targetTheme);
		const container = document.querySelector('.potree_container') || document.body;
		container.setAttribute('data-theme', targetTheme);
	};

	const toggleFullscreen = () => {
		const container = viewer?.renderArea?.closest('.potree_container') || document.documentElement;
		if (!document.fullscreenElement) {
			container.requestFullscreen?.().catch(() => {});
		} else {
			document.exitFullscreen?.().catch(() => {});
		}
	};

	// Default actions if not provided
	const defaultActions: ToolbarAction[] = [
		{
			id: 'sidebar-toggle',
			title: 'Toggle Sidebar',
			icon: (
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
					<line x1="3" y1="12" x2="21" y2="12" />
					<line x1="3" y1="6" x2="21" y2="6" />
					<line x1="3" y1="18" x2="21" y2="18" />
				</svg>
			),
			onClick: (v) => v?.toggleSidebar?.(),
		},
		{ id: 'div-1', type: 'divider' },
		{
			id: 'fit-to-screen',
			title: 'Fit to Screen',
			icon: (
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
					<circle cx="12" cy="12" r="10" />
					<circle cx="12" cy="12" r="3" />
				</svg>
			),
			onClick: (v) => v?.fitToScreen?.(),
		},
		{
			id: 'top-view',
			title: 'Top View',
			label: 'TOP',
			onClick: (v) => v?.setTopView?.(),
		},
		{
			id: 'front-view',
			title: 'Front View',
			label: 'FRONT',
			onClick: (v) => v?.setFrontView?.(),
		},
		{
			id: 'camera-mode',
			title: cameraMode === CameraMode.PERSPECTIVE ? 'Switch to Orthographic' : 'Switch to Perspective',
			label: cameraMode === CameraMode.PERSPECTIVE ? 'PERSP' : 'ORTHO',
			type: 'toggle',
			active: cameraMode === CameraMode.ORTHOGRAPHIC,
			onClick: toggleCameraMode,
		},
		{ id: 'div-2', type: 'divider' },
		{
			id: 'measure-dist',
			title: 'Measure Distance',
			icon: (
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
					<path d="M21.3 15.3l-9-9c-.4-.4-1-.4-1.4 0l-7.6 7.6c-.4.4-.4 1 0 1.4l9 9c.4.4 1 .4 1.4 0l7.6-7.6c.4-.4.4-1 0-1.4z" />
				</svg>
			),
			onClick: (v) => {
				v?.measuringTool?.startInsertion?.({
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
			title: 'Volume Clip Box',
			icon: (
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
					<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
				</svg>
			),
			onClick: (v) => {
				v?.volumeTool?.startInsertion?.({ type: 'BoxVolume' });
			},
		},
		{ id: 'div-3', type: 'divider' },
		{
			id: 'theme-toggle',
			title: isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode',
			icon: isDarkMode ? (
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
					<circle cx="12" cy="12" r="5" />
					<line x1="12" y1="1" x2="12" y2="3" />
					<line x1="12" y1="21" x2="12" y2="23" />
				</svg>
			) : (
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
					<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
				</svg>
			),
			onClick: toggleTheme,
		},
		{
			id: 'fullscreen-toggle',
			title: isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen',
			icon: isFullscreen ? (
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
					<path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
				</svg>
			) : (
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
					<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
				</svg>
			),
			onClick: toggleFullscreen,
		},
	];

	const activeActions = customActions || defaultActions;

	return (
		<nav
			className={`potree-floating-toolbar potree-glass potree-toolbar-pos-${position} ${className}`}
			role="toolbar"
			aria-label="Viewer Tools"
		>
			{activeActions.map((action) => {
				if (action.type === 'divider') {
					return <div key={action.id} className="potree-toolbar-divider" role="separator" />;
				}

				return (
					<button
						key={action.id}
						type="button"
						className={`potree-toolbar-btn ${action.active ? 'active' : ''} ${action.disabled ? 'disabled' : ''}`}
						title={action.title}
						aria-label={action.title}
						disabled={action.disabled}
						onClick={(e) => action.onClick?.(viewer, e)}
					>
						{action.icon && <span className="potree-toolbar-icon">{action.icon}</span>}
						{action.label && <span className="potree-toolbar-label">{action.label}</span>}
					</button>
				);
			})}
		</nav>
	);
};
