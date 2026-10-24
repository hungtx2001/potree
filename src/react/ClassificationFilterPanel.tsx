import React, { useState, useEffect, useCallback } from 'react';
import type { Viewer } from '../../types/index.js';

export interface ClassificationClass {
	code: number;
	name: string;
	color: string;
	visible: boolean;
}

const DEFAULT_ASPRS_CLASSES: ClassificationClass[] = [
	{ code: 0, name: 'Chưa phân loại (Never Classified)', color: '#808080', visible: true },
	{ code: 1, name: 'Chưa gán (Unassigned)', color: '#a0a0a0', visible: true },
	{ code: 2, name: 'Mặt đất (Ground)', color: '#d2b48c', visible: true },
	{ code: 3, name: 'Cây thấp (Low Veg)', color: '#90ee90', visible: true },
	{ code: 4, name: 'Cây trung bình (Med Veg)', color: '#228b22', visible: true },
	{ code: 5, name: 'Cây cao (High Veg)', color: '#006400', visible: true },
	{ code: 6, name: 'Nhà cửa / Công trình (Building)', color: '#ff8c00', visible: true },
	{ code: 7, name: 'Điểm nhiễu (Noise)', color: '#ff0000', visible: false },
	{ code: 14, name: 'Dây dẫn điện (Wire Conductor - EVN)', color: '#00ffff', visible: true },
	{ code: 15, name: 'Cột điện cao thế (Tower - EVN)', color: '#ff00ff', visible: true },
	{ code: 16, name: 'Cấu trúc phụ trợ (Wire Structure)', color: '#ffff00', visible: true },
];

export interface ClassificationFilterPanelProps {
	viewer?: Viewer | null;
	className?: string;
	style?: React.CSSProperties;
	onVisibilityChange?: (code: number, visible: boolean) => void;
}

export const ClassificationFilterPanel: React.FC<ClassificationFilterPanelProps> = ({
	viewer,
	className = '',
	style,
	onVisibilityChange,
}) => {
	const [classes, setClasses] = useState<ClassificationClass[]>(DEFAULT_ASPRS_CLASSES);

	const applyToViewer = useCallback((updatedClasses: ClassificationClass[]) => {
		if (!viewer || !viewer.scene || !viewer.scene.pointclouds) return;

		for (const pointcloud of viewer.scene.pointclouds) {
			const mat = (pointcloud as any).material;
			if (!mat || !mat.classification) continue;

			for (const item of updatedClasses) {
				if (mat.classification[item.code]) {
					mat.classification[item.code].visible = item.visible;
				}
			}
			if (typeof mat.updateShaderSource === 'function') {
				mat.updateShaderSource();
			}
		}
	}, [viewer]);

	const toggleClass = (code: number) => {
		setClasses(prev => {
			const updated = prev.map(c => (c.code === code ? { ...c, visible: !c.visible } : c));
			applyToViewer(updated);
			if (onVisibilityChange) {
				const item = updated.find(c => c.code === code);
				if (item) onVisibilityChange(code, item.visible);
			}
			return updated;
		});
	};

	const setAll = (visible: boolean) => {
		setClasses(prev => {
			const updated = prev.map(c => ({ ...c, visible }));
			applyToViewer(updated);
			return updated;
		});
	};

	return (
		<div
			className={`potree-glass potree-classification-panel ${className}`}
			style={{
				padding: '14px',
				borderRadius: '12px',
				color: '#fff',
				fontSize: '13px',
				fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
				maxWidth: '340px',
				backdropFilter: 'blur(16px)',
				background: 'rgba(20, 24, 33, 0.82)',
				border: '1px solid rgba(255, 255, 255, 0.12)',
				boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
				...style,
			}}
		>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
				<span style={{ fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', fontSize: '11px', color: '#8ea9db' }}>
					Phân loại đám mây điểm (ASPRS)
				</span>
				<div style={{ display: 'flex', gap: '6px' }}>
					<button
						type="button"
						onClick={() => setAll(true)}
						style={{
							background: 'rgba(255,255,255,0.08)',
							border: '1px solid rgba(255,255,255,0.15)',
							color: '#fff',
							borderRadius: '4px',
							padding: '2px 6px',
							fontSize: '11px',
							cursor: 'pointer',
						}}
					>
						Tất cả
					</button>
					<button
						type="button"
						onClick={() => setAll(false)}
						style={{
							background: 'rgba(255,255,255,0.08)',
							border: '1px solid rgba(255,255,255,0.15)',
							color: '#fff',
							borderRadius: '4px',
							padding: '2px 6px',
							fontSize: '11px',
							cursor: 'pointer',
						}}
					>
						Bỏ chọn
					</button>
				</div>
			</div>

			<div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
				{classes.map(item => (
					<label
						key={item.code}
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '8px',
							padding: '4px 6px',
							borderRadius: '6px',
							background: item.visible ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
							cursor: 'pointer',
							transition: 'background 0.15s ease',
						}}
					>
						<input
							type="checkbox"
							checked={item.visible}
							onChange={() => toggleClass(item.code)}
							style={{ accentColor: '#4f8cfc', cursor: 'pointer' }}
						/>
						<span
							style={{
								width: '12px',
								height: '12px',
								borderRadius: '3px',
								backgroundColor: item.color,
								display: 'inline-block',
								flexShrink: 0,
								border: '1px solid rgba(255,255,255,0.3)',
							}}
						/>
						<span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
							{item.name}
						</span>
						<span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
							#{item.code}
						</span>
					</label>
				))}
			</div>
		</div>
	);
};
