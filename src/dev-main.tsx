import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
	usePotree, 
	PotreeSidebar, 
	ProfileViewer, 
} from './react/index.js';
import * as THREE from 'three';
import { loadPointCloud, Annotation, PointSizeType } from './core/index.js';
import './styles/theme.css';
import './styles/potree.css';

export const DevApp: React.FC = () => {
	const containerRef = useRef<HTMLDivElement>(null);
	const { viewer } = usePotree(containerRef);

	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [profileOpen, setProfileOpen] = useState(false);

	const loadDataset = () => {
		if (!viewer) return;

		// Clear previous pointclouds if any
		if (viewer.scene && viewer.scene.pointclouds.length > 0) {
			const toRemove = [...viewer.scene.pointclouds];
			for (const pc of toRemove) {
				viewer.scene.removePointCloud(pc);
			}
		}

		loadPointCloud('/pointclouds/vol_total/cloud.js', 'sigeom.sa')
			.then((res: any) => {
				if (res.pointcloud && viewer.scene) {
					viewer.scene.addPointCloud(res.pointcloud);

					// Exact camera position & orientation from annotations.html
					viewer.scene.view.position.set(590030, 231767, 1007);
					viewer.scene.view.lookAt(new THREE.Vector3(589844, 231376, 710));

					const material = res.pointcloud.material;
					if (material) {
						material.size = 1;
						material.pointSizeType = PointSizeType.ADAPTIVE;
					}

					// Clear previous annotations if any
					if (viewer.scene.annotations?.children) {
						const children = [...viewer.scene.annotations.children];
						for (const child of children) {
							viewer.scene.annotations.remove(child);
						}
					}

					// 5 Annotations matching examples/annotations.html
					const aAbout1 = new Annotation({
						position: new THREE.Vector3(590043.63, 231490.79, 740.78),
						title: 'About Annotations',
						cameraPosition: new THREE.Vector3(590105.53, 231541.63, 782.05),
						cameraTarget: new THREE.Vector3(590043.63, 231488.79, 740.78),
						description: 'Click on the annotation label to move to a predefined view.'
					});
					viewer.scene.annotations.add(aAbout1);

					const aAbout2 = new Annotation({
						position: new THREE.Vector3(589621, 231437, 784),
						cameraPosition: new THREE.Vector3(589585.81, 231463.63, 804.00),
						cameraTarget: new THREE.Vector3(589625.86, 231439, 775.38),
						title: 'About Annotations 2',
						description: 'Suitable annotation positions and views can be obtained by inspecting camera position.'
					});
					viewer.scene.annotations.add(aAbout2);

					const aActions = new Annotation({
						position: new THREE.Vector3(590012.986, 231273.294, 787.162),
						title: 'Elevation / RGB Actions'
					});
					viewer.scene.annotations.add(aActions);

					const aGradient = new Annotation({
						position: new THREE.Vector3(589577.396, 231267.514, 807.655),
						title: 'Gradient Color Selection'
					});
					viewer.scene.annotations.add(aGradient);

					const aTrees = new Annotation({
						position: new THREE.Vector3(589850.15, 231300.10, 770.94),
						title: 'Trees',
						description: 'Point cloud of a small section in Sorvilier, Switzerland. Courtesy of sigeom.sa'
					});
					viewer.scene.annotations.add(aTrees);
				}
			})
			.catch((err: any) => {
				console.error("Lỗi tải đám mây điểm sigeom.sa:", err);
			});
	};

	// Initial load
	useEffect(() => {
		if (!viewer) return;
		loadDataset();
	}, [viewer]);

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
			{/* Main Full-Screen 3D Canvas */}
			<div
				ref={containerRef}
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					width: '100vw',
					height: '100vh',
				}}
			/>

			{/* Authentic Potree Sidebar */}
			<PotreeSidebar
				viewer={viewer}
				isOpen={sidebarOpen}
				onToggle={() => setSidebarOpen(!sidebarOpen)}
				onClose={() => setSidebarOpen(false)}
				onOpenProfile={() => setProfileOpen(true)}
			/>

			{/* 3D Cross-Section Profile Viewer */}
			<ProfileViewer
				viewer={viewer}
				isOpen={profileOpen}
				onClose={() => setProfileOpen(false)}
			/>
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
