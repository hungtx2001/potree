/**
 * Modern Color Picker Component
 * Pure vanilla JS, glassmorphism design, native HTML5 color picker integration.
 * Zero external dependencies.
 */

export class ModernColorPicker {
	/**
	 * @param {Object} options
	 * @param {HTMLElement|string} [options.container]
	 * @param {string} [options.color='#ffffff']
	 * @param {Function} [options.change] - (colorObj)
	 * @param {Function} [options.move] - (colorObj)
	 */
	constructor(options = {}) {
		this.options = options;
		this.changeCallback = options.change || null;
		this.moveCallback = options.move || null;

		this.colorHex = this._normalizeToHex(options.color || '#38bdf8');
		this.element = this._render();

		if (options.container) {
			const target = typeof options.container === 'string'
				? document.querySelector(options.container)
				: (options.container.jquery ? options.container[0] : options.container);
			if (target) {
				target.innerHTML = '';
				target.appendChild(this.element);
			}
		}
	}

	_normalizeToHex(color) {
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

	_hexToRgb(hex) {
		let c = hex.replace('#', '');
		if (c.length === 3) {
			c = c.split('').map(x => x + x).join('');
		}
		const num = parseInt(c, 16);
		return {
			r: (num >> 16) & 255,
			g: (num >> 8) & 255,
			b: num & 255,
			a: 1
		};
	}

	_createColorObject(hex) {
		const rgb = this._hexToRgb(hex);
		return {
			toHexString: () => hex,
			toRgbString: () => `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
			toRgb: () => rgb,
			r: rgb.r,
			g: rgb.g,
			b: rgb.b
		};
	}

	_render() {
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

		nativeInput.addEventListener('input', (e) => {
			const newHex = e.target.value;
			this.colorHex = newHex;
			swatch.style.backgroundColor = newHex;
			const colorObj = this._createColorObject(newHex);

			if (typeof this.moveCallback === 'function') {
				this.moveCallback(colorObj);
			}
			if (typeof this.changeCallback === 'function') {
				this.changeCallback(colorObj);
			}
		});

		nativeInput.addEventListener('change', (e) => {
			const newHex = e.target.value;
			this.colorHex = newHex;
			swatch.style.backgroundColor = newHex;
			const colorObj = this._createColorObject(newHex);

			if (typeof this.changeCallback === 'function') {
				this.changeCallback(colorObj);
			}
			root.dispatchEvent(new CustomEvent('change', { detail: colorObj }));
		});

		this.swatch = swatch;
		this.nativeInput = nativeInput;

		root.appendChild(swatch);
		root.appendChild(nativeInput);
		return root;
	}

	setColor(val) {
		const hex = this._normalizeToHex(val);
		this.colorHex = hex;
		if (this.swatch) this.swatch.style.backgroundColor = hex;
		if (this.nativeInput) this.nativeInput.value = hex;
	}

	getColor() {
		return this._createColorObject(this.colorHex);
	}

	destroy() {
		if (this.element && this.element.parentNode) {
			this.element.parentNode.removeChild(this.element);
		}
	}
}
