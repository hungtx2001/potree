import React, { useRef, useEffect, useState } from 'react';
import { Viewer } from '../viewer/viewer.js';
import type { CesiumControls } from '../navigation/CesiumControls.js';

export interface CesiumPotreeOverlayProps {
	cesiumViewer: any;
	projection: string;
	cesiumLib?: any;
	pointCloudUrls?: string[];
	className?: string;
	style?: React.CSSProperties;
	onViewerReady?: (viewer: Viewer, cesiumControls: CesiumControls) => void;
	children?: React.ReactNode;
}

export const CesiumPotreeOverlay: React.FC<CesiumPotreeOverlayProps> = ({
	cesiumViewer,
	projection,
	cesiumLib,
	pointCloudUrls = [],
	className = '',
	style,
	onViewerReady,
	children,
}) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const viewerRef = useRef<Viewer | null>(null);
	const [viewerInstance, setViewerInstance] = useState<Viewer | null>(null);

	useEffect(() => {
		if (!containerRef.current || !cesiumViewer) return;

		// Initialize Potree Viewer attached over Cesium
		const viewer = new Viewer(containerRef.current, {
			useDefaultRenderLoop: false, // Let Cesium drive render loop
		});

		viewerRef.current = viewer;

		// Connect 2-way camera sync and coordinate transformation
		const cesiumControls = (viewer as any).setCesiumViewer(cesiumViewer, projection, cesiumLib);

		// Load initial point clouds if provided
		if (pointCloudUrls && pointCloudUrls.length > 0) {
			for (const url of pointCloudUrls) {
				if (typeof (viewer as any).loadPointCloud === 'function') {
					(viewer as any).loadPointCloud(url);
				}
			}
		}

		setViewerInstance(viewer);

		if (onViewerReady) {
			onViewerReady(viewer, cesiumControls);
		}

		// Handle resize
		const resizeObserver = new ResizeObserver(() => {
			if (containerRef.current && (viewer as any).renderer) {
				const width = containerRef.current.clientWidth;
				const height = containerRef.current.clientHeight;
				(viewer as any).renderer.setSize(width, height);
			}
		});
		resizeObserver.observe(containerRef.current);

		return () => {
			resizeObserver.disconnect();
			if (viewerRef.current) {
				if (typeof viewerRef.current.destroy === 'function') {
					viewerRef.current.destroy();
				}
				viewerRef.current = null;
			}
			setViewerInstance(null);
		};
	}, [cesiumViewer, projection, cesiumLib]);

	return (
		<div
			ref={containerRef}
			className={`potree_container potree-cesium-overlay ${className}`}
			style={{
				position: 'absolute',
				top: 0,
				left: 0,
				width: '100%',
				height: '100%',
				pointerEvents: 'none', // Allow Cesium mouse interaction through transparent areas
				overflow: 'hidden',
				zIndex: 2,
				...style,
			}}
		>
			{/* Canvas will be rendered here by Potree */}
			{children && (
				<div style={{ position: 'relative', width: '100%', height: '100%', pointerEvents: 'none' }}>
					{/* Pass viewer instance down via children or cloneElement */}
					{React.Children.map(children, child => {
						if (React.isValidElement(child)) {
							return React.cloneElement(child as React.ReactElement<any>, {
								viewer: viewerInstance,
								style: { ...(child.props as any)?.style, pointerEvents: 'auto' },
							});
						}
						return child;
					})}
				</div>
			)}
		</div>
	);
};
