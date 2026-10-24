/**
 * Modern Color Picker Component (TypeScript)
 * Pure vanilla TS, glassmorphism design, native HTML5 color picker integration.
 * Zero external dependencies.
 */

export interface RGBColor {
	r: number;
	g: number;
	b: number;
	a: number;
}

export interface ColorObject {
	toHexString: () => string;
	toRgbString: () => string;
	toRgb: () => RGBColor;
	r: number;
	g: number;
	b: number;
}

export interface ModernColorPickerOptions {
	container?: HTMLElement | string | { jquery: any; [key: number]: HTMLElement };
	color?: string;
	showAlpha?: boolean;
	change?: (colorObj: ColorObject) => void;
	move?: (colorObj: ColorObject) => void;
	onChange?: (hex: string) => void;
}

export class ModernColorPicker {
	public options: ModernColorPickerOptions;
	public colorHex: string;
	public element: HTMLElement;
	public swatch!: HTMLElement;
	public nativeInput!: HTMLInputElement;

	private changeCallback: ((colorObj: ColorObject) => void) | null;
	private moveCallback: ((colorObj: ColorObject) => void) | null;
	private onChangeCallback: ((hex: string) => void) | null;

	constructor(options: ModernColorPickerOptions = {}) {
		this.options = options;
		this.changeCallback = options.change || null;
		this.moveCallback = options.move || null;
		this.onChangeCallback = options.onChange || null;

		this.colorHex = this._normalizeToHex(options.color || '#38bdf8');
		this.element = this._render();

		if (options.container) {
			const anyContainer = options.container as any;
			const target: HTMLElement | null = typeof options.container === 'string'
				? document.querySelector(options.container)
				: (anyContainer.jquery ? anyContainer[0] : (anyContainer as HTMLElement));
			if (target) {
				target.innerHTML = '';
				target.appendChild(this.element);
			}
		}
	}

	private _normalizeToHex(color: any): string {
		if (!color) return '#ffffff';
		if (typeof color === 'string') {
			if (color.startsWith('#')) {
				return color.length === 7 ? color : color.padEnd(7, '0');
			}
			if (color.startsWith('rgb')) {
				const parts = color.match(/\d+/g);
				if (parts && parts.length >= 3) {
					const r = parseInt(parts[0], 10).toString(16).padStart(2, '0');
					const g = parseInt(parts[1], 10).toString(16).padStart(2, '0');
					const b = parseInt(parts[2], 10).toString(16).padStart(2, '0');
					return `#${r}${g}${b}`;
				}
			}
		}
		return '#ffffff';
	}

	private _hexToRgb(hex: string): RGBColor {
		let c = hex.replace('#', '');
		if (c.length === 3) {
			c = c.split('').map((x) => x + x).join('');
		}
		const num = parseInt(c, 16);
		return {
			r: (num >> 16) & 255,
			g: (num >> 8) & 255,
			b: num & 255,
			a: 1,
		};
	}

	private _createColorObject(hex: string): ColorObject {
		const rgb = this._hexToRgb(hex);
		return {
			toHexString: () => hex,
			toRgbString: () => `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
			toRgb: () => rgb,
			r: rgb.r,
			g: rgb.g,
			b: rgb.b,
		};
	}

	private _render(): HTMLElement {
		const root = document.createElement('div');
		root.className = 'potree-colorpicker-wrapper';

		const swatch = document.createElement('div');
		swatch.className = 'potree-colorpicker-swatch';
		swatch.style.backgroundColor = this.colorHex;

		const nativeInput = document.createElement('input');
		nativeInput.type = 'color';
		nativeInput.className = 'potree-colorpicker-input';
		nativeInput.value = this.colorHex;

		swatch.addEventListener('click', () => {
			nativeInput.click();
		});

		nativeInput.addEventListener('input', (e: Event) => {
			const target = e.target as HTMLInputElement;
			const newHex = target.value;
			this.colorHex = newHex;
			swatch.style.backgroundColor = newHex;
			const colorObj = this._createColorObject(newHex);

			if (typeof this.moveCallback === 'function') {
				this.moveCallback(colorObj);
			}
			if (typeof this.changeCallback === 'function') {
				this.changeCallback(colorObj);
			}
			if (typeof this.onChangeCallback === 'function') {
				this.onChangeCallback(newHex);
			}
		});

		nativeInput.addEventListener('change', (e: Event) => {
			const target = e.target as HTMLInputElement;
			const newHex = target.value;
			this.colorHex = newHex;
			swatch.style.backgroundColor = newHex;
			const colorObj = this._createColorObject(newHex);

			if (typeof this.changeCallback === 'function') {
				this.changeCallback(colorObj);
			}
			if (typeof this.onChangeCallback === 'function') {
				this.onChangeCallback(newHex);
			}
			root.dispatchEvent(new CustomEvent('change', { detail: colorObj }));
		});

		this.swatch = swatch;
		this.nativeInput = nativeInput;

		root.appendChild(swatch);
		root.appendChild(nativeInput);
		return root;
	}

	public setColor(val: string, trigger = true): void {
		const hex = this._normalizeToHex(val);
		this.colorHex = hex;
		if (this.swatch) this.swatch.style.backgroundColor = hex;
		if (this.nativeInput) this.nativeInput.value = hex;

		if (trigger) {
			const colorObj = this._createColorObject(hex);
			if (typeof this.changeCallback === 'function') {
				this.changeCallback(colorObj);
			}
			if (typeof this.onChangeCallback === 'function') {
				this.onChangeCallback(hex);
			}
		}
	}

	public getColor(): ColorObject {
		return this._createColorObject(this.colorHex);
	}

	public destroy(): void {
		if (this.element && this.element.parentNode) {
			this.element.parentNode.removeChild(this.element);
		}
	}
}
