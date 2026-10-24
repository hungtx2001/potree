import React, { useState, useEffect, useCallback } from 'react';
import type { Viewer } from '../../types/index.js';
import {
	IconEye,
	IconTool,
	IconFilter,
	IconLayers,
	IconSettings,
	IconClose,
	IconChevronRight,
	IconChevronDown,
	IconBox,
	IconRuler,
	IconDownload,
} from './icons.js';
import { MeasurementPanel } from './MeasurementPanel.js';
import { ClassificationFilterPanel } from './ClassificationFilterPanel.js';
import { PointCloudPropertyPanel } from './PointCloudPropertyPanel.js';
import { SelectedObjectInspector } from './SelectedObjectInspector.js';
import { PointCloudOctree } from '../PointCloudOctree.js';
import { Exporters } from '../core/tools/Exporters.js';

export interface PotreeSidebarProps {
	viewer?: Viewer | null;
	isOpen?: boolean;
	onClose?: () => void;
	onOpenProfile?: () => void;
	className?: string;
	style?: React.CSSProperties;
}

export const PotreeSidebar: React.FC<PotreeSidebarProps> = ({
	viewer,
	isOpen = true,
	onClose,
	onOpenProfile,
	className = '',
	style,
}) => {
	const [activeTab, setActiveTab] = useState<'appearance' | 'tools' | 'classification' | 'scene'>('appearance');

	// Appearance State
	const [pointBudget, setPointBudget] = useState<number>(2_000_000);
	const [fov, setFov] = useState<number>(60);
	const [edlEnabled, setEdlEnabled] = useState<boolean>(true);
	const [edlRadius, setEdlRadius] = useState<number>(1.4);
	const [edlStrength, setEdlStrength] = useState<number>(0.8);
	const [background, setBackgroundState] = useState<'gradient' | 'skybox' | 'black' | 'white' | 'none'>('gradient');
	const [showBoundingBox, setShowBoundingBox] = useState<boolean>(false);

	// Scene Selection State
	const [selectedObject, setSelectedObject] = useState<any>(null);
	const [, setSceneVersion] = useState<number>(0);

	// Refresh trigger for scene objects
	const triggerSceneUpdate = useCallback(() => {
		setSceneVersion(v => v + 1);
	}, []);

	// Sync with Viewer
	useEffect(() => {
		if (!viewer) return;

		viewer.setPointBudget(pointBudget);
		viewer.setFOV(fov);
		viewer.setEDLEnabled(edlEnabled);
		viewer.setBackground(background);

		if (viewer.scene && viewer.scene.pointclouds) {
			for (const pc of viewer.scene.pointclouds) {
				const mat = (pc as any).material;
				if (mat) {
					if (typeof mat.edlRadius !== 'undefined') mat.edlRadius = edlRadius;
					if (typeof mat.edlStrength !== 'undefined') mat.edlStrength = edlStrength;
				}
			}
		}

		if (typeof (viewer as any).setShowBoundingBox === 'function') {
			(viewer as any).setShowBoundingBox(showBoundingBox);
		}
	}, [viewer, pointBudget, fov, edlEnabled, edlRadius, edlStrength, background, showBoundingBox]);

	// Listen to scene changes (pointcloud added, measurements added/removed)
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

	if (!isOpen) return null;

	const tabs = [
		{ id: 'appearance', label: 'Hiển thị', icon: <IconEye size={16} /> },
		{ id: 'tools', label: 'Công cụ', icon: <IconTool size={16} /> },
		{ id: 'classification', label: 'Phân loại', icon: <IconFilter size={16} /> },
		{ id: 'scene', label: 'Đối tượng', icon: <IconLayers size={16} /> },
	] as const;

	const pointclouds = viewer?.scene?.pointclouds || [];
	const measurements = viewer?.scene?.measurements || [];
	const volumes = viewer?.scene?.volumes || [];
	const profiles = viewer?.scene?.profiles || [];

	const handleToggleVisibility = (item: any) => {
		item.visible = !item.visible;
		triggerSceneUpdate();
	};

	const handleExportScene = (type: 'geojson' | 'dxf') => {
		if (!viewer || !viewer.scene) return;
		const allItems = [...measurements, ...profiles, ...volumes];
		if (allItems.length === 0) return;

		if (type === 'geojson') {
			const json = Exporters.toGeoJSON(allItems as any);
			Exporters.downloadFile('measurements.geojson', json, 'application/json');
		} else if (type === 'dxf') {
			const dxf = Exporters.toDXF(allItems as any);
			Exporters.downloadFile('measurements.dxf', dxf, 'application/dxf');
		}
	};

	return (
		<aside
			className={`potree-glass potree-react-sidebar ${className}`}
			style={{
				position: 'absolute',
				top: '20px',
				left: '20px',
				bottom: '20px',
				width: '380px',
				borderRadius: '16px',
				backdropFilter: 'blur(24px)',
				background: 'rgba(15, 23, 42, 0.90)',
				border: '1px solid rgba(255, 255, 255, 0.12)',
				boxShadow: '0 16px 48px rgba(0, 0, 0, 0.65)',
				display: 'flex',
				flexDirection: 'column',
				overflow: 'hidden',
				zIndex: 1000,
				fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
				color: '#f8fafc',
				...style,
			}}
		>
			{/* Header */}
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					padding: '14px 18px',
					borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
					background: 'rgba(255, 255, 255, 0.02)',
				}}
			>
				<div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
					<span
						style={{
							width: '10px',
							height: '10px',
							borderRadius: '50%',
							background: '#38bdf8',
							boxShadow: '0 0 10px #38bdf8',
						}}
					/>
					<span style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.4px', color: '#f8fafc' }}>
						POTREE 3D ENGINE
					</span>
					<span
						style={{
							fontSize: '10px',
							background: 'rgba(56, 189, 248, 0.16)',
							color: '#38bdf8',
							padding: '2px 6px',
							borderRadius: '6px',
							fontWeight: 600,
						}}
					>
						v2.0
					</span>
				</div>

				{onClose && (
					<button
						type="button"
						onClick={onClose}
						title="Thu gọn Sidebar"
						style={{
							background: 'none',
							border: 'none',
							color: 'rgba(255, 255, 255, 0.6)',
							cursor: 'pointer',
							padding: '4px',
							display: 'flex',
							alignItems: 'center',
							borderRadius: '6px',
						}}
					>
						<IconClose size={18} />
					</button>
				)}
			</div>

			{/* Modern Tab Bar */}
			<div
				style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(4, 1fr)',
					borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
					background: 'rgba(0, 0, 0, 0.2)',
				}}
			>
				{tabs.map(tab => {
					const isActive = activeTab === tab.id;
					return (
						<button
							key={tab.id}
							type="button"
							onClick={() => setActiveTab(tab.id)}
							style={{
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
								gap: '4px',
								padding: '10px 4px',
								background: isActive ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
								border: 'none',
								borderBottom: isActive ? '2px solid #38bdf8' : '2px solid transparent',
								color: isActive ? '#38bdf8' : 'rgba(255, 255, 255, 0.6)',
								fontSize: '11px',
								fontWeight: isActive ? 600 : 500,
								cursor: 'pointer',
								transition: 'all 0.15s ease',
							}}
						>
							{tab.icon}
							<span>{tab.label}</span>
						</button>
					);
				})}
			</div>

			{/* Tab Content Body */}
			<div
				style={{
					flex: 1,
					overflowY: 'auto',
					padding: '16px 18px',
					display: 'flex',
					flexDirection: 'column',
					gap: '16px',
				}}
			>
				{/* 1. APPEARANCE TAB */}
				{activeTab === 'appearance' && (
					<div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
						{/* Point Budget */}
						<div>
							<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
								<span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>Mật độ điểm hiển thị:</span>
								<span style={{ fontSize: '12px', fontWeight: 600, color: '#38bdf8' }}>
									{(pointBudget / 1_000_000).toFixed(1)}M điểm
								</span>
							</div>
							<input
								type="range"
								min={100_000}
								max={10_000_000}
								step={200_000}
								value={pointBudget}
								onChange={e => setPointBudget(Number(e.target.value))}
								style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer' }}
							/>
						</div>

						{/* Field of View */}
						<div>
							<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
								<span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>Góc nhìn camera (FOV):</span>
								<span style={{ fontSize: '12px', fontWeight: 600, color: '#38bdf8' }}>{fov}°</span>
							</div>
							<input
								type="range"
								min={20}
								max={100}
								step={1}
								value={fov}
								onChange={e => setFov(Number(e.target.value))}
								style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer' }}
							/>
						</div>

						{/* Eye-Dome Lighting (EDL) */}
						<div
							style={{
								padding: '12px',
								borderRadius: '10px',
								background: 'rgba(255, 255, 255, 0.04)',
								border: '1px solid rgba(255, 255, 255, 0.08)',
							}}
						>
							<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
								<span style={{ fontSize: '12px', fontWeight: 600 }}>Tăng cường độ nổi 3D (EDL)</span>
								<input
									type="checkbox"
									checked={edlEnabled}
									onChange={e => setEdlEnabled(e.target.checked)}
									style={{ accentColor: '#38bdf8', width: '16px', height: '16px', cursor: 'pointer' }}
								/>
							</div>

							{edlEnabled && (
								<div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
									<div>
										<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
											<span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>Bán kính bóng đổ:</span>
											<span style={{ fontSize: '11px', color: '#38bdf8' }}>{edlRadius.toFixed(1)}</span>
										</div>
										<input
											type="range"
											min={0.5}
											max={3}
											step={0.1}
											value={edlRadius}
											onChange={e => setEdlRadius(Number(e.target.value))}
											style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer' }}
										/>
									</div>

									<div>
										<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
											<span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>Cường độ viền nổi:</span>
											<span style={{ fontSize: '11px', color: '#38bdf8' }}>{edlStrength.toFixed(1)}</span>
										</div>
										<input
											type="range"
											min={0.1}
											max={3}
											step={0.1}
											value={edlStrength}
											onChange={e => setEdlStrength(Number(e.target.value))}
											style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer' }}
										/>
									</div>
								</div>
							)}
						</div>

						{/* Background */}
						<div>
							<span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '8px' }}>
								Màu nền hiển thị (Background)
							</span>
							<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
								{(['gradient', 'black', 'white', 'skybox', 'none'] as const).map(bg => (
									<button
										key={bg}
										type="button"
										onClick={() => setBackgroundState(bg)}
										style={{
											padding: '7px 4px',
											borderRadius: '6px',
											fontSize: '11px',
											textTransform: 'capitalize',
											background: background === bg ? 'rgba(56, 189, 248, 0.28)' : 'rgba(255,255,255,0.05)',
											color: background === bg ? '#38bdf8' : '#f8fafc',
											border: background === bg ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
											cursor: 'pointer',
											fontWeight: background === bg ? 600 : 400,
										}}
									>
										{bg}
									</button>
								))}
							</div>
						</div>
					</div>
				)}

				{/* 2. TOOLS TAB */}
				{activeTab === 'tools' && (
					<div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
						<MeasurementPanel viewer={viewer} style={{ background: 'transparent', border: 'none', padding: 0, boxShadow: 'none' }} />

						<div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>
							<span style={{ fontSize: '11px', color: '#93c5fd', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
								Cắt lát địa hình & Tuyến dây
							</span>
							<button
								type="button"
								onClick={onOpenProfile}
								style={{
									width: '100%',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									gap: '8px',
									padding: '10px',
									borderRadius: '8px',
									background: 'rgba(56, 189, 248, 0.15)',
									border: '1px solid #38bdf8',
									color: '#f8fafc',
									fontSize: '12px',
									fontWeight: 600,
									cursor: 'pointer',
								}}
							>
								<span>📊 Mở cửa sổ mặt cắt 3D (Profile Viewer)</span>
							</button>
						</div>
					</div>
				)}

				{/* 3. CLASSIFICATION TAB */}
				{activeTab === 'classification' && (
					<ClassificationFilterPanel viewer={viewer} style={{ background: 'transparent', border: 'none', padding: 0, boxShadow: 'none', maxWidth: '100%' }} />
				)}

				{/* 4. SCENE / OBJECTS TAB */}
				{activeTab === 'scene' && (
					<div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
						{/* Selected Object Inspector View */}
						{selectedObject ? (
							<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
								<button
									type="button"
									onClick={() => setSelectedObject(null)}
									style={{
										background: 'rgba(255,255,255,0.06)',
										border: '1px solid rgba(255,255,255,0.1)',
										color: '#93c5fd',
										padding: '6px 10px',
										borderRadius: '6px',
										fontSize: '11px',
										cursor: 'pointer',
										textAlign: 'left',
										display: 'inline-flex',
										alignItems: 'center',
										gap: '6px',
										width: 'fit-content',
									}}
								>
									← Quay lại cây đối tượng
								</button>

								{selectedObject instanceof PointCloudOctree ? (
									<PointCloudPropertyPanel pointcloud={selectedObject} />
								) : (
									<SelectedObjectInspector
										object={selectedObject}
										viewer={viewer}
										onDeselect={() => setSelectedObject(null)}
									/>
								)}
							</div>
						) : (
							/* Scene Hierarchy Tree View */
							<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
								{/* Global Bounding Box Switch */}
								<label
									style={{
										display: 'flex',
										alignItems: 'center',
										gap: '8px',
										padding: '8px 10px',
										borderRadius: '8px',
										background: 'rgba(255, 255, 255, 0.05)',
										cursor: 'pointer',
									}}
								>
									<input
										type="checkbox"
										checked={showBoundingBox}
										onChange={e => setShowBoundingBox(e.target.checked)}
										style={{ accentColor: '#38bdf8' }}
									/>
									<IconBox size={16} color="#93c5fd" />
									<span style={{ fontSize: '12px' }}>Hiển thị khung bao (Bounding Box)</span>
								</label>

								{/* Export Section */}
								{(measurements.length > 0 || volumes.length > 0) && (
									<div
										style={{
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'space-between',
											padding: '8px 10px',
											background: 'rgba(255,255,255,0.03)',
											borderRadius: '8px',
											border: '1px solid rgba(255,255,255,0.06)',
										}}
									>
										<span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>Xuất kết quả đo:</span>
										<div style={{ display: 'flex', gap: '6px' }}>
											<button
												type="button"
												onClick={() => handleExportScene('geojson')}
												style={{
													background: 'rgba(56, 189, 248, 0.2)',
													border: '1px solid rgba(56, 189, 248, 0.4)',
													color: '#38bdf8',
													borderRadius: '6px',
													padding: '4px 8px',
													fontSize: '10px',
													cursor: 'pointer',
													fontWeight: 500,
												}}
											>
												GeoJSON
											</button>
											<button
												type="button"
												onClick={() => handleExportScene('dxf')}
												style={{
													background: 'rgba(56, 189, 248, 0.2)',
													border: '1px solid rgba(56, 189, 248, 0.4)',
													color: '#38bdf8',
													borderRadius: '6px',
													padding: '4px 8px',
													fontSize: '10px',
													cursor: 'pointer',
													fontWeight: 500,
												}}
											>
												DXF CAD
											</button>
										</div>
									</div>
								)}

								{/* Point Clouds Section */}
								<div>
									<span style={{ fontSize: '11px', fontWeight: 600, color: '#93c5fd', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
										Đám mây điểm ({pointclouds.length})
									</span>
									<div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
										{pointclouds.map((pc: any, idx: number) => (
											<div
												key={idx}
												style={{
													display: 'flex',
													alignItems: 'center',
													justifyContent: 'space-between',
													padding: '8px 10px',
													borderRadius: '8px',
													background: 'rgba(255, 255, 255, 0.04)',
													border: '1px solid rgba(255, 255, 255, 0.08)',
													cursor: 'pointer',
												}}
												onClick={() => setSelectedObject(pc)}
											>
												<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
													<IconBox size={14} color="#38bdf8" />
													<span style={{ fontSize: '12px', fontWeight: 500 }}>{pc.name || `Tập điểm ${idx + 1}`}</span>
												</div>
												<button
													type="button"
													onClick={e => {
														e.stopPropagation();
														handleToggleVisibility(pc);
													}}
													style={{
														background: 'none',
														border: 'none',
														color: pc.visible !== false ? '#38bdf8' : 'rgba(255,255,255,0.3)',
														cursor: 'pointer',
														padding: '2px',
													}}
												>
													<IconEye size={16} />
												</button>
											</div>
										))}
									</div>
								</div>

								{/* Measurements Section */}
								{measurements.length > 0 && (
									<div>
										<span style={{ fontSize: '11px', fontWeight: 600, color: '#4ade80', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
											Đo đạc ({measurements.length})
										</span>
										<div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
											{measurements.map((m: any, idx: number) => (
												<div
													key={idx}
													style={{
														display: 'flex',
														alignItems: 'center',
														justifyContent: 'space-between',
														padding: '8px 10px',
														borderRadius: '8px',
														background: 'rgba(255, 255, 255, 0.04)',
														border: '1px solid rgba(255, 255, 255, 0.08)',
														cursor: 'pointer',
													}}
													onClick={() => setSelectedObject(m)}
												>
													<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
														<IconRuler size={14} color="#4ade80" />
														<span style={{ fontSize: '12px' }}>{m.name || `Đo đạc ${idx + 1}`}</span>
													</div>
													<button
														type="button"
														onClick={e => {
															e.stopPropagation();
															handleToggleVisibility(m);
														}}
														style={{
															background: 'none',
															border: 'none',
															color: m.visible !== false ? '#4ade80' : 'rgba(255,255,255,0.3)',
															cursor: 'pointer',
															padding: '2px',
														}}
													>
														<IconEye size={16} />
													</button>
												</div>
											))}
										</div>
									</div>
								)}

								{/* Volumes Section */}
								{volumes.length > 0 && (
									<div>
										<span style={{ fontSize: '11px', fontWeight: 600, color: '#fbbf24', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
											Khối cắt ({volumes.length})
										</span>
										<div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
											{volumes.map((vol: any, idx: number) => (
												<div
													key={idx}
													style={{
														display: 'flex',
														alignItems: 'center',
														justifyContent: 'space-between',
														padding: '8px 10px',
														borderRadius: '8px',
														background: 'rgba(255, 255, 255, 0.04)',
														border: '1px solid rgba(255, 255, 255, 0.08)',
														cursor: 'pointer',
													}}
													onClick={() => setSelectedObject(vol)}
												>
													<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
														<IconBox size={14} color="#fbbf24" />
														<span style={{ fontSize: '12px' }}>{vol.name || `Khối cắt ${idx + 1}`}</span>
													</div>
													<button
														type="button"
														onClick={e => {
															e.stopPropagation();
															handleToggleVisibility(vol);
														}}
														style={{
															background: 'none',
															border: 'none',
															color: vol.visible !== false ? '#fbbf24' : 'rgba(255,255,255,0.3)',
															cursor: 'pointer',
															padding: '2px',
														}}
													>
														<IconEye size={16} />
													</button>
												</div>
											))}
										</div>
									</div>
								)}
							</div>
						)}
					</div>
				)}
			</div>
		</aside>
	);
};
