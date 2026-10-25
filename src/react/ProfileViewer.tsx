import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Viewer } from '../viewer/viewer.js';
import {
	IconClose,
	IconFit,
	IconRotateCW,
	IconRotateCCW,
	IconDownload,
	IconArrowLeft,
	IconArrowRight,
	IconCopy,
	IconCheck,
} from './icons.js';

export interface SelectedPointInfo {
	point: any;
	position: [number, number, number];
	mileage: number;
	elevation: number;
	rgba: [number, number, number, number] | null;
	classification: number | null;
	intensity: number | null;
	gpsTime: number | null;
	attributes: Record<string, any>;
	pointcloudName: string;
}

export interface ProfileViewerProps {
	viewer?: Viewer | null;
	isOpen?: boolean;
	onClose?: () => void;
	className?: string;
	style?: React.CSSProperties;
}

const CLASSIFICATION_LABELS: Record<number, { label: string; color: string }> = {
	0: { label: 'Chưa phân loại (Created)', color: '#8c8c8c' },
	1: { label: 'Mặc định (Unclassified)', color: '#bfbfbf' },
	2: { label: 'Mặt đất (Ground)', color: '#8a5a36' },
	3: { label: 'Cây thấp (Low Veg)', color: '#73d13d' },
	4: { label: 'Cây trung bình (Med Veg)', color: '#52c41a' },
	5: { label: 'Cây cao (High Veg)', color: '#237804' },
	6: { label: 'Công trình (Building)', color: '#fa8c16' },
	7: { label: 'Điểm nhiễu (Noise)', color: '#f5222d' },
	8: { label: 'Mặt nước (Water)', color: '#1890ff' },
	9: { label: 'Đường dây điện (Conductor)', color: '#faad14' },
	10: { label: 'Cột điện (Transmission Tower)', color: '#eb2f96' },
};

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
	const [selectedPoint, setSelectedPoint] = useState<SelectedPointInfo | null>(null);
	const [copied, setCopied] = useState<boolean>(false);
	const [exportMenuOpen, setExportMenuOpen] = useState<boolean>(false);

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

		const handlePointSelected = (e: any) => {
			if (e.point) {
				setSelectedPoint(e.point);
			}
		};

		const handlePointUnselected = () => {
			setSelectedPoint(null);
		};

		profileWindow.addEventListener('points_changed', updateHandler);
		profileWindow.addEventListener('point_selected', handlePointSelected);
		profileWindow.addEventListener('point_unselected', handlePointUnselected);
		profileWindow.render();

		return () => {
			profileWindow.removeEventListener('points_changed', updateHandler);
			profileWindow.removeEventListener('point_selected', handlePointSelected);
			profileWindow.removeEventListener('point_unselected', handlePointUnselected);
		};
	}, [viewer, isOpen]);

	const handleRotate = useCallback((direction: 'cw' | 'ccw') => {
		if (!viewer || !(viewer as any).profileWindowController) return;
		const ctrl = (viewer as any).profileWindowController;
		const degrees = direction === 'cw' ? -rotateAmount : rotateAmount;
		if (typeof ctrl.rotate === 'function') {
			ctrl.rotate(degrees);
		}
	}, [viewer, rotateAmount]);

	const handleMove = useCallback((direction: 'fwd' | 'bwd') => {
		if (!viewer || !(viewer as any).profileWindowController) return;
		const ctrl = (viewer as any).profileWindowController;
		if (direction === 'fwd') {
			ctrl.moveForward?.();
		} else {
			ctrl.moveBackward?.();
		}
	}, [viewer]);

	const handleResetView = () => {
		if (!viewer || !(viewer as any).profileWindow) return;
		const pw = (viewer as any).profileWindow;
		pw.autoFit = true;
		pw.autoFitEnabled = true;
		pw.render();
	};

	const handleExport = (format: 'dxf2d' | 'dxf3d' | 'csv' | 'las') => {
		setExportMenuOpen(false);
		if (!viewer || !(viewer as any).profileWindow) return;
		const pw = (viewer as any).profileWindow;

		if (format === 'dxf2d') {
			const blob = pw.exportDXF(true);
			pw.downloadFile(blob, 'profile_2d.dxf');
		} else if (format === 'dxf3d') {
			const blob = pw.exportDXF(false);
			pw.downloadFile(blob, 'profile_3d.dxf');
		} else if (format === 'csv') {
			const blob = pw.exportCSV();
			pw.downloadFile(blob, 'profile.csv');
		} else if (format === 'las') {
			const blob = pw.exportLAS();
			pw.downloadFile(blob, 'profile.las');
		}
	};

	const handleCopyCoords = () => {
		if (!selectedPoint) return;
		const [x, y, z] = selectedPoint.position;
		const text = `X: ${x.toFixed(3)}, Y: ${y.toFixed(3)}, Z: ${z.toFixed(3)}`;
		navigator.clipboard.writeText(text).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		});
	};

	if (!isOpen) return null;

	const classInfo = selectedPoint?.classification !== null && selectedPoint?.classification !== undefined
		? (CLASSIFICATION_LABELS[selectedPoint.classification] || { label: `Class ${selectedPoint.classification}`, color: '#1890ff' })
		: null;

	return (
		<div
			className={`potree-glass potree-profile-viewer ${className}`}
			style={{
				position: 'absolute',
				left: '20px',
				right: '20px',
				bottom: '20px',
				height: '350px',
				borderRadius: '16px',
				backdropFilter: 'blur(24px)',
				background: 'rgba(15, 23, 42, 0.90)',
				border: '1px solid rgba(255, 255, 255, 0.12)',
				boxShadow: '0 16px 48px -8px rgba(0, 0, 0, 0.65)',
				display: 'flex',
				flexDirection: 'column',
				overflow: 'hidden',
				zIndex: 1000,
				fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
				color: '#f8fafc',
				...style,
			}}
		>
			{/* Modern Titlebar */}
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					padding: '10px 18px',
					background: 'rgba(255, 255, 255, 0.03)',
					borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
				}}
			>
				<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
					<span style={{ fontSize: '13px', fontWeight: 600, color: '#93c5fd', letterSpacing: '0.4px' }}>
						Mặt cắt địa hình & tuyến đường dây (3D Cross-Section)
					</span>
					<span
						style={{
							fontSize: '11px',
							background: 'rgba(59, 130, 246, 0.18)',
							color: '#60a5fa',
							padding: '3px 10px',
							borderRadius: '12px',
							fontWeight: 500,
							border: '1px solid rgba(59, 130, 246, 0.28)',
						}}
					>
						{numPoints.toLocaleString()} điểm
					</span>
				</div>

				{/* Toolbar Actions */}
				<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
					{/* Step Forward / Backward */}
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '2px',
							background: 'rgba(255, 255, 255, 0.06)',
							borderRadius: '8px',
							padding: '2px',
							border: '1px solid rgba(255, 255, 255, 0.08)',
						}}
					>
						<button
							type="button"
							onClick={() => handleMove('bwd')}
							title="Dịch tuyến lùi lại"
							style={{
								background: 'none',
								border: 'none',
								color: '#cbd5e1',
								padding: '4px 6px',
								cursor: 'pointer',
								display: 'flex',
								alignItems: 'center',
								borderRadius: '4px',
							}}
						>
							<IconArrowLeft size={14} />
						</button>
						<span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', padding: '0 2px' }}>Dịch</span>
						<button
							type="button"
							onClick={() => handleMove('fwd')}
							title="Dịch tuyến tiến tới"
							style={{
								background: 'none',
								border: 'none',
								color: '#cbd5e1',
								padding: '4px 6px',
								cursor: 'pointer',
								display: 'flex',
								alignItems: 'center',
								borderRadius: '4px',
							}}
						>
							<IconArrowRight size={14} />
						</button>
					</div>

					{/* Rotate controls */}
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '2px',
							background: 'rgba(255, 255, 255, 0.06)',
							borderRadius: '8px',
							padding: '2px 4px',
							border: '1px solid rgba(255, 255, 255, 0.08)',
						}}
					>
						<button
							type="button"
							onClick={() => handleRotate('ccw')}
							title="Xoay ngược chiều kim đồng hồ"
							style={{
								background: 'none',
								border: 'none',
								color: '#cbd5e1',
								padding: '4px',
								cursor: 'pointer',
								display: 'flex',
								alignItems: 'center',
								borderRadius: '4px',
							}}
						>
							<IconRotateCCW size={14} />
						</button>
						<input
							type="number"
							value={rotateAmount}
							onChange={e => setRotateAmount(Number(e.target.value) || 10)}
							style={{
								width: '32px',
								background: 'transparent',
								border: 'none',
								color: '#f8fafc',
								fontSize: '11px',
								textAlign: 'center',
								outline: 'none',
							}}
						/>
						<span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>°</span>
						<button
							type="button"
							onClick={() => handleRotate('cw')}
							title="Xoay thuận chiều kim đồng hồ"
							style={{
								background: 'none',
								border: 'none',
								color: '#cbd5e1',
								padding: '4px',
								cursor: 'pointer',
								display: 'flex',
								alignItems: 'center',
								borderRadius: '4px',
							}}
						>
							<IconRotateCW size={14} />
						</button>
					</div>

					{/* Fit View Button */}
					<button
						type="button"
						onClick={handleResetView}
						title="Căn vừa khung nhìn (Fit View)"
						style={{
							background: 'rgba(255, 255, 255, 0.06)',
							border: '1px solid rgba(255, 255, 255, 0.1)',
							color: '#cbd5e1',
							borderRadius: '8px',
							padding: '5px 10px',
							fontSize: '11px',
							fontWeight: 500,
							cursor: 'pointer',
							display: 'flex',
							alignItems: 'center',
							gap: '6px',
						}}
					>
						<IconFit size={13} />
						<span>Vừa khung</span>
					</button>

					{/* Export Dropdown Menu */}
					<div style={{ position: 'relative' }}>
						<button
							type="button"
							onClick={() => setExportMenuOpen(!exportMenuOpen)}
							title="Xuất dữ liệu mặt cắt"
							style={{
								background: 'rgba(59, 130, 246, 0.2)',
								border: '1px solid rgba(59, 130, 246, 0.4)',
								color: '#93c5fd',
								borderRadius: '8px',
								padding: '5px 10px',
								fontSize: '11px',
								fontWeight: 500,
								cursor: 'pointer',
								display: 'flex',
								alignItems: 'center',
								gap: '6px',
							}}
						>
							<IconDownload size={13} />
							<span>Xuất file</span>
						</button>

						{exportMenuOpen && (
							<div
								style={{
									position: 'absolute',
									right: 0,
									top: '100%',
									marginTop: '6px',
									background: 'rgba(30, 41, 59, 0.98)',
									border: '1px solid rgba(255, 255, 255, 0.14)',
									borderRadius: '10px',
									boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
									padding: '6px',
									display: 'flex',
									flexDirection: 'column',
									gap: '2px',
									zIndex: 10,
									minWidth: '130px',
								}}
							>
								<button
									type="button"
									onClick={() => handleExport('dxf2d')}
									style={{
										background: 'transparent',
										border: 'none',
										color: '#f8fafc',
										padding: '6px 10px',
										borderRadius: '6px',
										fontSize: '11px',
										textAlign: 'left',
										cursor: 'pointer',
									}}
									onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
									onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
								>
									DXF (2D Profile)
								</button>
								<button
									type="button"
									onClick={() => handleExport('dxf3d')}
									style={{
										background: 'transparent',
										border: 'none',
										color: '#f8fafc',
										padding: '6px 10px',
										borderRadius: '6px',
										fontSize: '11px',
										textAlign: 'left',
										cursor: 'pointer',
									}}
									onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
									onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
								>
									DXF (3D CAD)
								</button>
								<button
									type="button"
									onClick={() => handleExport('csv')}
									style={{
										background: 'transparent',
										border: 'none',
										color: '#f8fafc',
										padding: '6px 10px',
										borderRadius: '6px',
										fontSize: '11px',
										textAlign: 'left',
										cursor: 'pointer',
									}}
									onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
									onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
								>
									CSV (Bảng tọa độ)
								</button>
								<button
									type="button"
									onClick={() => handleExport('las')}
									style={{
										background: 'transparent',
										border: 'none',
										color: '#f8fafc',
										padding: '6px 10px',
										borderRadius: '6px',
										fontSize: '11px',
										textAlign: 'left',
										cursor: 'pointer',
									}}
									onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
									onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
								>
									LAS (Đám mây điểm)
								</button>
							</div>
						)}
					</div>

					{/* Close Button */}
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
								padding: '4px',
								display: 'flex',
								alignItems: 'center',
								borderRadius: '6px',
								marginLeft: '4px',
							}}
						>
							<IconClose size={16} />
						</button>
					)}
				</div>
			</div>

			{/* Canvas & SVG container with Interactive Hover Overlay */}
			<div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#090d16' }}>
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

				{/* Modern Ant Design Style Point Inspector Card */}
				{selectedPoint && (
					<div
						style={{
							position: 'absolute',
							left: '16px',
							top: '16px',
							background: 'rgba(15, 23, 42, 0.92)',
							backdropFilter: 'blur(16px)',
							color: '#f8fafc',
							padding: '12px 14px',
							borderRadius: '12px',
							fontSize: '11px',
							zIndex: 2,
							border: '1px solid rgba(255, 255, 255, 0.16)',
							boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
							minWidth: '240px',
							maxWidth: '300px',
						}}
					>
						{/* Card Header */}
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'space-between',
								marginBottom: '8px',
								borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
								paddingBottom: '6px',
							}}
						>
							<span style={{ fontWeight: 600, color: '#93c5fd', fontSize: '12px' }}>
								Chi tiết điểm khảo sát
							</span>
							<button
								type="button"
								onClick={handleCopyCoords}
								title="Sao chép tọa độ (X, Y, Z)"
								style={{
									background: 'rgba(255, 255, 255, 0.08)',
									border: 'none',
									color: copied ? '#4ade80' : '#cbd5e1',
									padding: '2px 6px',
									borderRadius: '4px',
									cursor: 'pointer',
									display: 'flex',
									alignItems: 'center',
									gap: '4px',
									fontSize: '10px',
								}}
							>
								{copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
								<span>{copied ? 'Đã chép' : 'Sao chép'}</span>
							</button>
						</div>

						{/* Coordinate Table */}
						<div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', rowGap: '4px', columnGap: '8px' }}>
							<span style={{ color: 'rgba(255,255,255,0.5)' }}>Tọa độ X:</span>
							<span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{selectedPoint.position[0].toFixed(3)}</span>

							<span style={{ color: 'rgba(255,255,255,0.5)' }}>Tọa độ Y:</span>
							<span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{selectedPoint.position[1].toFixed(3)}</span>

							<span style={{ color: 'rgba(255,255,255,0.5)' }}>Cao độ (Z):</span>
							<span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#38bdf8' }}>
								{selectedPoint.elevation.toFixed(3)} m
							</span>

							<span style={{ color: 'rgba(255,255,255,0.5)' }}>Lý trình:</span>
							<span style={{ fontFamily: 'monospace', fontWeight: 500, color: '#fbbf24' }}>
								{selectedPoint.mileage.toFixed(3)} m
							</span>

							{classInfo && (
								<>
									<span style={{ color: 'rgba(255,255,255,0.5)' }}>Phân loại:</span>
									<span
										style={{
											display: 'inline-block',
											background: `${classInfo.color}26`,
											color: classInfo.color,
											padding: '1px 6px',
											borderRadius: '4px',
											fontSize: '10px',
											fontWeight: 500,
											border: `1px solid ${classInfo.color}44`,
										}}
									>
										{classInfo.label}
									</span>
								</>
							)}

							{selectedPoint.intensity !== null && selectedPoint.intensity !== undefined && (
								<>
									<span style={{ color: 'rgba(255,255,255,0.5)' }}>Cường độ:</span>
									<span style={{ fontFamily: 'monospace' }}>{selectedPoint.intensity}</span>
								</>
							)}

							{selectedPoint.rgba && (
								<>
									<span style={{ color: 'rgba(255,255,255,0.5)' }}>Màu sắc:</span>
									<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
										<div
											style={{
												width: '12px',
												height: '12px',
												borderRadius: '3px',
												background: `rgb(${selectedPoint.rgba[0]}, ${selectedPoint.rgba[1]}, ${selectedPoint.rgba[2]})`,
												border: '1px solid rgba(255,255,255,0.4)',
											}}
										/>
										<span style={{ fontFamily: 'monospace', fontSize: '10px' }}>
											{selectedPoint.rgba.slice(0, 3).join(', ')}
										</span>
									</div>
								</>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
