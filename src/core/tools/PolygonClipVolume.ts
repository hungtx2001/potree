import * as THREE from 'three';

export class PolygonClipVolume extends THREE.Object3D {
	public static counter: number = 0;
	public camera: THREE.Camera;
	public viewMatrix: THREE.Matrix4;
	public projMatrix: THREE.Matrix4;
	public markers: THREE.Mesh[] = [];
	public initialized: boolean = false;

	constructor(camera: THREE.Camera) {
		super();

		PolygonClipVolume.counter = (PolygonClipVolume.counter === undefined) ? 0 : PolygonClipVolume.counter + 1;
		this.name = 'polygon_clip_volume_' + PolygonClipVolume.counter;

		this.camera = camera.clone();
		this.camera.rotation.copy(camera.rotation);
		this.camera.rotation.order = camera.rotation.order;
		this.camera.updateMatrixWorld();
		if ((this.camera as any).updateProjectionMatrix) {
			(this.camera as any).updateProjectionMatrix();
		}
		this.camera.matrixWorldInverse.copy(this.camera.matrixWorld).invert();

		this.viewMatrix = this.camera.matrixWorldInverse.clone();
		this.projMatrix = this.camera.projectionMatrix.clone();

		this.markers = [];
		this.initialized = false;
	}

	addMarker(): void {
		const marker = new THREE.Mesh();
		let cancel: () => void;

		const drag = (e: any) => {
			const size = e.viewer.renderer.getSize(new THREE.Vector2());
			const projectedPos = new THREE.Vector3(
				2.0 * (e.drag.end.x / size.width) - 1.0,
				-2.0 * (e.drag.end.y / size.height) + 1.0,
				0
			);

			marker.position.copy(projectedPos);
		};

		const drop = () => {
			cancel();
		};

		cancel = () => {
			(marker as any).removeEventListener?.('drag', drag);
			(marker as any).removeEventListener?.('drop', drop);
		};

		(marker as any).addEventListener?.('drag', drag);
		(marker as any).addEventListener?.('drop', drop);

		this.markers.push(marker);
	}

	removeLastMarker(): void {
		if (this.markers.length > 0) {
			this.markers.splice(this.markers.length - 1, 1);
		}
	}
}
