import * as THREE from 'three';

declare module 'three' {
	interface PerspectiveCamera {
		zoomTo(node: any, factor?: number): void;
	}
	interface OrthographicCamera {
		zoomTo(node: any, factor?: number): void;
	}
	interface Ray {
		distanceToPlaneWithNegative(plane: THREE.Plane): number | null;
	}
}

export function zoomToPerspective(camera: THREE.PerspectiveCamera, node: any, factor: number = 1): void {
	if (!node.geometry && !node.boundingSphere && !node.boundingBox) {
		return;
	}

	if (node.geometry && node.geometry.boundingSphere === null) {
		node.geometry.computeBoundingSphere();
	}

	node.updateMatrixWorld?.();

	let bs: THREE.Sphere;
	if (node.boundingSphere) {
		bs = node.boundingSphere;
	} else if (node.geometry && node.geometry.boundingSphere) {
		bs = node.geometry.boundingSphere;
	} else if (node.boundingBox) {
		bs = node.boundingBox.getBoundingSphere(new THREE.Sphere());
	} else {
		return;
	}

	bs = bs.clone().applyMatrix4(node.matrixWorld);
	const radius = bs.radius;
	let fovr = camera.fov * Math.PI / 180;

	if (camera.aspect < 1) {
		fovr = fovr * camera.aspect;
	}

	const distanceFactor = Math.abs(radius / Math.sin(fovr / 2)) * factor;
	const offset = camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(-distanceFactor);
	camera.position.copy(bs.center.clone().add(offset));
}

export function zoomToOrthographic(camera: THREE.OrthographicCamera, node: any, factor: number = 1): void {
	if (!node.geometry && !node.boundingBox) {
		return;
	}
	camera.updateProjectionMatrix();
}

export function rayDistanceToPlaneWithNegative(ray: THREE.Ray, plane: THREE.Plane): number | null {
	const denominator = plane.normal.dot(ray.direction);
	if (denominator === 0) {
		if (plane.distanceToPoint(ray.origin) === 0) {
			return 0;
		}
		return null;
	}
	const t = -(ray.origin.dot(plane.normal) + plane.constant) / denominator;
	return t;
}

export function extendThree(): void {
	if (!THREE.PerspectiveCamera.prototype.zoomTo) {
		THREE.PerspectiveCamera.prototype.zoomTo = function (node: any, factor?: number): void {
			zoomToPerspective(this, node, factor);
		};
	}

	if (!THREE.OrthographicCamera.prototype.zoomTo) {
		THREE.OrthographicCamera.prototype.zoomTo = function (node: any, factor?: number): void {
			zoomToOrthographic(this, node, factor);
		};
	}

	if (!THREE.Ray.prototype.distanceToPlaneWithNegative) {
		THREE.Ray.prototype.distanceToPlaneWithNegative = function (plane: THREE.Plane): number | null {
			return rayDistanceToPlaneWithNegative(this, plane);
		};
	}
}

// Auto-extend Three prototypes on import
extendThree();
