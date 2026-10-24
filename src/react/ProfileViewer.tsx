import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Viewer } from '../../types/index.js';

export interface ProfileViewerProps {
	viewer?: Viewer | null;
	isOpen?: boolean;
	onClose?: () => void;
	className?: string;
	style?: React.CSSProperties;
}

export const ProfileViewer: React.FC<ProfileViewerProps> = ({
	viewer,
	isOpen = true,
	onClose,
	className = '',
	style,
}) => {
	const canvasContainerRef = useRef<HTMLDivElement>(null);
	const svgRef = useRef<SVGSVGElement>(null);
	const [numPoints, setNumPoints] = useState<number>(0);
	const [rotateAmount, setRotateAmount] = useState<number>(10);
	const [selectedPoint, setSelectedPoint] = useState<string | null>(null);

	// Connect with Potree ProfileWindow
	useEffect(() => {
		if (!viewer || !isOpen) return;

		const profileWindow = (viewer as any).profileWindow;
		if (!profileWindow) return;

		// Attach renderer to our canvasContainer if needed
		if (canvasContainerRef.current && profileWindow.renderer) {
			const dom = profileWindow.renderer.domElement;
			if (dom && dom.parentElement !== canvasContainerRef.current) {
				canvasContainerRef.current.replaceChildren(dom);
				dom.style.width = '100%';
				dom.style.height = '100%';
			}
		}

		if (svgRef.current) {
			profileWindow.svg = svgRef.current;
		}

		// Sync points update
		const updateHandler = () => {
			let total = 0;
			if (profileWindow.pointclouds) {
				for (const [, entry] of profileWindow.pointclouds) {
					if (entry.points) {
						total += entry.points.reduce((a: number, i: any) => a + (i.numPoints || 0), 0);
					}
				}
			}
			setNumPoints(total);
		};

		profileWindow.addEventListener('points_changed', updateHandler);
		profileWindow.render();

		return () => {
			profileWindow.removeEventListener('points_changed', updateHandler);
		};
	}, [viewer, isOpen]);

	const handleRotate = useCallback((direction: 'cw' | 'ccw') => {
		if (!viewer || !(viewer as any).profileWindowController) return;
		const ctrl = (viewer as any).profileWindowController;
		const profile = ctrl.profile;
		if (!profile || !profile.points || profile.points.length < 2) return;

		const rad = ((rotateAmount * Math.PI) / 180) * (direction === 'cw' ? -1 : 1);
		const points = profile.points;
		const start = points[0];
		const end = points[points.length - 1];
		const center = start.clone().add(end).multiplyScalar(0.5);

		// Rotate points around center
		const cos = Math.cos(rad);
		const sin = Math.sin(rad);

		for (let i = 0; i < points.length; i++) {
			const p = points[i];
			const dx = p.x - center.x;
			const dy = p.y - center.y;
			const nx = center.x + (dx * cos - dy * sin);
			const ny = center.y + (dx * sin + dy * cos);
			profile.setPosition(i, { x: nx, y: ny, z: p.z });
		}
	}, [viewer, rotateAmount]);

	const handleResetView = () => {
		if (!viewer || !(viewer as any).profileWindow) return;
		const pw = (viewer as any).profileWindow;
		pw.autoFit = true;
		pw.autoFitEnabled = true;
		pw.render();
	};

	if (!isOpen) return null;

	return (
		<div
			className={`potree-glass potree-profile-viewer ${className}`}
			style={{
				position: 'absolute',
				left: '20px',
				right: '20px',
				bottom: '20px',
				height: '320px',
				borderRadius: '14px',
				backdropFilter: 'blur(20px)',
				background: 'rgba(17, 22, 31, 0.88)',
				border: '1px solid rgba(255, 255, 255, 0.12)',
				boxShadow: '0 12px 40px rgba(0, 0, 0, 0.55)',
				display: 'flex',
				flexDirection: 'column',
				overflow: 'hidden',
				zIndex: 1000,
				fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
				color: '#fff',
				...style,
			}}
		>
			{/* Titlebar */}
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					padding: '8px 16px',
					background: 'rgba(255, 255, 255, 0.04)',
					borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
				}}
			>
				<div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
					<span style={{ fontSize: '13px', fontWeight: 600, color: '#8ea9db', letterSpacing: '0.3px' }}>
						Mặt cắt địa hình & tuyến đường dây (3D Profile)
					</span>
					<span
						style={{
							fontSize: '11px',
							background: 'rgba(79, 140, 252, 0.18)',
							color: '#4f8cfc',
							padding: '2px 8px',
							borderRadius: '10px',
							fontWeight: 500,
						}}
					>
						{numPoints.toLocaleString()} điểm
					</span>
				</div>

				{/* Toolbar Actions */}
				<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
					{/* Rotate controls */}
					<div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', padding: '2px 6px' }}>
						<button
							type="button"
							onClick={() => handleRotate('ccw')}
							title="Xoay ngược chiều kim đồng hồ"
							style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '13px' }}
						>
							↺
						</button>
						<input
							type="number"
							value={rotateAmount}
							onChange={e => setRotateAmount(Number(e.target.value) || 10)}
							style={{
								width: '36px',
								background: 'transparent',
								border: 'none',
								color: '#fff',
								fontSize: '11px',
								textAlign: 'center',
							}}
						/>
						<span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>°</span>
						<button
							type="button"
							onClick={() => handleRotate('cw')}
							title="Xoay thuận chiều kim đồng hồ"
							style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '13px' }}
						>
							↻
						</button>
					</div>

					<button
						type="button"
						onClick={handleResetView}
						title="Căn vừa khung nhìn (Fit View)"
						style={{
							background: 'rgba(255, 255, 255, 0.08)',
							border: '1px solid rgba(255, 255, 255, 0.15)',
							color: '#fff',
							borderRadius: '6px',
							padding: '4px 8px',
							fontSize: '11px',
							cursor: 'pointer',
						}}
					>
						Vừa khung
					</button>

					{onClose && (
						<button
							type="button"
							onClick={onClose}
							title="Đóng cửa sổ mặt cắt"
							style={{
								background: 'none',
								border: 'none',
								color: 'rgba(255, 255, 255, 0.6)',
								cursor: 'pointer',
								fontSize: '16px',
								marginLeft: '4px',
								lineHeight: 1,
							}}
						>
							✕
						</button>
					)}
				</div>
			</div>

			{/* Draw Canvas & SVG container */}
			<div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#0a0d14' }}>
				<svg
					ref={svgRef}
					style={{
						position: 'absolute',
						top: 0,
						left: 0,
						width: '100%',
						height: '100%',
						pointerEvents: 'none',
						zIndex: 1,
					}}
				/>
				<div
					ref={canvasContainerRef}
					style={{
						position: 'absolute',
						top: 0,
						left: 0,
						width: '100%',
						height: '100%',
						zIndex: 0,
					}}
				/>

				{selectedPoint && (
					<div
						style={{
							position: 'absolute',
							left: '12px',
							top: '12px',
							background: 'rgba(0, 0, 0, 0.85)',
							color: '#fff',
							padding: '6px 10px',
							borderRadius: '6px',
							fontSize: '11px',
							zIndex: 2,
							border: '1px solid rgba(255, 255, 255, 0.2)',
						}}
					>
						{selectedPoint}
					</div>
				)}
			</div>
		</div>
	);
};
