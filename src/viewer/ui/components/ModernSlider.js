/**
 * Modern Vanilla JS Slider & Range Slider Component
 * Zero-dependency, modern hardware-accelerated styling with glassmorphism and gradient fill.
 * Supports both single-value and dual-handle range sliders.
 */

export class ModernSlider {
	/**
	 * @param {Object} options
	 * @param {HTMLElement|string} [options.container]
	 * @param {number} [options.min=0]
	 * @param {number} [options.max=100]
	 * @param {number} [options.step=1]
	 * @param {number} [options.value=0]
	 * @param {Array<number>} [options.values]
	 * @param {boolean} [options.range=false]
	 * @param {Function} [options.slide] - (event, ui)
	 * @param {Function} [options.change] - (event, ui)
	 */
	constructor(options = {}) {
		this.min = options.min !== undefined ? Number(options.min) : 0;
		this.max = options.max !== undefined ? Number(options.max) : 100;
		this.step = options.step !== undefined ? Number(options.step) : 1;
		this.isRange = Boolean(options.range || (options.values && options.values.length === 2));

		this.slideCallback = options.slide || null;
		this.changeCallback = options.change || null;

		if (this.isRange) {
			const initialValues = options.values || [this.min, this.max];
			this.values = [Number(initialValues[0]), Number(initialValues[1])];
			this.value = this.values[0];
		} else {
			this.value = options.value !== undefined ? Number(options.value) : this.min;
			this.values = [this.value];
		}

		this.element = this._render();
		this.updateTrackFill();
	}

	_render() {
		const root = document.createElement('div');
		root.className = 'potree-slider-wrapper' + (this.isRange ? ' potree-slider-range' : '');

		const track = document.createElement('div');
		track.className = 'potree-slider-track';

		const fill = document.createElement('div');
		fill.className = 'potree-slider-fill';
		track.appendChild(fill);
		this.fillElement = fill;

		if (this.isRange) {
			// Range slider: two native range inputs overlaid
			const inputMin = document.createElement('input');
			inputMin.type = 'range';
			inputMin.className = 'potree-range-input potree-range-min';
			inputMin.min = String(this.min);
			inputMin.max = String(this.max);
			inputMin.step = String(this.step);
			inputMin.value = String(this.values[0]);

			const inputMax = document.createElement('input');
			inputMax.type = 'range';
			inputMax.className = 'potree-range-input potree-range-max';
			inputMax.min = String(this.min);
			inputMax.max = String(this.max);
			inputMax.step = String(this.step);
			inputMax.value = String(this.values[1]);

			const handleInput = (e, isMin) => {
				let v1 = parseFloat(inputMin.value);
				let v2 = parseFloat(inputMax.value);

				if (isMin && v1 > v2) {
					inputMin.value = String(v2);
					v1 = v2;
				} else if (!isMin && v2 < v1) {
					inputMax.value = String(v1);
					v2 = v1;
				}

				this.values = [v1, v2];
				this.value = v1;
				this.updateTrackFill();

				if (typeof this.slideCallback === 'function') {
					this.slideCallback(e, { values: this.values, value: v1 });
				}
				root.dispatchEvent(new CustomEvent('slide', { detail: { values: this.values } }));
			};

			const handleChange = (e) => {
				if (typeof this.changeCallback === 'function') {
					this.changeCallback(e, { values: this.values, value: this.values[0] });
				}
				root.dispatchEvent(new CustomEvent('change', { detail: { values: this.values } }));
			};

			inputMin.addEventListener('input', (e) => handleInput(e, true));
			inputMin.addEventListener('change', handleChange);

			inputMax.addEventListener('input', (e) => handleInput(e, false));
			inputMax.addEventListener('change', handleChange);

			this.inputMin = inputMin;
			this.inputMax = inputMax;

			root.appendChild(track);
			root.appendChild(inputMin);
			root.appendChild(inputMax);
		} else {
			// Single slider
			const input = document.createElement('input');
			input.type = 'range';
			input.className = 'potree-range-input';
			input.min = String(this.min);
			input.max = String(this.max);
			input.step = String(this.step);
			input.value = String(this.value);

			input.addEventListener('input', (e) => {
				const val = parseFloat(input.value);
				this.value = val;
				this.values = [val];
				this.updateTrackFill();

				if (typeof this.slideCallback === 'function') {
					this.slideCallback(e, { value: val });
				}
				root.dispatchEvent(new CustomEvent('slide', { detail: { value: val } }));
			});

			input.addEventListener('change', (e) => {
				if (typeof this.changeCallback === 'function') {
					this.changeCallback(e, { value: this.value });
				}
				root.dispatchEvent(new CustomEvent('change', { detail: { value: this.value } }));
			});

			this.inputSingle = input;
			root.appendChild(track);
			root.appendChild(input);
		}

		return root;
	}

	updateTrackFill() {
		if (!this.fillElement) return;

		const rangeSpan = this.max - this.min || 1;
		if (this.isRange) {
			const leftPercent = Math.max(0, Math.min(100, ((this.values[0] - this.min) / rangeSpan) * 100));
			const rightPercent = Math.max(0, Math.min(100, ((this.values[1] - this.min) / rangeSpan) * 100));
			this.fillElement.style.left = `${leftPercent}%`;
			this.fillElement.style.width = `${Math.max(0, rightPercent - leftPercent)}%`;
		} else {
			const percent = Math.max(0, Math.min(100, ((this.value - this.min) / rangeSpan) * 100));
			this.fillElement.style.left = '0%';
			this.fillElement.style.width = `${percent}%`;
		}
	}

	setValue(val, trigger = false) {
		const num = Number(val);
		this.value = num;
		this.values = [num];
		if (this.inputSingle) {
			this.inputSingle.value = String(num);
		}
		this.updateTrackFill();

		if (trigger && typeof this.changeCallback === 'function') {
			this.changeCallback(null, { value: num });
		}
	}

	getValue() {
		return this.value;
	}

	setValues(values, trigger = false) {
		if (!this.isRange || !Array.isArray(values)) return;
		this.values = [Number(values[0]), Number(values[1])];
		this.value = this.values[0];

		if (this.inputMin) this.inputMin.value = String(this.values[0]);
		if (this.inputMax) this.inputMax.value = String(this.values[1]);
		this.updateTrackFill();

		if (trigger && typeof this.changeCallback === 'function') {
			this.changeCallback(null, { values: this.values, value: this.values[0] });
		}
	}

	getValues() {
		return this.values ? [...this.values] : [this.value];
	}

	setOption(key, val) {
		if (key === 'min') {
			this.min = Number(val);
			if (this.inputSingle) this.inputSingle.min = String(val);
			if (this.inputMin) this.inputMin.min = String(val);
			if (this.inputMax) this.inputMax.min = String(val);
		} else if (key === 'max') {
			this.max = Number(val);
			if (this.inputSingle) this.inputSingle.max = String(val);
			if (this.inputMin) this.inputMin.max = String(val);
			if (this.inputMax) this.inputMax.max = String(val);
		} else if (key === 'step') {
			this.step = Number(val);
			if (this.inputSingle) this.inputSingle.step = String(val);
			if (this.inputMin) this.inputMin.step = String(val);
			if (this.inputMax) this.inputMax.step = String(val);
		} else if (key === 'value') {
			this.setValue(val);
		} else if (key === 'values') {
			this.setValues(val);
		}
		this.updateTrackFill();
	}

	getOption(key) {
		if (key === 'min') return this.min;
		if (key === 'max') return this.max;
		if (key === 'step') return this.step;
		if (key === 'value') return this.getValue();
		if (key === 'values') return this.getValues();
		return undefined;
	}

	/**
	 * Mounts ModernSlider into a target element or selector
	 * @param {HTMLElement|string|Object} target
	 * @param {Object} options
	 * @returns {ModernSlider}
	 */
	static attach(target, options = {}) {
		const dom = (typeof target === 'string')
			? document.querySelector(target)
			: (target && target.jquery ? target[0] : target);

		if (!dom) return null;

		// If already attached, update existing
		if (dom._potreeSlider) {
			const s = dom._potreeSlider;
			if (options.value !== undefined) s.setValue(options.value);
			if (options.values !== undefined) s.setValues(options.values);
			if (options.min !== undefined) s.setOption('min', options.min);
			if (options.max !== undefined) s.setOption('max', options.max);
			if (options.step !== undefined) s.setOption('step', options.step);
			return s;
		}

		const slider = new ModernSlider(options);
		dom.innerHTML = '';
		dom.appendChild(slider.element);
		dom._potreeSlider = slider;
		return slider;
	}

	/**
	 * Installs seamless jQuery UI slider compatibility shim
	 * Replaces jQuery UI's $.fn.slider with ModernSlider
	 * @param {Object} $ - jQuery instance
	 */
	static installJQueryPlugin($) {
		if (!$ || !$.fn) return;

		$.fn.slider = function(...args) {
			if (args.length === 0) {
				return this;
			}

			// Case 1: Method call with string: $(el).slider('value'), $(el).slider('values'), $(el).slider('option', key)
			if (typeof args[0] === 'string') {
				const method = args[0];
				const el = this[0];
				if (!el || !el._potreeSlider) return undefined;
				const instance = el._potreeSlider;

				if (method === 'value') {
					if (args.length === 1) {
						return instance.getValue();
					} else {
						return this.each(function() {
							if (this._potreeSlider) this._potreeSlider.setValue(args[1]);
						});
					}
				}

				if (method === 'values') {
					if (args.length === 1) {
						return instance.getValues();
					} else if (args.length === 2 && typeof args[1] === 'number') {
						const vals = instance.getValues();
						return vals[args[1]];
					} else {
						return this.each(function() {
							if (this._potreeSlider) this._potreeSlider.setValues(args[1]);
						});
					}
				}

				if (method === 'option') {
					if (args.length === 2) {
						return instance.getOption(args[1]);
					} else if (args.length >= 3) {
						return this.each(function() {
							if (this._potreeSlider) this._potreeSlider.setOption(args[1], args[2]);
						});
					}
				}
				return this;
			}

			// Case 2: Initialization or option update: $(el).slider({ min, max, value, ... })
			const opts = args[0] || {};
			return this.each(function() {
				ModernSlider.attach(this, opts);
			});
		};
	}
}
