import React, { useEffect, useState } from 'react';

export interface OrientedImageOverlayProps {
	viewer: any;
	className?: string;
}

export const OrientedImageOverlay: React.FC<OrientedImageOverlayProps> = ({
	viewer,
	className = '',
}) => {
	const [activeControls, setActiveControls] = useState<any>(null);
	const [capturedImage, setCapturedImage] = useState<any>(null);

	useEffect(() => {
		if (!viewer) return;

		const checkControls = () => {
			const controls = viewer.getControls();
			if (controls && controls.hasSomethingCaptured && controls.hasSomethingCaptured()) {
				setActiveControls(controls);
				setCapturedImage(controls.image);
			} else {
				setActiveControls(null);
				setCapturedImage(null);
			}
		};

		checkControls();

		const handleControlsChanged = () => checkControls();
		viewer.addEventListener('controls_changed', handleControlsChanged);
		viewer.addEventListener('update', checkControls);

		return () => {
			viewer.removeEventListener('controls_changed', handleControlsChanged);
			viewer.removeEventListener('update', checkControls);
		};
	}, [viewer]);

	useEffect(() => {
		if (!activeControls) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				activeControls.release();
			} else if (e.key === 'ArrowUp') {
				activeControls.shearUp();
			} else if (e.key === 'ArrowDown') {
				activeControls.shearDown();
			} else if (e.key === 'ArrowLeft') {
				activeControls.shearLeft();
			} else if (e.key === 'ArrowRight') {
				activeControls.shearRight();
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [activeControls]);

	if (!activeControls || !capturedImage) {
		return null;
	}

	return (
		<div
			className={`oriented-image-hud ${className}`}
			style={{
				position: 'absolute',
				inset: 0,
				pointerEvents: 'none',
				zIndex: 2000,
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'space-between',
				alignItems: 'center',
				padding: '16px',
			}}
		>
			{/* Top Bar: Image Name & Info */}
			<div
				style={{
					background: 'rgba(15, 23, 42, 0.85)',
					backdropFilter: 'blur(12px)',
					border: '1px solid rgba(255, 255, 255, 0.1)',
					borderRadius: '12px',
					padding: '8px 20px',
					color: '#f8fafc',
					fontSize: '13px',
					fontWeight: 500,
					display: 'flex',
					alignItems: 'center',
					gap: '10px',
					boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
					pointerEvents: 'auto',
				}}
			>
				<span style={{ color: '#38bdf8' }}>📷</span>
				<span>Ảnh định hướng: <strong>{capturedImage.id || 'Đang xem ảnh thực địa'}</strong></span>
				<span style={{ color: '#64748b', fontSize: '12px' }}>(Dùng phím mũi tên để dịch ảnh)</span>
			</div>

			{/* Center Pan Direction Controls */}
			<div
				style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(3, 40px)',
					gridTemplateRows: 'repeat(3, 40px)',
					gap: '6px',
					pointerEvents: 'auto',
					background: 'rgba(15, 23, 42, 0.75)',
					backdropFilter: 'blur(10px)',
					padding: '8px',
					borderRadius: '16px',
					border: '1px solid rgba(255, 255, 255, 0.1)',
					boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
				}}
			>
				<div />
				<button
					type="button"
					title="Dịch lên (Mũi tên lên)"
					onClick={() => activeControls.shearUp()}
					style={btnStyle}
				>
					▲
				</button>
				<div />

				<button
					type="button"
					title="Dịch trái (Mũi tên trái)"
					onClick={() => activeControls.shearLeft()}
					style={btnStyle}
				>
					◀
				</button>
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '11px' }}>
					PAN
				</div>
				<button
					type="button"
					title="Dịch phải (Mũi tên phải)"
					onClick={() => activeControls.shearRight()}
					style={btnStyle}
				>
					▶
				</button>

				<div />
				<button
					type="button"
					title="Dịch xuống (Mũi tên xuống)"
					onClick={() => activeControls.shearDown()}
					style={btnStyle}
				>
					▼
				</button>
				<div />
			</div>

			{/* Bottom Action: Back to 3D View */}
			<button
				type="button"
				onClick={() => activeControls.release()}
				style={{
					pointerEvents: 'auto',
					background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
					color: '#ffffff',
					border: '1px solid rgba(255, 255, 255, 0.2)',
					borderRadius: '10px',
					padding: '10px 24px',
					fontSize: '13px',
					fontWeight: 600,
					cursor: 'pointer',
					boxShadow: '0 4px 16px rgba(37, 99, 235, 0.4)',
					transition: 'all 0.2s ease',
					display: 'flex',
					alignItems: 'center',
					gap: '8px',
				}}
				onMouseEnter={(e) => {
					e.currentTarget.style.transform = 'translateY(-2px)';
					e.currentTarget.style.boxShadow = '0 6px 20px rgba(37, 99, 235, 0.6)';
				}}
				onMouseLeave={(e) => {
					e.currentTarget.style.transform = 'translateY(0)';
					e.currentTarget.style.boxShadow = '0 4px 16px rgba(37, 99, 235, 0.4)';
				}}
			>
				<span>↩</span>
				<span>Quay lại không gian 3D (Esc)</span>
			</button>
		</div>
	);
};

const btnStyle: React.CSSProperties = {
	background: 'rgba(255, 255, 255, 0.1)',
	border: '1px solid rgba(255, 255, 255, 0.15)',
	borderRadius: '8px',
	color: '#f8fafc',
	cursor: 'pointer',
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'center',
	fontSize: '14px',
	transition: 'background 0.15s ease',
};
