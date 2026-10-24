/**
 * Modern Color Picker Component
 * Pure vanilla JS, glassmorphism design, native HTML5 color picker integration.
 * Drop-in replacement for spectrum-colorpicker2 with zero external dependencies.
 */

export class ModernColorPicker {
	/**
	 * @param {Object} options
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

	/**
	 * Attach ModernColorPicker to target element
	 */
	static attach(target, options = {}) {
		const dom = (typeof target === 'string')
			? document.querySelector(target)
			: (target && target.jquery ? target[0] : target);

		if (!dom) return null;

		if (dom._potreeColorPicker) {
			if (options.color) dom._potreeColorPicker.setColor(options.color);
			return dom._potreeColorPicker;
		}

		const picker = new ModernColorPicker(options);
		dom.innerHTML = '';
		dom.appendChild(picker.element);
		dom._potreeColorPicker = picker;
		return picker;
	}

	/**
	 * Installs seamless drop-in jQuery plugin for spectrum
	 * @param {Object} $ - jQuery instance
	 */
	static installJQueryPlugin($) {
		if (!$ || !$.fn) return;

		$.fn.spectrum = function(...args) {
			if (args.length === 0) return this;

			if (args[0] === 'set' && args.length >= 2) {
				return this.each(function() {
					if (this._potreeColorPicker) {
						this._potreeColorPicker.setColor(args[1]);
					}
				});
			}

			if (args[0] === 'get') {
				const el = this[0];
				return el && el._potreeColorPicker ? el._potreeColorPicker.getColor() : null;
			}

			const opts = args[0] || {};
			return this.each(function() {
				ModernColorPicker.attach(this, opts);
			});
		};
	}
}
