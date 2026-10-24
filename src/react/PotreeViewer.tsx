import React, { useRef } from 'react';
import type { PotreeViewerProps } from './types.js';
import { usePotree } from './usePotree.js';
import { FloatingToolbar } from './FloatingToolbar.js';

export const PotreeViewer: React.FC<PotreeViewerProps> = ({
	pointcloudUrl,
	pointcloudName,
	className = '',
	style = {},
	toolbar = true,
	onViewerReady,
	onPointcloudLoaded,
}) => {
	const containerRef = useRef<HTMLDivElement>(null);

	const { viewer, isReady } = usePotree(containerRef, {
		pointcloudUrl,
		pointcloudName,
		onViewerReady,
		onPointcloudLoaded,
	});

	return (
		<div
			className={`potree_container ${className}`}
			style={{
				position: 'relative',
				width: '100%',
				height: '100%',
				overflow: 'hidden',
				...style,
			}}
		>
			{/* 3D WebGL Canvas Container */}
			<div
				ref={containerRef}
				style={{
					position: 'absolute',
					inset: 0,
					width: '100%',
					height: '100%',
				}}
			/>

			{/* Modern Floating Toolbar */}
			{toolbar && isReady && viewer && (
				<FloatingToolbar viewer={viewer} />
			)}
		</div>
	);
};
