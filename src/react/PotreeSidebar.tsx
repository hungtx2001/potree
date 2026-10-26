import React, { useState, useEffect, useCallback } from 'react';
import type { Viewer } from '../viewer/viewer.js';
import {
	IconMenu,
	IconChevronRight,
	IconChevronDown,
	IconFolder,
	IconCloud,
	IconRuler,
	IconCamera,
	IconTag,
	IconFit,
	IconClose,
} from './icons.js';
import { PointCloudOctree } from '../core/octree/PointCloudOctree.js';
import { Exporters } from '../core/tools/Exporters.js';
import { CameraMode, ClipTask, ClipMethod } from '../core/types.js';
import { runtime } from '../core/runtime/runtime.js';
import '../styles/potree.css';

export interface PotreeSidebarProps {
	viewer?: Viewer | null;
	isOpen?: boolean;
	onToggle?: () => void;
	onClose?: () => void;
	onOpenProfile?: () => void;
	resourcePath?: string;
	showBranding?: boolean;
	className?: string;
	style?: React.CSSProperties;
}

interface ASPRSClass {
	code: number;
	name: string;
	color: string;
	visible: boolean;
}

const DEFAULT_ASPRS_CLASSES: ASPRSClass[] = [
	{ code: 0, name: 'Never Classified', color: '#808080', visible: true },
	{ code: 1, name: 'Unassigned', color: '#a0a0a0', visible: true },
	{ code: 2, name: 'Ground', color: '#d2b48c', visible: true },
	{ code: 3, name: 'Low Vegetation', color: '#90ee90', visible: true },
	{ code: 4, name: 'Medium Vegetation', color: '#228b22', visible: true },
	{ code: 5, name: 'High Vegetation', color: '#006400', visible: true },
	{ code: 6, name: 'Building', color: '#ff8c00', visible: true },
	{ code: 7, name: 'Low Point / Noise', color: '#ff0000', visible: false },
	{ code: 9, name: 'Water', color: '#0000ff', visible: true },
	{ code: 14, name: 'Wire Conductor (EVN)', color: '#00ffff', visible: true },
	{ code: 15, name: 'Transmission Tower (EVN)', color: '#ff00ff', visible: true },
	{ code: 16, name: 'Wire Structure', color: '#ffff00', visible: true },
];

export const PotreeSidebar: React.FC<PotreeSidebarProps> = ({
	viewer,
	isOpen: controlledIsOpen,
	onToggle,
	onClose,
	onOpenProfile,
	resourcePath,
	showBranding = false,
	className = '',
	style,
}) => {
	const resPath = resourcePath || (viewer as any)?.resourcePath || runtime?.resourcePath || '/resources';
	// Open/Close state (controlled or uncontrolled)
	const [uncontrolledOpen, setUncontrolledOpen] = useState(true);
	const isOpen = typeof controlledIsOpen !== 'undefined' ? controlledIsOpen : uncontrolledOpen;

	const handleToggle = () => {
		if (onToggle) {
			onToggle();
		} else {
			setUncontrolledOpen(!uncontrolledOpen);
		}
	};

	// Accordion open/close sections (Scene open by default, matching screenshot)
	const [openSections, setOpenSections] = useState<Record<string, boolean>>({
		appearance: false,
		tools: false,
		scene: true,
		classification: false,
		about: false,
	});

	const toggleSection = (id: string) => {
		setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
	};

	// Tree expand/collapse states
	const [treeOpen, setTreeOpen] = useState<Record<string, boolean>>({
		pointclouds: true,
		measurements: true,
		annotations: true,
		other: true,
	});

	const toggleTreeNode = (id: string) => {
		setTreeOpen(prev => ({ ...prev, [id]: !prev[id] }));
	};

	// Appearance State
	const [pointBudget, setPointBudget] = useState<number>(2_000_000);
	const [fov, setFov] = useState<number>(60);
	const [edlEnabled, setEdlEnabled] = useState<boolean>(true);
	const [edlRadius, setEdlRadius] = useState<number>(1.4);
	const [edlStrength, setEdlStrength] = useState<number>(0.8);
	const [edlOpacity, setEdlOpacity] = useState<number>(1.0);
	const [background, setBackgroundState] = useState<'gradient' | 'skybox' | 'black' | 'white' | 'none'>('gradient');
	const [splatQuality, setSplatQuality] = useState<'standard' | 'hq'>('standard');
	const [minNodeSize, setMinNodeSize] = useState<number>(100);
	const [showBoundingBox, setShowBoundingBox] = useState<boolean>(false);
	const [isFreeze, setIsFreeze] = useState<boolean>(false);

	// Navigation & Move Speed
	const [moveSpeed, setMoveSpeed] = useState<number>(210.0);
	const [navMode, setNavMode] = useState<'earth' | 'flight' | 'helicopter' | 'orbit'>('orbit');
	const [cameraProjection, setCameraProjection] = useState<'Perspective' | 'Orthographic'>('Perspective');

	// Clipping Options
	const [clipTask, setClipTask] = useState<'NONE' | 'HIGHLIGHT' | 'SHOW_INSIDE' | 'SHOW_OUTSIDE'>('HIGHLIGHT');
	const [clipMethod, setClipMethod] = useState<'INSIDE_ANY' | 'INSIDE_ALL'>('INSIDE_ANY');

	// Selection and Scene Sync
	const [selectedObject, setSelectedObject] = useState<any>(null);
	const [, setSceneVersion] = useState<number>(0);
	const triggerSceneUpdate = useCallback(() => setSceneVersion(v => v + 1), []);

	// Classification state
	const [classes, setClasses] = useState<ASPRSClass[]>(DEFAULT_ASPRS_CLASSES);

	// Sync with Viewer
	useEffect(() => {
		if (!viewer) return;

		viewer.setPointBudget(pointBudget);
		viewer.setFOV(fov);
		viewer.setEDLEnabled(edlEnabled);
		viewer.setEDLRadius?.(edlRadius);
		viewer.setEDLStrength?.(edlStrength);
		viewer.setEDLOpacity?.(edlOpacity);
		viewer.setBackground(background);
		viewer.setMoveSpeed?.(moveSpeed);

		if (typeof (viewer as any).setShowBoundingBox === 'function') {
			(viewer as any).setShowBoundingBox(showBoundingBox);
		}

		if (typeof (viewer as any).setFreeze === 'function') {
			(viewer as any).setFreeze(isFreeze);
		}
	}, [viewer, pointBudget, fov, edlEnabled, edlRadius, edlStrength, edlOpacity, background, showBoundingBox, isFreeze, moveSpeed]);

	// Listen to scene events
	useEffect(() => {
		if (!viewer || !viewer.scene) return;
		const scene = viewer.scene;
		const update = () => triggerSceneUpdate();

		scene.addEventListener('pointcloud_added', update);
		scene.addEventListener('pointcloud_removed', update);
		scene.addEventListener('measurement_added', update);
		scene.addEventListener('measurement_removed', update);
		scene.addEventListener('volume_added', update);
		scene.addEventListener('volume_removed', update);
		scene.addEventListener('profile_added', update);
		scene.addEventListener('profile_removed', update);

		return () => {
			scene.removeEventListener('pointcloud_added', update);
			scene.removeEventListener('pointcloud_removed', update);
			scene.removeEventListener('measurement_added', update);
			scene.removeEventListener('measurement_removed', update);
			scene.removeEventListener('volume_added', update);
			scene.removeEventListener('volume_removed', update);
			scene.removeEventListener('profile_added', update);
			scene.removeEventListener('profile_removed', update);
		};
	}, [viewer, triggerSceneUpdate]);

	// Export Scene Data
	const handleExport = (type: 'geojson' | 'dxf') => {
		if (!viewer || !viewer.scene) return;
		const allItems = [
			...(viewer.scene.measurements || []),
			...(viewer.scene.profiles || []),
			...(viewer.scene.volumes || []),
		];
		if (allItems.length === 0) {
			alert('No measurements to export!');
			return;
		}

		if (type === 'geojson') {
			const json = Exporters.toGeoJSON(allItems as any);
			Exporters.downloadFile('potree_scene.geojson', json, 'application/json');
		} else if (type === 'dxf') {
			const dxf = Exporters.toDXF(allItems as any);
			Exporters.downloadFile('potree_scene.dxf', dxf, 'application/dxf');
		}
	};

	// Start Measurement Tool
	const startMeasurement = (type: string) => {
		if (!viewer || !viewer.measuringTool) return;
		switch (type) {
			case 'angle':
				viewer.measuringTool.startInsertion({ showAngles: true, closed: true, maxMarkers: 3, name: 'Angle' });
				break;
			case 'point':
				viewer.measuringTool.startInsertion({ showCoordinates: true, maxMarkers: 1, name: 'Point' });
				break;
			case 'distance':
				viewer.measuringTool.startInsertion({ showDistances: true, closed: false, name: 'Distance' });
				break;
			case 'height':
				viewer.measuringTool.startInsertion({ showHeight: true, closed: false, maxMarkers: 2, name: 'Height' });
				break;
			case 'circle':
				viewer.measuringTool.startInsertion({ showCircle: true, closed: false, maxMarkers: 3, name: 'Circle' });
				break;
			case 'area':
				viewer.measuringTool.startInsertion({ showArea: true, closed: true, name: 'Area' });
				break;
			case 'volume':
				viewer.volumeTool?.startInsertion({ type: 'box', name: 'Box Volume' });
				break;
			case 'sphere':
				viewer.volumeTool?.startInsertion({ type: 'sphere', name: 'Sphere Volume' });
				break;
			case 'profile':
				viewer.profileTool?.startInsertion({ name: 'Height Profile' });
				if (onOpenProfile) onOpenProfile();
				break;
			case 'clear':
				if (viewer.scene) {
					viewer.scene.removeAllMeasurements();
					setSelectedObject(null);
					triggerSceneUpdate();
				}
				break;
			default:
				break;
		}
	};

	// Apply Classification Filter
	const toggleClassVisibility = (code: number) => {
		setClasses(prev => {
			const next = prev.map(c => (c.code === code ? { ...c, visible: !c.visible } : c));
			if (viewer?.scene?.pointclouds) {
				for (const pc of viewer.scene.pointclouds) {
					const mat = (pc as any).material;
					if (mat?.classification?.[code]) {
						mat.classification[code].visible = !mat.classification[code].visible;
						mat.updateShaderSource?.();
					}
				}
			}
			return next;
		});
	};

	const setAllClasses = (visible: boolean) => {
		setClasses(prev => {
			const next = prev.map(c => ({ ...c, visible }));
			if (viewer?.scene?.pointclouds) {
				for (const pc of viewer.scene.pointclouds) {
					const mat = (pc as any).material;
					if (mat?.classification) {
						for (const c of next) {
							if (mat.classification[c.code]) {
								mat.classification[c.code].visible = visible;
							}
						}
						mat.updateShaderSource?.();
					}
				}
			}
			return next;
		});
	};

	const pointclouds = viewer?.scene?.pointclouds || [];
	const measurements = viewer?.scene?.measurements || [];
	const annotations: any[] = (viewer?.scene?.annotations as any)?.children || [];

	const toggleTop = style?.top ? `calc(${style.top} + 10px)` : '10px';

	return (
		<>
			{/* Traditional Top-Left Hamburger Toggle Button */}
			<button
				type="button"
				className="potree_sidebar_toggle"
				onClick={handleToggle}
				title={isOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
				style={{
					top: toggleTop,
					left: isOpen ? '380px' : '10px',
				}}
			>
				<IconMenu size={20} />
			</button>

			{/* Authentic Potree Sidebar Container */}
			<aside
				className={`potree_sidebar_container ${className}`}
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					bottom: 0,
					width: '370px',
					background: '#0f172a',
					borderRight: '1px solid rgba(255, 255, 255, 0.08)',
					zIndex: 1000,
					overflowY: 'auto',
					display: 'flex',
					flexDirection: 'column',
					transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
					transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
					...style,
				}}
			>
				{/* SECTION 1: APPEARANCE */}
				<div
					className={`potree_accordion_header ${openSections.appearance ? 'active' : ''}`}
					onClick={() => toggleSection('appearance')}
				>
					<span>Appearance</span>
					{openSections.appearance ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
				</div>
				{openSections.appearance && (
					<div className="potree_accordion_body">
						<div className="potree_slider_row">
							<div className="potree_slider_label">
								<span>Point Budget</span>
								<span className="potree_slider_val">{(pointBudget / 1_000_000).toFixed(1)}M</span>
							</div>
							<input
								type="range"
								className="potree_slider"
								min={100_000}
								max={10_000_000}
								step={100_000}
								value={pointBudget}
								onChange={e => setPointBudget(Number(e.target.value))}
							/>
						</div>

						<div className="potree_slider_row">
							<div className="potree_slider_label">
								<span>Field of View</span>
								<span className="potree_slider_val">{fov}°</span>
							</div>
							<input
								type="range"
								className="potree_slider"
								min={30}
								max={120}
								step={1}
								value={fov}
								onChange={e => setFov(Number(e.target.value))}
							/>
						</div>

						<div className="divider">
							<span>Eye-Dome-Lighting</span>
						</div>

						<label className="potree_checkbox_label">
							<input
								type="checkbox"
								className="potree_tree_checkbox"
								checked={edlEnabled}
								onChange={e => setEdlEnabled(e.target.checked)}
							/>
							<span>Enable EDL</span>
						</label>

						<div className="potree_slider_row">
							<div className="potree_slider_label">
								<span>Radius</span>
								<span className="potree_slider_val">{edlRadius.toFixed(1)}</span>
							</div>
							<input
								type="range"
								className="potree_slider"
								min={0.5}
								max={4.0}
								step={0.1}
								value={edlRadius}
								onChange={e => setEdlRadius(Number(e.target.value))}
							/>
						</div>

						<div className="potree_slider_row">
							<div className="potree_slider_label">
								<span>Strength</span>
								<span className="potree_slider_val">{edlStrength.toFixed(1)}</span>
							</div>
							<input
								type="range"
								className="potree_slider"
								min={0.1}
								max={3.0}
								step={0.1}
								value={edlStrength}
								onChange={e => setEdlStrength(Number(e.target.value))}
							/>
						</div>

						<div className="potree_slider_row">
							<div className="potree_slider_label">
								<span>Opacity</span>
								<span className="potree_slider_val">{edlOpacity.toFixed(2)}</span>
							</div>
							<input
								type="range"
								className="potree_slider"
								min={0.0}
								max={1.0}
								step={0.05}
								value={edlOpacity}
								onChange={e => setEdlOpacity(Number(e.target.value))}
							/>
						</div>

						<div className="divider">
							<span>Background</span>
						</div>

						<div className="potree_selectgroup">
							{(['skybox', 'gradient', 'black', 'white', 'none'] as const).map(bg => (
								<button
									key={bg}
									type="button"
									className={`potree_selectgroup_btn ${background === bg ? 'active' : ''}`}
									onClick={() => setBackgroundState(bg)}
								>
									{bg.charAt(0).toUpperCase() + bg.slice(1)}
								</button>
							))}
						</div>

						<div className="divider">
							<span>Other</span>
						</div>

						<div className="potree_selectgroup">
							<button
								type="button"
								className={`potree_selectgroup_btn ${splatQuality === 'standard' ? 'active' : ''}`}
								onClick={() => setSplatQuality('standard')}
							>
								Standard
							</button>
							<button
								type="button"
								className={`potree_selectgroup_btn ${splatQuality === 'hq' ? 'active' : ''}`}
								onClick={() => setSplatQuality('hq')}
							>
								High Quality
							</button>
						</div>

						<div className="potree_slider_row">
							<div className="potree_slider_label">
								<span>Min Node Size:</span>
								<span>{minNodeSize}</span>
							</div>
							<input
								type="range"
								className="potree_slider"
								min={0}
								max={300}
								step={5}
								value={minNodeSize}
								onChange={e => setMinNodeSize(Number(e.target.value))}
							/>
						</div>

						<label className="potree_checkbox_label">
							<input
								type="checkbox"
								className="potree_tree_checkbox"
								checked={showBoundingBox}
								onChange={e => setShowBoundingBox(e.target.checked)}
							/>
							<span>Show Bounding Box</span>
						</label>

						<label className="potree_checkbox_label">
							<input
								type="checkbox"
								className="potree_tree_checkbox"
								checked={isFreeze}
								onChange={e => setIsFreeze(e.target.checked)}
							/>
							<span>Freeze</span>
						</label>
					</div>
				)}

				{/* SECTION 2: TOOLS */}
				<div
					className={`potree_accordion_header ${openSections.tools ? 'active' : ''}`}
					onClick={() => toggleSection('tools')}
				>
					<span>Tools</span>
					{openSections.tools ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
				</div>
				{openSections.tools && (
					<div className="potree_accordion_body">
						{/* MEASUREMENT */}
						<div className="divider">
							<span>Measurement</span>
						</div>

						<div className="potree_toolbar">
							<button
								type="button"
								className="potree_tool_icon"
								onClick={() => startMeasurement('angle')}
								title="Angle measurement"
							>
								<img src={`${resPath}/icons/angle.png`} alt="Angle" />
							</button>
							<button
								type="button"
								className="potree_tool_icon"
								onClick={() => startMeasurement('point')}
								title="Point coordinates"
							>
								<img src={`${resPath}/icons/point.svg`} alt="Point" />
							</button>
							<button
								type="button"
								className="potree_tool_icon"
								onClick={() => startMeasurement('distance')}
								title="Distance measurement"
							>
								<img src={`${resPath}/icons/distance.svg`} alt="Distance" />
							</button>
							<button
								type="button"
								className="potree_tool_icon"
								onClick={() => startMeasurement('height')}
								title="Height measurement"
							>
								<img src={`${resPath}/icons/height.svg`} alt="Height" />
							</button>
							<button
								type="button"
								className="potree_tool_icon"
								onClick={() => startMeasurement('circle')}
								title="Circle measurement"
							>
								<img src={`${resPath}/icons/circle.svg`} alt="Circle" />
							</button>
							<button
								type="button"
								className="potree_tool_icon"
								onClick={() => startMeasurement('area')}
								title="Area measurement"
							>
								<img src={`${resPath}/icons/area.svg`} alt="Area" />
							</button>
							<button
								type="button"
								className="potree_tool_icon"
								onClick={() => startMeasurement('volume')}
								title="Volume measurement"
							>
								<img src={`${resPath}/icons/volume.svg`} alt="Volume" />
							</button>
							<button
								type="button"
								className="potree_tool_icon"
								onClick={() => startMeasurement('profile')}
								title="Height profile"
							>
								<img src={`${resPath}/icons/profile.svg`} alt="Profile" />
							</button>
							<button
								type="button"
								className="potree_tool_icon"
								onClick={() => startMeasurement('clear')}
								title="Remove all measurements"
							>
								<img src={`${resPath}/icons/reset_tools.svg`} alt="Clear All" />
							</button>
						</div>

						{/* CLIPPING */}
						<div className="divider">
							<span>Clipping</span>
						</div>

						<div className="potree_toolbar">
							<button
								type="button"
								className="potree_tool_icon"
								onClick={() => {
									if (viewer?.volumeTool) {
										viewer.volumeTool.startInsertion({ clip: true, name: 'Clip Volume' });
										triggerSceneUpdate();
									}
								}}
								title="Volume clip"
							>
								<img src={`${resPath}/icons/clip_volume.svg`} alt="Clip Volume" />
							</button>
							<button
								type="button"
								className="potree_tool_icon"
								onClick={() => {
									if (viewer?.clippingTool) {
										viewer.clippingTool.startInsertion({ type: 'polygon' });
										triggerSceneUpdate();
									}
								}}
								title="Polygon clip"
							>
								<img src={`${resPath}/icons/clip-polygon.svg`} alt="Clip Polygon" />
							</button>
							<button
								type="button"
								className="potree_tool_icon"
								onClick={() => {
									if (viewer?.clippingTool) {
										viewer.clippingTool.startInsertion({ type: 'screen' });
										triggerSceneUpdate();
									}
								}}
								title="Screen box clip"
							>
								<img src={`${resPath}/icons/clip-screen.svg`} alt="Clip Screen" />
							</button>
							<button
								type="button"
								className="potree_tool_icon"
								onClick={() => {
									if (viewer?.scene) {
										viewer.scene.removeAllClipVolumes();
										triggerSceneUpdate();
									}
								}}
								title="Remove all clipping volumes"
							>
								<img src={`${resPath}/icons/remove.svg`} alt="Remove Clips" />
							</button>
						</div>

						<div className="potree_field_label">Clip Task</div>
						<div className="potree_selectgroup">
							{([
								{ key: 'NONE', label: 'None', val: ClipTask.NONE },
								{ key: 'HIGHLIGHT', label: 'Highlight', val: ClipTask.HIGHLIGHT },
								{ key: 'SHOW_INSIDE', label: 'Inside', val: ClipTask.SHOW_INSIDE },
								{ key: 'SHOW_OUTSIDE', label: 'Outside', val: ClipTask.SHOW_OUTSIDE },
							]).map(({ key, label, val }) => (
								<button
									key={key}
									type="button"
									className={`potree_selectgroup_btn ${clipTask === key ? 'active' : ''}`}
									onClick={() => {
										setClipTask(key as any);
										if (viewer) (viewer as any).setClipTask?.(val);
									}}
								>
									{label}
								</button>
							))}
						</div>

						<div className="potree_field_label">Clip Method</div>
						<div className="potree_selectgroup">
							<button
								type="button"
								className={`potree_selectgroup_btn ${clipMethod === 'INSIDE_ANY' ? 'active' : ''}`}
								onClick={() => {
									setClipMethod('INSIDE_ANY');
									if (viewer) (viewer as any).setClipMethod?.(ClipMethod.INSIDE_ANY);
								}}
							>
								Inside Any
							</button>
							<button
								type="button"
								className={`potree_selectgroup_btn ${clipMethod === 'INSIDE_ALL' ? 'active' : ''}`}
								onClick={() => {
									setClipMethod('INSIDE_ALL');
									if (viewer) (viewer as any).setClipMethod?.(ClipMethod.INSIDE_ALL);
								}}
							>
								Inside All
							</button>
						</div>

						{/* NAVIGATION */}
						<div className="divider">
							<span>Navigation</span>
						</div>

						<div className="potree_toolbar">
							<button
								type="button"
								className={`potree_tool_icon ${navMode === 'earth' ? 'active' : ''}`}
								onClick={() => {
									setNavMode('earth');
									if (viewer?.earthControls) viewer.setControls(viewer.earthControls);
								}}
								title="Earth control"
							>
								<img src={`${resPath}/icons/earth_controls_1.png`} alt="Earth" />
							</button>
							<button
								type="button"
								className={`potree_tool_icon ${navMode === 'flight' ? 'active' : ''}`}
								onClick={() => {
									setNavMode('flight');
									if (viewer?.fpControls) {
										viewer.setControls(viewer.fpControls);
										viewer.fpControls.lockElevation = false;
									}
								}}
								title="Flight control"
							>
								<img src={`${resPath}/icons/fps_controls.svg`} alt="Flight" />
							</button>
							<button
								type="button"
								className={`potree_tool_icon ${navMode === 'helicopter' ? 'active' : ''}`}
								onClick={() => {
									setNavMode('helicopter');
									if (viewer?.fpControls) {
										viewer.setControls(viewer.fpControls);
										viewer.fpControls.lockElevation = true;
									}
								}}
								title="Helicopter control"
							>
								<img src={`${resPath}/icons/helicopter_controls.svg`} alt="Helicopter" />
							</button>
							<button
								type="button"
								className={`potree_tool_icon ${navMode === 'orbit' ? 'active' : ''}`}
								onClick={() => {
									setNavMode('orbit');
									if (viewer?.orbitControls) viewer.setControls(viewer.orbitControls);
								}}
								title="Orbit control"
							>
								<img src={`${resPath}/icons/orbit_controls.svg`} alt="Orbit" />
							</button>
							<button
								type="button"
								className="potree_tool_icon"
								onClick={() => {
									viewer?.fitToScreen();
								}}
								title="Full extent"
							>
								<img src={`${resPath}/icons/focus.svg`} alt="Full extent" />
							</button>
							<button
								type="button"
								className="potree_tool_icon"
								onClick={() => {
									(viewer as any)?.toggleNavigationCube?.();
								}}
								title="Navigation Cube"
							>
								<img src={`${resPath}/icons/navigation_cube.svg`} alt="Navigation Cube" />
							</button>
						</div>

						{/* VIEW ORIENTATION CUBES */}
						<div className="potree_toolbar">
							<button
								type="button"
								className="potree_tool_icon"
								onClick={() => (viewer as any)?.setLeftView?.()}
								title="Left view"
							>
								<img src={`${resPath}/icons/left.svg`} alt="Left" />
							</button>
							<button
								type="button"
								className="potree_tool_icon"
								onClick={() => (viewer as any)?.setRightView?.()}
								title="Right view"
							>
								<img src={`${resPath}/icons/right.svg`} alt="Right" />
							</button>
							<button
								type="button"
								className="potree_tool_icon"
								onClick={() => (viewer as any)?.setFrontView?.()}
								title="Front view"
							>
								<img src={`${resPath}/icons/front.svg`} alt="Front" />
							</button>
							<button
								type="button"
								className="potree_tool_icon"
								onClick={() => (viewer as any)?.setBackView?.()}
								title="Back view"
							>
								<img src={`${resPath}/icons/back.svg`} alt="Back" />
							</button>
							<button
								type="button"
								className="potree_tool_icon"
								onClick={() => (viewer as any)?.setTopView?.()}
								title="Top view"
							>
								<img src={`${resPath}/icons/top.svg`} alt="Top" />
							</button>
							<button
								type="button"
								className="potree_tool_icon"
								onClick={() => (viewer as any)?.setBottomView?.()}
								title="Bottom view"
							>
								<img src={`${resPath}/icons/bottom.svg`} alt="Bottom" />
							</button>
						</div>

						<div className="potree_field_label">Camera Projection</div>
						<div className="potree_selectgroup">
							<button
								type="button"
								className={`potree_selectgroup_btn ${cameraProjection === 'Perspective' ? 'active' : ''}`}
								onClick={() => {
									setCameraProjection('Perspective');
									if (viewer) (viewer as any).setCameraMode?.(CameraMode.PERSPECTIVE);
								}}
							>
								Perspective
							</button>
							<button
								type="button"
								className={`potree_selectgroup_btn ${cameraProjection === 'Orthographic' ? 'active' : ''}`}
								onClick={() => {
									setCameraProjection('Orthographic');
									if (viewer) (viewer as any).setCameraMode?.(CameraMode.ORTHOGRAPHIC);
								}}
							>
								Orthographic
							</button>
						</div>

						<div className="potree_slider_row" style={{ marginTop: '10px' }}>
							<div className="potree_slider_label">
								<span>Speed</span>
								<span className="potree_slider_val">{moveSpeed.toFixed(1)}</span>
							</div>
							<input
								type="range"
								className="potree_slider"
								min={1}
								max={1000}
								step={1}
								value={moveSpeed}
								onChange={e => {
									const val = Number(e.target.value);
									setMoveSpeed(val);
									if (viewer) (viewer as any).setMoveSpeed?.(val);
								}}
							/>
						</div>
					</div>
				)}

				{/* SECTION 3: SCENE (Exact Match of Screenshot) */}
				<div
					className={`potree_accordion_header ${openSections.scene ? 'active' : ''}`}
					onClick={() => toggleSection('scene')}
				>
					<span>Scene</span>
					{openSections.scene ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
				</div>
				{openSections.scene && (
					<div className="potree_accordion_body">
						{/* Export Row */}
						<div className="potree_export_row">
							<span>Export:</span>
							<button type="button" className="potree_export_btn" onClick={() => handleExport('geojson')}>
								JSON
							</button>
							<button type="button" className="potree_export_btn" onClick={() => handleExport('dxf')}>
								DXF
							</button>
						</div>

						{/* Objects Divider */}
						<div className="divider">
							<span>Objects</span>
						</div>

						{/* Tree View (Matching jstree hierarchy from screenshot) */}
						<div className="potree_tree">
							{/* 1. Point Clouds Branch */}
							<div
								className="potree_tree_node"
								onClick={() => toggleTreeNode('pointclouds')}
								style={{ paddingLeft: '4px' }}
							>
								{treeOpen.pointclouds ? <IconChevronDown size={12} /> : <IconChevronRight size={12} />}
								<input
									type="checkbox"
									className="potree_tree_checkbox"
									checked={pointclouds.some((pc: any) => pc.visible !== false)}
									onChange={e => {
										e.stopPropagation();
										const vis = e.target.checked;
										for (const pc of pointclouds) pc.visible = vis;
										triggerSceneUpdate();
									}}
								/>
								<IconFolder size={14} color="#60a5fa" />
								<span style={{ fontWeight: 600, color: '#93c5fd' }}>Point Clouds</span>
							</div>
							{treeOpen.pointclouds && (
								<div style={{ paddingLeft: '22px' }}>
									{pointclouds.map((pc: any, idx: number) => {
										const isSelected = selectedObject === pc;
										return (
											<div
												key={pc.uuid || idx}
												className={`potree_tree_node ${isSelected ? 'selected' : ''}`}
												onClick={() => setSelectedObject(pc)}
											>
												<input
													type="checkbox"
													className="potree_tree_checkbox"
													checked={pc.visible !== false}
													onChange={e => {
														e.stopPropagation();
														pc.visible = e.target.checked;
														triggerSceneUpdate();
													}}
												/>
												<IconCloud size={14} color="#38bdf8" />
												<span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
													{pc.name || 'pointcloud'}
												</span>
												<button
													type="button"
													title="Focus Camera"
													onClick={e => {
														e.stopPropagation();
														viewer?.zoomTo?.(pc, 1, 500);
													}}
													style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 2 }}
												>
													<IconFit size={12} />
												</button>
											</div>
										);
									})}
									{pointclouds.length === 0 && (
										<div style={{ color: '#64748b', fontStyle: 'italic', padding: '2px 0 2px 24px' }}>
											(No point clouds)
										</div>
									)}
								</div>
							)}

							{/* 2. Measurements Branch */}
							<div
								className="potree_tree_node"
								onClick={() => toggleTreeNode('measurements')}
								style={{ paddingLeft: '4px' }}
							>
								{treeOpen.measurements ? <IconChevronDown size={12} /> : <IconChevronRight size={12} />}
								<input
									type="checkbox"
									className="potree_tree_checkbox"
									checked={measurements.some((m: any) => m.visible !== false)}
									onChange={e => {
										e.stopPropagation();
										const vis = e.target.checked;
										for (const m of measurements) m.visible = vis;
										triggerSceneUpdate();
									}}
								/>
								<IconFolder size={14} color="#60a5fa" />
								<span style={{ fontWeight: 600, color: '#93c5fd' }}>Measurements</span>
							</div>
							{treeOpen.measurements && (
								<div style={{ paddingLeft: '22px' }}>
									{measurements.map((m: any, idx: number) => {
										const isSelected = selectedObject === m;
										return (
											<div
												key={m.uuid || idx}
												className={`potree_tree_node ${isSelected ? 'selected' : ''}`}
												onClick={() => setSelectedObject(m)}
											>
												<input
													type="checkbox"
													className="potree_tree_checkbox"
													checked={m.visible !== false}
													onChange={e => {
														e.stopPropagation();
														m.visible = e.target.checked;
														triggerSceneUpdate();
													}}
												/>
												<IconRuler size={14} color="#f59e0b" />
												<span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
													{m.name || `Measure ${idx + 1}`}
												</span>
											</div>
										);
									})}
									{measurements.length === 0 && (
										<div style={{ color: '#64748b', fontStyle: 'italic', padding: '2px 0 2px 24px' }}>
											(No measurements)
										</div>
									)}
								</div>
							)}

							{/* 3. Annotations Branch */}
							<div
								className="potree_tree_node"
								onClick={() => toggleTreeNode('annotations')}
								style={{ paddingLeft: '4px' }}
							>
								{treeOpen.annotations ? <IconChevronDown size={12} /> : <IconChevronRight size={12} />}
								<input
									type="checkbox"
									className="potree_tree_checkbox"
									checked={annotations.some((a: any) => a.visible !== false)}
									onChange={e => {
										e.stopPropagation();
										const vis = e.target.checked;
										for (const a of annotations) a.visible = vis;
										triggerSceneUpdate();
									}}
								/>
								<IconFolder size={14} color="#60a5fa" />
								<span style={{ fontWeight: 600, color: '#93c5fd' }}>Annotations</span>
							</div>
							{treeOpen.annotations && (
								<div style={{ paddingLeft: '22px' }}>
									{annotations.map((a: any, idx: number) => (
										<div key={a.uuid || idx} className="potree_tree_node">
											<input
												type="checkbox"
												className="potree_tree_checkbox"
												checked={a.visible !== false}
												onChange={e => {
													e.stopPropagation();
													a.visible = e.target.checked;
													triggerSceneUpdate();
												}}
											/>
											<IconTag size={14} color="#10b981" />
											<span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
												{a.title || `Annotation ${idx + 1}`}
											</span>
										</div>
									))}
									{annotations.length === 0 && (
										<div style={{ color: '#64748b', fontStyle: 'italic', padding: '2px 0 2px 24px' }}>
											(No annotations)
										</div>
									)}
								</div>
							)}

							{/* 4. Other Branch */}
							<div
								className="potree_tree_node"
								onClick={() => toggleTreeNode('other')}
								style={{ paddingLeft: '4px' }}
							>
								{treeOpen.other ? <IconChevronDown size={12} /> : <IconChevronRight size={12} />}
								<input type="checkbox" className="potree_tree_checkbox" defaultChecked />
								<IconFolder size={14} color="#60a5fa" />
								<span style={{ fontWeight: 600, color: '#93c5fd' }}>Other</span>
							</div>
							{treeOpen.other && (
								<div style={{ paddingLeft: '22px' }}>
									<div className="potree_tree_node">
										<input type="checkbox" className="potree_tree_checkbox" defaultChecked />
										<IconCamera size={14} color="#c084fc" />
										<span>Camera</span>
									</div>
								</div>
							)}
						</div>

						{/* Properties Divider */}
						<div className="divider">
							<span>Properties</span>
						</div>

						{/* Selected Object Properties Panel */}
						{selectedObject ? (
							<div style={{ background: '#182635', border: '1px solid #273b50', borderRadius: 6, padding: '10px' }}>
								<div style={{ fontWeight: 700, color: '#38bdf8', marginBottom: 6, fontSize: 13 }}>
									{selectedObject.name || 'Object Properties'}
								</div>

								{/* PointCloud Specific Properties */}
								{selectedObject instanceof PointCloudOctree || selectedObject?.material ? (
									<>
										<div className="potree_slider_row">
											<div className="potree_slider_label">
												<span>Point Size:</span>
												<span>{selectedObject.material?.size || 1}</span>
											</div>
											<input
												type="range"
												className="potree_slider"
												min={0.1}
												max={10}
												step={0.1}
												defaultValue={selectedObject.material?.size || 1}
												onChange={e => {
													if (selectedObject.material) {
														selectedObject.material.size = Number(e.target.value);
													}
												}}
											/>
										</div>

										<div style={{ marginTop: 8 }}>
											<span style={{ color: '#94a3b8', fontSize: 11 }}>Attribute:</span>
											<select
												style={{
													width: '100%',
													background: '#131f2c',
													border: '1px solid #283d54',
													color: '#f8fafc',
													padding: '4px 6px',
													borderRadius: 4,
													marginTop: 4,
													fontSize: 12,
												}}
												defaultValue="RGB"
												onChange={e => {
													const mat = selectedObject.material;
													if (mat && (viewer as any).PointColorType) {
														mat.pointColorType = (viewer as any).PointColorType[e.target.value] || mat.pointColorType;
													}
												}}
											>
												<option value="RGB">RGB</option>
												<option value="ELEVATION">Elevation</option>
												<option value="INTENSITY">Intensity</option>
												<option value="CLASSIFICATION">Classification</option>
												<option value="RETURN_NUMBER">Return Number</option>
												<option value="NORMAL">Normal</option>
											</select>
										</div>
									</>
								) : (
									/* Measurement Specific Properties */
									<>
										{selectedObject.points && (
											<div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
												Points: {selectedObject.points.length}
											</div>
										)}
										<button
											type="button"
											onClick={() => {
												viewer?.scene?.removeMeasurement?.(selectedObject);
												setSelectedObject(null);
												triggerSceneUpdate();
											}}
											style={{
												marginTop: 8,
												width: '100%',
												background: '#ef4444',
												border: 'none',
												color: '#fff',
												padding: '6px',
												borderRadius: 4,
												fontSize: 11,
												fontWeight: 600,
												cursor: 'pointer',
											}}
										>
											Remove Object
										</button>
									</>
								)}
							</div>
						) : (
							<div style={{ color: '#64748b', fontStyle: 'italic', padding: '10px 0', textAlign: 'center' }}>
								(Select an object in tree to view properties)
							</div>
						)}
					</div>
				)}

				{/* SECTION 4: CLASSIFICATION FILTER */}
				<div
					className={`potree_accordion_header ${openSections.classification ? 'active' : ''}`}
					onClick={() => toggleSection('classification')}
				>
					<span>Classification filter</span>
					{openSections.classification ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
				</div>
				{openSections.classification && (
					<div className="potree_accordion_body">
						<div className="divider">
							<span>Classification</span>
						</div>

						<div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
							<button
								type="button"
								className="potree_selectgroup_btn"
								onClick={() => setAllClasses(true)}
							>
								Select All
							</button>
							<button
								type="button"
								className="potree_selectgroup_btn"
								onClick={() => setAllClasses(false)}
							>
								Invert
							</button>
						</div>

						<div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
							{classes.map(c => (
								<label
									key={c.code}
									style={{
										display: 'flex',
										alignItems: 'center',
										gap: 6,
										cursor: 'pointer',
										padding: '2px 4px',
										borderRadius: 3,
									}}
								>
									<input
										type="checkbox"
										className="potree_tree_checkbox"
										checked={c.visible}
										onChange={() => toggleClassVisibility(c.code)}
									/>
									<span
										style={{
											width: 12,
											height: 12,
											backgroundColor: c.color,
											borderRadius: 2,
											display: 'inline-block',
											flexShrink: 0,
										}}
									/>
									<span style={{ fontSize: 11, color: '#e2e8f0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
										{c.code}: {c.name}
									</span>
								</label>
							))}
						</div>

						<div className="divider">
							<span>Returns</span>
						</div>

						<div className="potree_slider_row">
							<div className="potree_slider_label">
								<span>Return Number:</span>
								<span>All</span>
							</div>
							<input type="range" className="potree_slider" min={0} max={7} defaultValue={0} />
						</div>

						<div className="potree_slider_row">
							<div className="potree_slider_label">
								<span>Number of Returns:</span>
								<span>All</span>
							</div>
							<input type="range" className="potree_slider" min={0} max={7} defaultValue={7} />
						</div>
					</div>
				)}

				{/* SECTION 5: ABOUT */}
				<div
					className={`potree_accordion_header ${openSections.about ? 'active' : ''}`}
					onClick={() => toggleSection('about')}
				>
					<span>About</span>
					{openSections.about ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
				</div>
				{openSections.about && (
					<div className="potree_accordion_body" style={{ color: '#94a3b8', lineHeight: 1.5, fontSize: 11 }}>
						<p style={{ margin: '0 0 8px 0' }}>
							<a href="http://potree.org" target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>
								Potree
							</a>{' '}
							is a WebGL point cloud viewer for large datasets, developed at TU Wien.
						</p>
						<p style={{ margin: '0 0 6px 0' }}>
							<b>Author:</b> Markus Schütz
						</p>
						<p style={{ margin: '0 0 6px 0' }}>
							<b>License:</b> FreeBSD (2-clause BSD)
						</p>
						<p style={{ margin: '0 0 6px 0' }}>
							<b>GitHub:</b>{' '}
							<a href="https://github.com/potree/potree" target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>
								potree/potree
							</a>
						</p>
						<div className="divider">
							<span>Funding</span>
						</div>
						<div style={{ fontSize: 10, color: '#64748b' }}>
							Harvest4D, LargeClouds2BIM, Superhumans, FFG, GCD Doctoral College, TU Wien.
						</div>
					</div>
				)}
			</aside>
		</>
	);
};
