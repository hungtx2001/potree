import React, { useState } from 'react';
import type { Viewer } from '../viewer/viewer.js';

export interface MeasurementPanelProps {
	viewer?: Viewer | null;
	className?: string;
	style?: React.CSSProperties;
	onMeasureStart?: (toolName: string) => void;
}

export const MeasurementPanel: React.FC<MeasurementPanelProps> = ({
	viewer,
	className = '',
	style,
	onMeasureStart,
}) => {
	const [activeTool, setActiveTool] = useState<string | null>(null);

	const startDistance = () => {
		if (!viewer || !(viewer as any).measuringTool) return;
		setActiveTool('distance');
		(viewer as any).measuringTool.startInsertion({
			showDistances: true,
			showArea: false,
			closed: false,
			name: 'Khoảng cách (Distance)',
		});
		if (onMeasureStart) onMeasureStart('distance');
	};

	const startHeight = () => {
		if (!viewer || !(viewer as any).measuringTool) return;
		setActiveTool('height');
		(viewer as any).measuringTool.startInsertion({
			showDistances: false,
			showHeight: true,
			showArea: false,
			closed: false,
			maxMarkers: 2,
			name: 'Chiều cao / Tĩnh không (Height)',
		});
		if (onMeasureStart) onMeasureStart('height');
	};

	const startAngle = () => {
		if (!viewer || !(viewer as any).measuringTool) return;
		setActiveTool('angle');
		(viewer as any).measuringTool.startInsertion({
			showDistances: false,
			showAngles: true,
			showArea: false,
			closed: true,
			maxMarkers: 3,
			name: 'Góc (Angle)',
		});
		if (onMeasureStart) onMeasureStart('angle');
	};

	const startArea = () => {
		if (!viewer || !(viewer as any).measuringTool) return;
		setActiveTool('area');
		(viewer as any).measuringTool.startInsertion({
			showDistances: true,
			showArea: true,
			closed: true,
			name: 'Diện tích (Area)',
		});
		if (onMeasureStart) onMeasureStart('area');
	};

	const startPoint = () => {
		if (!viewer || !(viewer as any).measuringTool) return;
		setActiveTool('point');
		(viewer as any).measuringTool.startInsertion({
			showDistances: false,
			showAngles: false,
			showCoordinates: true,
			showArea: false,
			closed: true,
			maxMarkers: 1,
			name: 'Tọa độ điểm (Point)',
		});
		if (onMeasureStart) onMeasureStart('point');
	};

	const clearAll = () => {
		if (!viewer || !viewer.scene) return;
		if (typeof (viewer.scene as any).removeAllMeasurements === 'function') {
			(viewer.scene as any).removeAllMeasurements();
		}
		setActiveTool(null);
	};

	const tools = [
		{ id: 'distance', label: 'Khoảng cách', icon: '📏', action: startDistance },
		{ id: 'height', label: 'Chiều cao tĩnh không', icon: '📐', action: startHeight },
		{ id: 'angle', label: 'Góc', icon: '∠', action: startAngle },
		{ id: 'area', label: 'Diện tích', icon: '⬡', action: startArea },
		{ id: 'point', label: 'Tọa độ XYZ', icon: '📍', action: startPoint },
	];

	return (
		<div
			className={`potree-glass potree-measurement-panel ${className}`}
			style={{
				padding: '12px',
				borderRadius: '12px',
				color: '#fff',
				fontSize: '13px',
				fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
				backdropFilter: 'blur(16px)',
				background: 'rgba(20, 24, 33, 0.82)',
				border: '1px solid rgba(255, 255, 255, 0.12)',
				boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
				display: 'flex',
				flexDirection: 'column',
				gap: '8px',
				...style,
			}}
		>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
				<span style={{ fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', fontSize: '11px', color: '#8ea9db' }}>
					Công cụ đo đạc 3D
				</span>
				<button
					type="button"
					onClick={clearAll}
					title="Xóa tất cả các phép đo"
					style={{
						background: 'rgba(255, 75, 75, 0.2)',
						border: '1px solid rgba(255, 75, 75, 0.4)',
						color: '#ff9999',
						borderRadius: '4px',
						padding: '2px 8px',
						fontSize: '11px',
						cursor: 'pointer',
					}}
				>
					Xóa hết
				</button>
			</div>

			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
				{tools.map(tool => {
					const isActive = activeTool === tool.id;
					return (
						<button
							key={tool.id}
							type="button"
							onClick={tool.action}
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: '8px',
								padding: '8px 10px',
								borderRadius: '8px',
								background: isActive ? 'rgba(79, 140, 252, 0.28)' : 'rgba(255, 255, 255, 0.05)',
								border: isActive ? '1px solid #4f8cfc' : '1px solid rgba(255, 255, 255, 0.1)',
								color: '#fff',
								cursor: 'pointer',
								fontSize: '12px',
								textAlign: 'left',
								transition: 'all 0.15s ease',
							}}
						>
							<span style={{ fontSize: '14px' }}>{tool.icon}</span>
							<span>{tool.label}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
};
