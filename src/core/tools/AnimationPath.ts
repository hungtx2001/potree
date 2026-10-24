import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';

export class PathAnimation {
	public path: AnimationPath;
	public length: number;
	public speed: number;
	public callback: (t: number) => void;
	public tween: any = null;
	public startPoint: number;
	public endPoint: number;
	public t: number = 0.0;
	public repeat: boolean = false;

	constructor(path: AnimationPath, start: number, end: number, speed: number, callback: (t: number) => void) {
		this.path = path;
		this.length = this.path.spline.getLength();
		this.speed = speed;
		this.callback = callback;
		this.tween = null;
		this.startPoint = Math.max(start, 0);
		this.endPoint = Math.min(end, this.length);
		this.t = 0.0;
	}

	start(resume: boolean = false): void {
		if (this.tween) {
			this.tween.stop();
			this.tween = null;
		}

		let tStart: number;
		if (resume) {
			tStart = this.t;
		} else {
			tStart = this.startPoint / this.length;
		}
		const tEnd = this.endPoint / this.length;
		const animationDuration = (tEnd - tStart) * this.length * 1000 / this.speed;

		const progress = { t: tStart };
		this.tween = new TWEEN.Tween(progress).to({ t: tEnd }, animationDuration);
		this.tween.easing(TWEEN.Easing.Linear.None);
		this.tween.onUpdate(() => {
			this.t = progress.t;
			this.callback(progress.t);
		});
		this.tween.onComplete(() => {
			if (this.repeat) {
				this.start();
			}
		});

		setTimeout(() => {
			if (this.tween) this.tween.start();
		}, 0);
	}

	stop(): void {
		if (!this.tween) return;
		this.tween.stop();
		this.tween = null;
		this.t = 0;
	}

	pause(): void {
		if (!this.tween) return;
		this.tween.stop();
		TWEEN.remove(this.tween);
		this.tween = null;
	}

	resume(): void {
		this.start(true);
	}

	getPoint(t: number): THREE.Vector3 {
		return this.path.spline.getPoint(t);
	}
}

export class AnimationPath {
	public points: THREE.Vector3[];
	public spline: THREE.CatmullRomCurve3;
	public tween: any = null;

	constructor(points: THREE.Vector3[] = []) {
		this.points = points;
		this.spline = new THREE.CatmullRomCurve3(points);
	}

	get(t: number): THREE.Vector3 {
		return this.spline.getPoint(t);
	}

	getLength(): number {
		return this.spline.getLength();
	}

	animate(start: number, end: number, speed: number, callback: (t: number) => void): PathAnimation {
		const animation = new PathAnimation(this, start, end, speed, callback);
		animation.start();
		return animation;
	}

	pause(): void {
		if (this.tween) {
			this.tween.stop();
		}
	}

	resume(): void {
		if (this.tween) {
			this.tween.start();
		}
	}

	getGeometry(): THREE.BufferGeometry {
		const samples = 500;
		const pts: THREE.Vector3[] = [];

		for (let u = 0; u <= 1; u += 1 / samples) {
			pts.push(this.spline.getPoint(u));
		}

		if (this.closed) {
			pts.push(this.spline.getPoint(0));
		}

		const geometry = new THREE.BufferGeometry().setFromPoints(pts);
		return geometry;
	}

	get closed(): boolean {
		return (this.spline as any).closed;
	}

	set closed(value: boolean) {
		(this.spline as any).closed = value;
	}
}
