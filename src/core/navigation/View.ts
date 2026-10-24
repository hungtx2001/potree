import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';

export class View {
	public position: THREE.Vector3;
	public yaw: number;
	public _pitch: number;
	public radius: number;
	public maxPitch: number;
	public minPitch: number;

	constructor() {
		this.position = new THREE.Vector3(0, 0, 0);

		this.yaw = Math.PI / 4;
		this._pitch = -Math.PI / 4;
		this.radius = 1;

		this.maxPitch = Math.PI / 2;
		this.minPitch = -Math.PI / 2;
	}

	clone(): View {
		const c = new View();
		c.position.copy(this.position);
		c.yaw = this.yaw;
		c._pitch = this.pitch;
		c.radius = this.radius;
		c.maxPitch = this.maxPitch;
		c.minPitch = this.minPitch;

		return c;
	}

	get pitch(): number {
		return this._pitch;
	}

	set pitch(angle: number) {
		this._pitch = Math.max(Math.min(angle, this.maxPitch), this.minPitch);
	}

	get direction(): THREE.Vector3 {
		const dir = new THREE.Vector3(0, 1, 0);

		dir.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch);
		dir.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.yaw);

		return dir;
	}

	set direction(dir: THREE.Vector3) {
		if (dir.x === 0 && dir.y === 0) {
			this.pitch = Math.PI / 2 * Math.sign(dir.z);
		} else {
			const yaw = Math.atan2(dir.y, dir.x) - Math.PI / 2;
			const pitch = Math.atan2(dir.z, Math.sqrt(dir.x * dir.x + dir.y * dir.y));

			this.yaw = yaw;
			this.pitch = pitch;
		}
	}

	lookAt(t: THREE.Vector3 | number, y?: number, z?: number): void {
		let V: THREE.Vector3;

		if (t instanceof THREE.Vector3) {
			V = new THREE.Vector3().subVectors(t, this.position);
		} else if (typeof t === 'number' && y !== undefined && z !== undefined) {
			V = new THREE.Vector3().subVectors(new THREE.Vector3(t, y, z), this.position);
		} else {
			return;
		}

		const radius = V.length();
		const dir = V.normalize();

		this.radius = radius;
		this.direction = dir;
	}

	getPivot(): THREE.Vector3 {
		return new THREE.Vector3().addVectors(this.position, this.direction.multiplyScalar(this.radius));
	}

	getSide(): THREE.Vector3 {
		const side = new THREE.Vector3(1, 0, 0);
		side.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.yaw);
		return side;
	}

	pan(x: number, y: number): void {
		const dir = new THREE.Vector3(0, 1, 0);
		dir.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch);
		dir.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.yaw);

		const side = this.getSide();
		const up = side.clone().cross(dir);
		const pan = side.multiplyScalar(x).add(up.multiplyScalar(y));

		this.position = this.position.add(pan);
	}

	translate(x: number, y: number, z: number): void {
		const dir = new THREE.Vector3(0, 1, 0);
		dir.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch);
		dir.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.yaw);

		const side = new THREE.Vector3(1, 0, 0);
		side.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.yaw);

		const up = side.clone().cross(dir);
		const t = side.multiplyScalar(x)
			.add(dir.multiplyScalar(y))
			.add(up.multiplyScalar(z));

		this.position = this.position.add(t);
	}

	translateWorld(x: number, y: number, z: number): void {
		this.position.x += x;
		this.position.y += y;
		this.position.z += z;
	}

	setView(
		position: THREE.Vector3 | [number, number, number] | any,
		target: THREE.Vector3 | [number, number, number] | any,
		duration: number = 0,
		callback: (() => void) | null = null
	): void {
		let endPosition: THREE.Vector3;
		if (Array.isArray(position)) {
			endPosition = new THREE.Vector3(...position);
		} else if (position && position.x != null) {
			endPosition = position.clone();
		} else {
			return;
		}

		let endTarget: THREE.Vector3;
		if (Array.isArray(target)) {
			endTarget = new THREE.Vector3(...target);
		} else if (target && target.x != null) {
			endTarget = target.clone();
		} else {
			return;
		}

		const startPosition = this.position.clone();
		const startTarget = this.getPivot();
		const easing = TWEEN.Easing.Quartic.Out;

		if (duration === 0) {
			this.position.copy(endPosition);
			this.lookAt(endTarget);
			if (callback) callback();
		} else {
			const value = { x: 0 };
			const tween = new TWEEN.Tween(value).to({ x: 1 }, duration);
			tween.easing(easing);

			tween.onUpdate(() => {
				const t = value.x;
				const pos = new THREE.Vector3(
					(1 - t) * startPosition.x + t * endPosition.x,
					(1 - t) * startPosition.y + t * endPosition.y,
					(1 - t) * startPosition.z + t * endPosition.z
				);

				const tgt = new THREE.Vector3(
					(1 - t) * startTarget.x + t * endTarget.x,
					(1 - t) * startTarget.y + t * endTarget.y,
					(1 - t) * startTarget.z + t * endTarget.z
				);

				this.position.copy(pos);
				this.lookAt(tgt);
			});

			tween.onComplete(() => {
				if (callback) {
					callback();
				}
			});

			tween.start();
		}
	}
}
