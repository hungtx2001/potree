import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { PotreeStore } from '../viewer/store/PotreeStore.js';
import { Viewer } from '../viewer/viewer.js';
import { loadPointCloud } from '../core.js';

/**
 * React hook to reactively subscribe to PotreeStore state
 */
export function usePotreeStore<T = any>(
	store: PotreeStore | undefined | null,
	selector: (state: any) => T = (s) => s
): T {
	const lastSelectedState = useRef<T | undefined>(undefined);

	const getSnapshot = () => {
		if (!store) return undefined as any;
		const nextSelected = selector(store.getState());
		if (lastSelectedState.current === undefined || nextSelected !== lastSelectedState.current) {
			lastSelectedState.current = nextSelected;
		}
		return lastSelectedState.current;
	};

	const subscribe = (callback: () => void) => {
		if (!store) return () => {};
		return store.subscribe(callback);
	};

	return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export interface UsePotreeOptions {
	pointcloudUrl?: string;
	pointcloudName?: string;
	onViewerReady?: (viewer: any) => void;
	onPointcloudLoaded?: (pointcloud: any) => void;
}

/**
 * React hook to initialize and manage a Potree viewer instance
 */
export function usePotree(
	containerRef: React.RefObject<HTMLElement | null>,
	options: UsePotreeOptions = {}
) {
	const viewerRef = useRef<any>(null);
	const [viewer, setViewer] = useState<any>(null);
	const [isReady, setIsReady] = useState(false);
	const [pointcloud, setPointcloud] = useState<any>(null);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const instance = new Viewer(container);
		viewerRef.current = instance;
		setViewer(instance);
		setIsReady(true);

		if (options.onViewerReady) {
			options.onViewerReady(instance);
		}

		if (options.pointcloudUrl) {
			loadPointCloud(options.pointcloudUrl, options.pointcloudName || 'pointcloud')
				.then((res) => {
					if (!res.pointcloud) return;
					instance.scene.addPointCloud(res.pointcloud);
					instance.fitToScreen();
					setPointcloud(res.pointcloud);

					if (options.onPointcloudLoaded) {
						options.onPointcloudLoaded(res.pointcloud);
					}
				})
				.catch((err) => {
					console.error('[usePotree] Failed to load point cloud:', err);
				});
		}

		return () => {
			if (viewerRef.current) {
				try {
					if (typeof viewerRef.current.destroy === 'function') {
						viewerRef.current.destroy();
					}
				} catch (e) {
					console.warn('[usePotree] Cleanup warning:', e);
				}
				viewerRef.current = null;
				setViewer(null);
				setIsReady(false);
			}
		};
	}, [containerRef]);

	return {
		viewer,
		isReady,
		pointcloud,
	};
}
