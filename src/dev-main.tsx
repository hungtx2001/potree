import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
	usePotree, 
	PotreeSidebar, 
	ProfileViewer, 
	FloatingToolbar,
	OrientedImageOverlay,
	IconFit,
	IconLayers,
	IconTool,
	IconClose,
} from './react/index.js';
import { loadPointCloud } from './core.js';
import './styles/theme.css';

const PRESET_DATASETS = [
	{ label: 'Lion Takanawa (Local Octree)', url: '/pointclouds/lion_takanawa/cloud.js' },
	{ label: 'Volume Total (Local Octree)', url: '/pointclouds/vol_total/cloud.js' },
	{ label: 'Sorvilier (Online Demo)', url: 'https://potree.org/pointclouds/sorvilier/metadata.json' },
	{ label: 'Tùy chỉnh (Nhập URL...)', url: 'custom' },
];

export const DevApp: React.FC = () => {
	const containerRef = useRef<HTMLDivElement>(null);
	const { viewer } = usePotree(containerRef);

	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [profileOpen, setProfileOpen] = useState(false);
	const [selectedDataset, setSelectedDataset] = useState<string>(PRESET_DATASETS[0].url);
	const [customUrl, setCustomUrl] = useState<string>('');
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [statusMessage, setStatusMessage] = useState<string>('Khởi tạo Potree 2.0...');

	const loadDataset = (url: string, name?: string) => {
		if (!viewer || !url || url === 'custom') return;
		setIsLoading(true);
		setStatusMessage(`Đang nạp: ${url}...`);

		// Clear previous pointclouds if any
		if (viewer.scene && viewer.scene.pointclouds.length > 0) {
			const toRemove = [...viewer.scene.pointclouds];
			for (const pc of toRemove) {
				viewer.scene.removePointCloud(pc);
			}
		}

		loadPointCloud(url, name || 'Point Cloud')
			.then((res: any) => {
				if (res.pointcloud && viewer.scene) {
					viewer.scene.addPointCloud(res.pointcloud);
					viewer.fitToScreen();
				}
				setIsLoading(false);
				setStatusMessage(`Đã nạp thành công: ${res.pointcloud?.name || 'Point Cloud'}`);
			})
			.catch((err: any) => {
				setIsLoading(false);
				setStatusMessage(`Lỗi tải dữ liệu: ${err.message || String(err)}`);
				console.error("Lỗi tải đám mây điểm:", err);
			});
	};

	// Initial dataset loading
	useEffect(() => {
		if (!viewer) return;
		loadDataset(PRESET_DATASETS[0].url, 'Lion Takanawa');
	}, [viewer]);

	const handleDatasetChange = (val: string) => {
		setSelectedDataset(val);
		if (val !== 'custom') {
			const found = PRESET_DATASETS.find(d => d.url === val);
			loadDataset(val, found?.label);
		}
	};

	const handleCustomSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (customUrl.trim()) {
			loadDataset(customUrl.trim(), 'Custom Cloud');
		}
	};

	return (
		<div
			style={{
				width: '100vw',
				height: '100vh',
				position: 'relative',
				overflow: 'hidden',
				background: '#090d16',
				fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
				color: '#f8fafc',
			}}
		>
			{/* Top Navbar */}
			<header
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					right: 0,
					height: '52px',
					background: 'rgba(15, 23, 42, 0.85)',
					backdropFilter: 'blur(16px)',
					borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					padding: '0 20px',
					zIndex: 900,
				}}
			>
				{/* Logo & Brand */}
				<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
					<span
						style={{
							width: '10px',
							height: '10px',
							borderRadius: '50%',
							background: '#38bdf8',
							boxShadow: '0 0 12px #38bdf8',
						}}
					/>
					<h1 style={{ margin: 0, fontSize: '15px', fontWeight: 700, letterSpacing: '0.4px', color: '#f8fafc' }}>
						POTREE 2.0 STUDIO
					</h1>
					<span
						style={{
							fontSize: '10px',
							background: 'rgba(56, 189, 248, 0.18)',
							color: '#38bdf8',
							padding: '2px 8px',
							borderRadius: '10px',
							fontWeight: 600,
							border: '1px solid rgba(56, 189, 248, 0.3)',
						}}
					>
						React 19 + Three.js
					</span>
				</div>

				{/* Dataset Selector */}
				<div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
					<span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>Dữ liệu mẫu:</span>
					<select
						value={selectedDataset}
						onChange={e => handleDatasetChange(e.target.value)}
						style={{
							background: 'rgba(30, 41, 59, 0.9)',
							border: '1px solid rgba(255, 255, 255, 0.16)',
							borderRadius: '8px',
							color: '#f8fafc',
							fontSize: '12px',
							padding: '6px 12px',
							outline: 'none',
							cursor: 'pointer',
						}}
					>
						{PRESET_DATASETS.map(d => (
							<option key={d.url} value={d.url} style={{ background: '#0f172a', color: '#fff' }}>
								{d.label}
							</option>
						))}
					</select>

					{selectedDataset === 'custom' && (
						<form onSubmit={handleCustomSubmit} style={{ display: 'flex', gap: '6px' }}>
							<input
								type="text"
								placeholder="https://.../metadata.json"
								value={customUrl}
								onChange={e => setCustomUrl(e.target.value)}
								style={{
									width: '240px',
									padding: '6px 10px',
									borderRadius: '6px',
									background: 'rgba(0,0,0,0.5)',
									border: '1px solid rgba(255,255,255,0.2)',
									color: '#fff',
									fontSize: '11px',
								}}
							/>
							<button
								type="submit"
								style={{
									padding: '6px 12px',
									borderRadius: '6px',
									background: '#38bdf8',
									border: 'none',
									color: '#0f172a',
									fontWeight: 600,
									fontSize: '11px',
									cursor: 'pointer',
								}}
							>
								Tải
							</button>
						</form>
					)}
				</div>

				{/* Status & Quick Actions */}
				<div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
					{isLoading && (
						<span style={{ fontSize: '11px', color: '#38bdf8', animation: 'pulse 1.5s infinite' }}>
							⏳ Đang tải...
						</span>
					)}
					<button
						type="button"
						onClick={() => viewer?.fitToScreen()}
						title="Căn vừa toàn bộ đám mây điểm"
						style={{
							background: 'rgba(255, 255, 255, 0.08)',
							border: '1px solid rgba(255, 255, 255, 0.15)',
							color: '#cbd5e1',
							borderRadius: '8px',
							padding: '6px 12px',
							fontSize: '12px',
							fontWeight: 500,
							cursor: 'pointer',
							display: 'flex',
							alignItems: 'center',
							gap: '6px',
						}}
					>
						<IconFit size={14} />
						<span>Vừa khung</span>
					</button>

					<button
						type="button"
						onClick={() => setSidebarOpen(!sidebarOpen)}
						style={{
							background: sidebarOpen ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.08)',
							border: sidebarOpen ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.15)',
							color: sidebarOpen ? '#38bdf8' : '#cbd5e1',
							borderRadius: '8px',
							padding: '6px 12px',
							fontSize: '12px',
							fontWeight: 500,
							cursor: 'pointer',
							display: 'flex',
							alignItems: 'center',
							gap: '6px',
						}}
					>
						<IconLayers size={14} />
						<span>Sidebar</span>
					</button>
				</div>
			</header>

			{/* Main 3D Canvas Container */}
			<div
				ref={containerRef}
				style={{
					position: 'absolute',
					top: '52px',
					left: 0,
					right: 0,
					bottom: 0,
					width: '100%',
					height: 'calc(100% - 52px)',
				}}
			/>

			{/* Modern Glassmorphic Sidebar Drawer */}
			<PotreeSidebar
				viewer={viewer}
				isOpen={sidebarOpen}
				onClose={() => setSidebarOpen(false)}
				onOpenProfile={() => setProfileOpen(true)}
				style={{ top: '72px' }}
			/>

			{/* Floating Action Toolbar */}
			<FloatingToolbar viewer={viewer} />

			{/* 3D Cross-Section Profile Viewer */}
			<ProfileViewer
				viewer={viewer}
				isOpen={profileOpen}
				onClose={() => setProfileOpen(false)}
			/>

			{/* Oriented Images HUD */}
			<OrientedImageOverlay viewer={viewer} />

			{/* Bottom Status Pill */}
			<div
				style={{
					position: 'absolute',
					bottom: '16px',
					left: '20px',
					background: 'rgba(15, 23, 42, 0.85)',
					backdropFilter: 'blur(12px)',
					border: '1px solid rgba(255, 255, 255, 0.1)',
					borderRadius: '20px',
					padding: '6px 14px',
					fontSize: '11px',
					color: 'rgba(255, 255, 255, 0.7)',
					pointerEvents: 'none',
					zIndex: 500,
					display: 'flex',
					alignItems: 'center',
					gap: '8px',
				}}
			>
				<span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
				<span>{statusMessage}</span>
			</div>
		</div>
	);
};

interface ErrorBoundaryProps {
	children: React.ReactNode;
}

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, info: React.ErrorInfo) {
		console.error("Potree Studio Caught Error:", error, info);
	}

	render() {
		if (this.state.hasError) {
			return (
				<div style={{ padding: '32px', color: '#ef4444', background: '#090d16', height: '100vh', fontFamily: 'Inter, sans-serif' }}>
					<h2 style={{ color: '#f8fafc', marginBottom: '8px' }}>Đã xảy ra sự cố trong giao diện Studio</h2>
					<p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '16px' }}>Hệ thống đã cách ly lỗi để bảo vệ trạng thái ứng dụng:</p>
					<pre style={{ color: '#fca5a5', background: '#1e293b', padding: '16px', borderRadius: '8px', fontSize: '12px', overflow: 'auto' }}>
						{String(this.state.error?.stack || this.state.error)}
					</pre>
					<button
						type="button"
						onClick={() => window.location.reload()}
						style={{ marginTop: '16px', padding: '8px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
					>
						Tải lại trang
					</button>
				</div>
			);
		}
		return this.props.children;
	}
}

const rootEl = document.getElementById('root');
if (rootEl) {
	createRoot(rootEl).render(
		<ErrorBoundary>
			<DevApp />
		</ErrorBoundary>
	);
}
