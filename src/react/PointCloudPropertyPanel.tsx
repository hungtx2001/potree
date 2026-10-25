import React, { useState, useEffect } from 'react';
import type { PointCloudOctree } from '../core/octree/PointCloudOctree.js';
import { PointSizeType, PointShape } from '../core/types.js';
import { Gradients } from '../core/materials/Gradients.js';

export interface PointCloudPropertyPanelProps {
	pointcloud: PointCloudOctree | null;
	className?: string;
	style?: React.CSSProperties;
}

const COLOR_MODES = [
	{ id: 'rgba', label: 'Màu thực tế (RGB)' },
	{ id: 'elevation', label: 'Cao độ (Elevation)' },
	{ id: 'intensity', label: 'Cường độ (Intensity)' },
	{ id: 'classification', label: 'Phân loại (Classification)' },
	{ id: 'return_number', label: 'Số tia phản xạ (Returns)' },
	{ id: 'normal', label: 'Pháp tuyến (Normals)' },
	{ id: 'gps-time', label: 'Thời gian GPS' },
] as const;

const GRADIENT_OPTIONS = [
	{ id: 'SPECTRAL', label: 'Quang phổ (Spectral)', gradient: Gradients.SPECTRAL },
	{ id: 'RAINBOW', label: 'Cầu vồng (Rainbow)', gradient: Gradients.RAINBOW },
	{ id: 'VIRIDIS', label: 'Viridis (Khoa học)', gradient: Gradients.VIRIDIS },
	{ id: 'PLASMA', label: 'Plasma', gradient: Gradients.PLASMA },
	{ id: 'INFERNO', label: 'Inferno', gradient: Gradients.INFERNO },
] as const;

export const PointCloudPropertyPanel: React.FC<PointCloudPropertyPanelProps> = ({
	pointcloud,
	className = '',
	style,
}) => {
	const material = pointcloud?.material as any;

	const [pointSize, setPointSize] = useState<number>(material?.size || 1.0);
	const [minSize, setMinSize] = useState<number>(material?.minSize || 2.0);
	const [pointSizeType, setPointSizeTypeState] = useState<number>(material?.pointSizeType ?? PointSizeType.ADAPTIVE);
	const [shape, setShapeState] = useState<number>(material?.shape ?? PointShape.CIRCLE);
	const [activeAttribute, setActiveAttribute] = useState<string>(material?.activeAttributeName || 'rgba');
	const [opacity, setOpacityState] = useState<number>(material?.opacity ?? 1.0);
	const [gradientName, setGradientName] = useState<string>('SPECTRAL');

	// Sync local state when pointcloud changes
	useEffect(() => {
		if (!material) return;
		setPointSize(material.size || 1.0);
		setMinSize(material.minSize || 2.0);
		setPointSizeTypeState(material.pointSizeType ?? PointSizeType.ADAPTIVE);
		setShapeState(material.shape ?? PointShape.CIRCLE);
		setActiveAttribute(material.activeAttributeName || 'rgba');
		setOpacityState(material.opacity ?? 1.0);
	}, [pointcloud, material]);

	if (!pointcloud || !material) {
		return (
			<div style={{ padding: '16px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
				Chọn một tập dữ liệu đám mây điểm để hiệu chỉnh thuộc tính.
			</div>
		);
	}

	const handlePointSizeChange = (val: number) => {
		setPointSize(val);
		material.size = val;
	};

	const handleMinSizeChange = (val: number) => {
		setMinSize(val);
		material.minSize = val;
	};

	const handleSizeTypeChange = (type: number) => {
		setPointSizeTypeState(type);
		material.pointSizeType = type;
	};

	const handleShapeChange = (val: number) => {
		setShapeState(val);
		material.shape = val;
	};

	const handleAttributeChange = (attr: string) => {
		setActiveAttribute(attr);
		material.activeAttributeName = attr;
	};

	const handleOpacityChange = (val: number) => {
		setOpacityState(val);
		material.opacity = val;
	};

	const handleGradientChange = (name: string) => {
		setGradientName(name);
		const found = GRADIENT_OPTIONS.find(g => g.id === name);
		if (found && typeof material.setGradient === 'function') {
			material.setGradient(found.gradient);
		} else if (found) {
			material.gradient = found.gradient;
		}
	};

	return (
		<div
			className={`potree-pointcloud-properties ${className}`}
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: '14px',
				fontSize: '12px',
				color: '#f8fafc',
				...style,
			}}
		>
			{/* Cloud Title Badge */}
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					padding: '8px 10px',
					borderRadius: '8px',
					background: 'rgba(59, 130, 246, 0.12)',
					border: '1px solid rgba(59, 130, 246, 0.24)',
				}}
			>
				<span style={{ fontWeight: 600, color: '#93c5fd' }}>
					{pointcloud.name || 'Point Cloud'}
				</span>
				<span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>
					{(pointcloud as any).numPoints ? `${(pointcloud as any).numPoints.toLocaleString()} điểm` : 'Octree 2.0'}
				</span>
			</div>

			{/* Point Size */}
			<div>
				<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
					<span style={{ color: 'rgba(255,255,255,0.7)' }}>Kích cỡ điểm (Point Size):</span>
					<span style={{ fontWeight: 600, color: '#60a5fa' }}>{pointSize.toFixed(1)} px</span>
				</div>
				<input
					type="range"
					min={0.1}
					max={5.0}
					step={0.1}
					value={pointSize}
					onChange={e => handlePointSizeChange(Number(e.target.value))}
					style={{ width: '100%', accentColor: '#3b82f6', cursor: 'pointer' }}
				/>
			</div>

			{/* Min Point Size */}
			<div>
				<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
					<span style={{ color: 'rgba(255,255,255,0.7)' }}>Kích cỡ tối thiểu (Min Size):</span>
					<span style={{ fontWeight: 600, color: '#60a5fa' }}>{minSize.toFixed(1)} px</span>
				</div>
				<input
					type="range"
					min={0.5}
					max={10.0}
					step={0.5}
					value={minSize}
					onChange={e => handleMinSizeChange(Number(e.target.value))}
					style={{ width: '100%', accentColor: '#3b82f6', cursor: 'pointer' }}
				/>
			</div>

			{/* Point Sizing Type */}
			<div>
				<span style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '6px' }}>
					Chế độ co giãn điểm (Sizing Type):
				</span>
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
					{[
						{ id: PointSizeType.FIXED, label: 'Cố định (Fixed)' },
						{ id: PointSizeType.ADAPTIVE, label: 'Tự thích ứng (Adaptive)' },
					].map(opt => (
						<button
							key={opt.id}
							type="button"
							onClick={() => handleSizeTypeChange(opt.id)}
							style={{
								padding: '6px 8px',
								borderRadius: '6px',
								fontSize: '11px',
								background: pointSizeType === opt.id ? 'rgba(59, 130, 246, 0.28)' : 'rgba(255,255,255,0.05)',
								color: pointSizeType === opt.id ? '#93c5fd' : '#cbd5e1',
								border: pointSizeType === opt.id ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
								cursor: 'pointer',
								fontWeight: pointSizeType === opt.id ? 600 : 400,
							}}
						>
							{opt.label}
						</button>
					))}
				</div>
			</div>

			{/* Point Shape */}
			<div>
				<span style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '6px' }}>
					Hình dạng hạt (Shape):
				</span>
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
					{[
						{ id: PointShape.SQUARE, label: 'Vuông' },
						{ id: PointShape.CIRCLE, label: 'Tròn' },
						{ id: PointShape.PARABOLOID, label: 'Mịn (HQ)' },
					].map(opt => (
						<button
							key={opt.id}
							type="button"
							onClick={() => handleShapeChange(opt.id)}
							style={{
								padding: '6px 4px',
								borderRadius: '6px',
								fontSize: '11px',
								background: shape === opt.id ? 'rgba(59, 130, 246, 0.28)' : 'rgba(255,255,255,0.05)',
								color: shape === opt.id ? '#93c5fd' : '#cbd5e1',
								border: shape === opt.id ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
								cursor: 'pointer',
								fontWeight: shape === opt.id ? 600 : 400,
							}}
						>
							{opt.label}
						</button>
					))}
				</div>
			</div>

			{/* Color Mode / Active Attribute */}
			<div>
				<span style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '6px' }}>
					Chế độ hiển thị màu sắc (Attribute):
				</span>
				<select
					value={activeAttribute}
					onChange={e => handleAttributeChange(e.target.value)}
					style={{
						width: '100%',
						padding: '8px 10px',
						borderRadius: '8px',
						background: 'rgba(30, 41, 59, 0.8)',
						border: '1px solid rgba(255, 255, 255, 0.16)',
						color: '#f8fafc',
						fontSize: '12px',
						cursor: 'pointer',
						outline: 'none',
					}}
				>
					{COLOR_MODES.map(mode => (
						<option key={mode.id} value={mode.id} style={{ background: '#0f172a', color: '#fff' }}>
							{mode.label}
						</option>
					))}
				</select>
			</div>

			{/* Elevation Gradient Options */}
			{activeAttribute === 'elevation' && (
				<div>
					<span style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '6px' }}>
						Thang dải màu cao độ (Gradient):
					</span>
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
						{GRADIENT_OPTIONS.map(g => (
							<button
								key={g.id}
								type="button"
								onClick={() => handleGradientChange(g.id)}
								style={{
									padding: '6px 8px',
									borderRadius: '6px',
									fontSize: '11px',
									background: gradientName === g.id ? 'rgba(59, 130, 246, 0.28)' : 'rgba(255,255,255,0.05)',
									color: gradientName === g.id ? '#93c5fd' : '#cbd5e1',
									border: gradientName === g.id ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
									cursor: 'pointer',
								}}
							>
								{g.label}
							</button>
						))}
					</div>
				</div>
			)}

			{/* Opacity */}
			<div>
				<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
					<span style={{ color: 'rgba(255,255,255,0.7)' }}>Độ mờ đục (Opacity):</span>
					<span style={{ fontWeight: 600, color: '#60a5fa' }}>{Math.round(opacity * 100)}%</span>
				</div>
				<input
					type="range"
					min={0.1}
					max={1.0}
					step={0.05}
					value={opacity}
					onChange={e => handleOpacityChange(Number(e.target.value))}
					style={{ width: '100%', accentColor: '#3b82f6', cursor: 'pointer' }}
				/>
			</div>
		</div>
	);
};
