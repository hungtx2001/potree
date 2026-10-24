import React, { useState, useEffect } from 'react';
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
} from './icons.js';
import { MeasurementPanel } from './MeasurementPanel.js';
import { ClassificationFilterPanel } from './ClassificationFilterPanel.js';

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

	if (!isOpen) return null;

	const tabs = [
		{ id: 'appearance', label: 'Hiển thị', icon: <IconEye size={16} /> },
		{ id: 'tools', label: 'Công cụ', icon: <IconTool size={16} /> },
		{ id: 'classification', label: 'Phân loại', icon: <IconFilter size={16} /> },
		{ id: 'scene', label: 'Đối tượng', icon: <IconLayers size={16} /> },
	] as const;

	return (
		<aside
			className={`potree-glass potree-react-sidebar ${className}`}
			style={{
				position: 'absolute',
				top: '20px',
				left: '20px',
				bottom: '20px',
				width: '360px',
				borderRadius: '16px',
				backdropFilter: 'blur(24px)',
				background: 'rgba(17, 22, 33, 0.88)',
				border: '1px solid rgba(255, 255, 255, 0.12)',
				boxShadow: '0 16px 48px rgba(0, 0, 0, 0.55)',
				display: 'flex',
				flexDirection: 'column',
				overflow: 'hidden',
				zIndex: 1000,
				fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
				color: '#fff',
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
				<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
					<span
						style={{
							width: '10px',
							height: '10px',
							borderRadius: '50%',
							background: '#4f8cfc',
							boxShadow: '0 0 10px #4f8cfc',
						}}
					/>
					<span style={{ fontWeight: 700, fontSize: '13px', letterSpacing: '0.5px', color: '#e1e7f5' }}>
						POTREE 3.0 ENGINE
					</span>
				</div>
				{onClose && (
					<button
						type="button"
						onClick={onClose}
						style={{
							background: 'none',
							border: 'none',
							color: 'rgba(255, 255, 255, 0.5)',
							cursor: 'pointer',
							padding: '4px',
							borderRadius: '6px',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						<IconClose size={16} />
					</button>
				)}
			</div>

			{/* Navigation Tabs */}
			<div
				style={{
					display: 'flex',
					padding: '6px 12px',
					gap: '4px',
					background: 'rgba(0, 0, 0, 0.25)',
					borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
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
								flex: 1,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								gap: '6px',
								padding: '8px 4px',
								borderRadius: '8px',
								fontSize: '11px',
								fontWeight: isActive ? 600 : 500,
								background: isActive ? 'rgba(79, 140, 252, 0.22)' : 'transparent',
								color: isActive ? '#4f8cfc' : 'rgba(255, 255, 255, 0.65)',
								border: isActive ? '1px solid rgba(79, 140, 252, 0.4)' : '1px solid transparent',
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

			{/* Tab Body */}
			<div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
				{/* 1. APPEARANCE TAB */}
				{activeTab === 'appearance' && (
					<div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
						{/* Point Budget */}
						<div>
							<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px' }}>
								<span style={{ color: 'rgba(255,255,255,0.7)' }}>Mật độ điểm (Point Budget)</span>
								<span style={{ color: '#4f8cfc', fontWeight: 600, fontFamily: 'monospace' }}>
									{(pointBudget / 1_000_000).toFixed(1)}M
								</span>
							</div>
							<input
								type="range"
								min={500_000}
								max={10_000_000}
								step={500_000}
								value={pointBudget}
								onChange={e => setPointBudget(Number(e.target.value))}
								style={{ width: '100%', accentColor: '#4f8cfc', cursor: 'pointer' }}
							/>
						</div>

						{/* FOV */}
						<div>
							<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px' }}>
								<span style={{ color: 'rgba(255,255,255,0.7)' }}>Góc nhìn camera (FOV)</span>
								<span style={{ color: '#4f8cfc', fontWeight: 600, fontFamily: 'monospace' }}>{fov}°</span>
							</div>
							<input
								type="range"
								min={30}
								max={100}
								step={1}
								value={fov}
								onChange={e => setFov(Number(e.target.value))}
								style={{ width: '100%', accentColor: '#4f8cfc', cursor: 'pointer' }}
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
							<label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: edlEnabled ? '10px' : 0 }}>
								<span style={{ fontSize: '12px', fontWeight: 600, color: '#e1e7f5' }}>Hiệu ứng Eye-Dome Lighting (EDL)</span>
								<input
									type="checkbox"
									checked={edlEnabled}
									onChange={e => setEdlEnabled(e.target.checked)}
									style={{ accentColor: '#4f8cfc', cursor: 'pointer' }}
								/>
							</label>

							{edlEnabled && (
								<div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '6px' }}>
									<div>
										<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>
											<span>Bán kính viền (Radius)</span>
											<span>{edlRadius.toFixed(1)}</span>
										</div>
										<input
											type="range"
											min={0.5}
											max={4}
											step={0.1}
											value={edlRadius}
											onChange={e => setEdlRadius(Number(e.target.value))}
											style={{ width: '100%', accentColor: '#4f8cfc', cursor: 'pointer' }}
										/>
									</div>
									<div>
										<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>
											<span>Độ nổi khối (Strength)</span>
											<span>{edlStrength.toFixed(1)}</span>
										</div>
										<input
											type="range"
											min={0.1}
											max={3}
											step={0.1}
											value={edlStrength}
											onChange={e => setEdlStrength(Number(e.target.value))}
											style={{ width: '100%', accentColor: '#4f8cfc', cursor: 'pointer' }}
										/>
									</div>
								</div>
							)}
						</div>

						{/* Background */}
						<div>
							<span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '8px' }}>
								Màu nền (Background)
							</span>
							<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
								{(['gradient', 'black', 'white', 'skybox', 'none'] as const).map(bg => (
									<button
										key={bg}
										type="button"
										onClick={() => setBackgroundState(bg)}
										style={{
											padding: '6px',
											borderRadius: '6px',
											fontSize: '11px',
											textTransform: 'capitalize',
											background: background === bg ? 'rgba(79, 140, 252, 0.28)' : 'rgba(255,255,255,0.05)',
											color: background === bg ? '#4f8cfc' : '#fff',
											border: background === bg ? '1px solid #4f8cfc' : '1px solid rgba(255,255,255,0.1)',
											cursor: 'pointer',
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
							<span style={{ fontSize: '11px', color: '#8ea9db', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
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
									background: 'rgba(79, 140, 252, 0.15)',
									border: '1px solid #4f8cfc',
									color: '#fff',
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

				{/* 4. SCENE TAB */}
				{activeTab === 'scene' && (
					<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
								style={{ accentColor: '#4f8cfc' }}
							/>
							<IconBox size={16} color="#8ea9db" />
							<span style={{ fontSize: '12px' }}>Hiển thị khung bao (Bounding Box)</span>
						</label>

						<div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>
							Đang tải: {viewer?.scene?.pointclouds?.length || 0} tập dữ liệu đám mây điểm.
						</div>
					</div>
				)}
			</div>
		</aside>
	);
};
