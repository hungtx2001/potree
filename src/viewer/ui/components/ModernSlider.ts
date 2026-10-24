/**
 * Modern Vanilla TypeScript Slider & Range Slider Component
 * Zero-dependency, modern hardware-accelerated styling with glassmorphism and gradient fill.
 * Supports both single-value and dual-handle range sliders.
 */

export interface ModernSliderEvent {
	value: number;
	values?: number[];
}

export interface ModernSliderOptions {
	container?: HTMLElement | string | { jquery: any; [key: number]: HTMLElement };
	min?: number;
	max?: number;
	step?: number;
	value?: number;
	values?: number[];
	range?: boolean;
	slide?: (event: Event | null, ui: ModernSliderEvent) => void;
	change?: (event: Event | null, ui: ModernSliderEvent) => void;
}

export class ModernSlider {
	public options: ModernSliderOptions;
	public min: number;
	public max: number;
	public step: number;
	public isRange: boolean;
	public value: number;
	public values: number[];
	public element: HTMLElement;
	public fillElement: HTMLElement | null = null;
	public inputSingle?: HTMLInputElement;
	public inputMin?: HTMLInputElement;
	public inputMax?: HTMLInputElement;

	private slideCallback: ((event: Event | null, ui: ModernSliderEvent) => void) | null;
	private changeCallback: ((event: Event | null, ui: ModernSliderEvent) => void) | null;

	constructor(options: ModernSliderOptions = {}) {
		this.options = options;
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

	private _render(): HTMLElement {
		const root = document.createElement('div');
		root.className = 'potree-slider-wrapper' + (this.isRange ? ' potree-slider-range' : '');

		const track = document.createElement('div');
		track.className = 'potree-slider-track';

		const fill = document.createElement('div');
		fill.className = 'potree-slider-fill';
		track.appendChild(fill);
		this.fillElement = fill;

		if (this.isRange) {
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

			const handleInput = (e: Event, isMin: boolean) => {
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

			const handleChange = (e: Event) => {
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

	public updateTrackFill(): void {
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

	public setValue(val: number | string, trigger = false): void {
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

	public getValue(): number {
		return this.value;
	}

	public setValues(values: number[], trigger = false): void {
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

	public getValues(): number[] {
		return this.values ? [...this.values] : [this.value];
	}

	public setOption(key: string, val: any): void {
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

	public getOption(key: string): any {
		if (key === 'min') return this.min;
		if (key === 'max') return this.max;
		if (key === 'step') return this.step;
		if (key === 'value') return this.getValue();
		if (key === 'values') return this.getValues();
		return undefined;
	}

	public destroy(): void {
		if (this.element && this.element.parentNode) {
			this.element.parentNode.removeChild(this.element);
		}
	}
}
