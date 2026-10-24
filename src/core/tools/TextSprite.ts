import * as THREE from 'three';

export interface RGBAColor {
	r: number;
	g: number;
	b: number;
	a: number;
}

export class TextSprite extends THREE.Object3D {
	public texture: THREE.Texture;
	public material: THREE.SpriteMaterial;
	public sprite: THREE.Sprite;
	public borderThickness: number = 4;
	public fontface: string = 'Arial';
	public fontsize: number = 28;
	public borderColor: RGBAColor = { r: 0, g: 0, b: 0, a: 1.0 };
	public backgroundColor: RGBAColor = { r: 255, g: 255, b: 255, a: 1.0 };
	public textColor: RGBAColor = { r: 255, g: 255, b: 255, a: 1.0 };
	public text: string = '';

	constructor(text: string = '') {
		super();

		const texture = new THREE.Texture();
		texture.minFilter = THREE.LinearFilter;
		texture.magFilter = THREE.LinearFilter;
		const spriteMaterial = new THREE.SpriteMaterial({
			map: texture,
			depthTest: false,
			depthWrite: false,
		});

		this.texture = texture;
		this.material = spriteMaterial;
		this.sprite = new THREE.Sprite(this.material);
		this.add(this.sprite);

		this.borderThickness = 4;
		this.fontface = 'Arial';
		this.fontsize = 28;
		this.borderColor = { r: 0, g: 0, b: 0, a: 1.0 };
		this.backgroundColor = { r: 255, g: 255, b: 255, a: 1.0 };
		this.textColor = { r: 255, g: 255, b: 255, a: 1.0 };
		this.text = '';

		this.setText(text);
	}

	setText(text: string): void {
		if (this.text !== text) {
			this.text = text;
			this.update();
		}
	}

	setTextColor(color: RGBAColor): void {
		this.textColor = color;
		this.update();
	}

	setBorderColor(color: RGBAColor): void {
		this.borderColor = color;
		this.update();
	}

	setBackgroundColor(color: RGBAColor): void {
		this.backgroundColor = color;
		this.update();
	}

	update(): void {
		if (typeof document === 'undefined') return;

		const canvas = document.createElement('canvas');
		const context = canvas.getContext('2d');
		if (!context) return;

		context.font = 'Bold ' + this.fontsize + 'px ' + this.fontface;

		const metrics = context.measureText(this.text);
		const textWidth = metrics.width;
		const margin = 5;
		const spriteWidth = 2 * margin + textWidth + 2 * this.borderThickness;
		const spriteHeight = this.fontsize * 1.4 + 2 * this.borderThickness;

		context.canvas.width = spriteWidth;
		context.canvas.height = spriteHeight;
		context.font = 'Bold ' + this.fontsize + 'px ' + this.fontface;

		context.fillStyle = `rgba(${this.backgroundColor.r},${this.backgroundColor.g},${this.backgroundColor.b},${this.backgroundColor.a})`;
		context.strokeStyle = `rgba(${this.borderColor.r},${this.borderColor.g},${this.borderColor.b},${this.borderColor.a})`;

		context.lineWidth = this.borderThickness;
		this.roundRect(context, this.borderThickness / 2, this.borderThickness / 2,
			textWidth + this.borderThickness + 2 * margin, this.fontsize * 1.4 + this.borderThickness, 6);

		context.strokeStyle = 'rgba(0, 0, 0, 1.0)';
		context.strokeText(this.text, this.borderThickness + margin, this.fontsize + this.borderThickness);

		context.fillStyle = `rgba(${this.textColor.r},${this.textColor.g},${this.textColor.b},${this.textColor.a})`;
		context.fillText(this.text, this.borderThickness + margin, this.fontsize + this.borderThickness);

		const texture = new THREE.Texture(canvas);
		texture.minFilter = THREE.LinearFilter;
		texture.magFilter = THREE.LinearFilter;
		texture.needsUpdate = true;

		(this.sprite.material as THREE.SpriteMaterial).map = texture;
		this.sprite.scale.set(spriteWidth * 0.01, spriteHeight * 0.01, 1.0);
		this.texture = texture;
	}

	roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
		ctx.beginPath();
		ctx.moveTo(x + r, y);
		ctx.lineTo(x + w - r, y);
		ctx.quadraticCurveTo(x + w, y, x + w, y + r);
		ctx.lineTo(x + w, y + h - r);
		ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
		ctx.lineTo(x + r, y + h);
		ctx.quadraticCurveTo(x, y + h, x, y + h - r);
		ctx.lineTo(x, y + r);
		ctx.quadraticCurveTo(x, y, x + r, y);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
	}
}
