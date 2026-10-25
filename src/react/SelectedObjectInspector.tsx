import React, { useState } from 'react';
import type { Viewer } from '../viewer/viewer.js';
import { Measure } from '../core/tools/Measure.js';
import { Volume } from '../core/tools/Volume.js';
import { Annotation } from '../core/tools/Annotation.js';
import { IconBox, IconClose, IconRuler, IconCopy, IconCheck } from './icons.js';

export interface SelectedObjectInspectorProps {
	object: any;
	viewer?: Viewer | null;
	onDeselect?: () => void;
	className?: string;
	style?: React.CSSProperties;
}

export const SelectedObjectInspector: React.FC<SelectedObjectInspectorProps> = ({
	object,
	viewer,
	onDeselect,
	className = '',
	style,
}) => {
	const [copied, setCopied] = useState<boolean>(false);

	if (!object) return null;

	const isMeasure = object instanceof Measure;
	const isVolume = object instanceof Volume;
	const isAnnotation = object instanceof Annotation;

	const handleDelete = () => {
		if (!viewer || !viewer.scene) return;
		if (isMeasure) {
			viewer.scene.removeMeasurement(object);
		} else if (isVolume) {
			viewer.scene.removeVolume(object);
		} else if (isAnnotation) {
			viewer.scene.annotations.remove(object);
		}
		onDeselect?.();
	};

	const handleCopy = (text: string) => {
		navigator.clipboard.writeText(text).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		});
	};

	let title = 'Đối tượng khảo sát';
	let icon = <IconBox size={16} color="#60a5fa" />;

	if (isMeasure) {
		title = object.name || 'Đo đạc kích thước';
		icon = <IconRuler size={16} color="#4ade80" />;
	} else if (isVolume) {
		title = object.name || 'Khối thể tích cắt (Volume)';
		icon = <IconBox size={16} color="#f59e0b" />;
	} else if (isAnnotation) {
		title = object.title || 'Điểm ghi chú khảo sát';
	}

	return (
		<div
			className={`potree-selected-object-inspector ${className}`}
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: '12px',
				padding: '12px',
				borderRadius: '12px',
				background: 'rgba(30, 41, 59, 0.7)',
				border: '1px solid rgba(255, 255, 255, 0.12)',
				fontSize: '11px',
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
					borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
					paddingBottom: '8px',
				}}
			>
				<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
					{icon}
					<span style={{ fontWeight: 600, color: '#93c5fd', fontSize: '12px' }}>{title}</span>
				</div>
				{onDeselect && (
					<button
						type="button"
						onClick={onDeselect}
						style={{
							background: 'none',
							border: 'none',
							color: 'rgba(255, 255, 255, 0.5)',
							cursor: 'pointer',
							padding: '2px',
						}}
					>
						<IconClose size={14} />
					</button>
				)}
			</div>

			{/* Measure Inspector */}
			{isMeasure && (
				<div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
					{typeof object.getTotalDistance === 'function' && object.points.length >= 2 && (
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
							<span style={{ color: 'rgba(255,255,255,0.6)' }}>Tổng chiều dài:</span>
							<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
								<span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#4ade80' }}>
									{object.getTotalDistance().toFixed(3)} m
								</span>
								<button
									type="button"
									onClick={() => handleCopy(`${object.getTotalDistance().toFixed(3)} m`)}
									style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
								>
									{copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
								</button>
							</div>
						</div>
					)}

					{typeof object.getArea === 'function' && object.points.length >= 3 && (
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
							<span style={{ color: 'rgba(255,255,255,0.6)' }}>Diện tích:</span>
							<span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#38bdf8' }}>
								{object.getArea().toFixed(2)} m²
							</span>
						</div>
					)}

					{/* Point Coordinates Count */}
					<div style={{ display: 'flex', justifyContent: 'space-between' }}>
						<span style={{ color: 'rgba(255,255,255,0.6)' }}>Số đỉnh mốc:</span>
						<span>{object.points.length} điểm</span>
					</div>

					{/* Coordinates Details */}
					<div
						style={{
							maxHeight: '90px',
							overflowY: 'auto',
							background: 'rgba(0,0,0,0.3)',
							padding: '6px',
							borderRadius: '6px',
							display: 'flex',
							flexDirection: 'column',
							gap: '3px',
						}}
					>
						{object.points.map((pt: any, idx: number) => (
							<div key={idx} style={{ fontFamily: 'monospace', fontSize: '10px', color: '#cbd5e1' }}>
								P{idx + 1}: ({pt.x.toFixed(2)}, {pt.y.toFixed(2)}, {pt.z.toFixed(2)})
							</div>
						))}
					</div>
				</div>
			)}

			{/* Volume Inspector */}
			{isVolume && (
				<div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
					<div style={{ display: 'flex', justifyContent: 'space-between' }}>
						<span style={{ color: 'rgba(255,255,255,0.6)' }}>Thể tích ước tính:</span>
						<span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#fbbf24' }}>
							{typeof object.getVolume === 'function' ? `${Number(object.getVolume()).toFixed(2)} m³` : 'N/A'}
						</span>
					</div>

					<div style={{ display: 'flex', justifyContent: 'space-between' }}>
						<span style={{ color: 'rgba(255,255,255,0.6)' }}>Kích thước (DxRxC):</span>
						<span style={{ fontFamily: 'monospace', fontSize: '10px' }}>
							{object.scale.x.toFixed(1)} x {object.scale.y.toFixed(1)} x {object.scale.z.toFixed(1)} m
						</span>
					</div>
				</div>
			)}

			{/* Annotation Inspector */}
			{isAnnotation && (
				<div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
					<span style={{ fontWeight: 500 }}>{object.title}</span>
					{object.description && (
						<p style={{ color: 'rgba(255,255,255,0.7)', margin: 0 }}>{object.description}</p>
					)}
				</div>
			)}

			{/* Actions */}
			<div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
				<button
					type="button"
					onClick={handleDelete}
					style={{
						flex: 1,
						padding: '6px 10px',
						borderRadius: '6px',
						background: 'rgba(239, 68, 68, 0.2)',
						border: '1px solid rgba(239, 68, 68, 0.4)',
						color: '#fca5a5',
						cursor: 'pointer',
						fontWeight: 500,
						fontSize: '11px',
					}}
				>
					Xóa đối tượng
				</button>
			</div>
		</div>
	);
};
