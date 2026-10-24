/**
 * Modern Segmented Toggle Group Component (TypeScript)
 * Pure vanilla TS, glassmorphism design, accessible, zero-dependency.
 */

export interface ToggleOption {
	value: string;
	label: string;
	id?: string;
	icon?: string;
}

export interface ToggleGroupOptions {
	container?: HTMLElement | string | { jquery: any; [key: number]: HTMLElement };
	name?: string;
	title?: string;
	options?: ToggleOption[];
	value?: string;
	onChange?: (value: string) => void;
}

interface ToggleItemRef {
	element: HTMLButtonElement;
	input: HTMLInputElement;
	value: string;
}

export class ToggleGroup {
	public options: ToggleOption[];
	public value: string;
	public title: string;
	public name: string;
	public onChange: ((value: string) => void) | null;
	public element!: HTMLElement;
	public items: ToggleItemRef[] = [];

	constructor(options: ToggleGroupOptions = {}) {
		this.options = options.options ? [...options.options] : [];
		this.value = options.value || (this.options[0] ? this.options[0].value : '');
		this.title = options.title || '';
		this.name = options.name || `potree_toggle_${Math.random().toString(36).substring(2, 9)}`;
		this.onChange = options.onChange || null;

		if (options.container) {
			const anyContainer = options.container as any;
			const target: HTMLElement | null = typeof options.container === 'string'
				? document.querySelector(options.container)
				: (anyContainer.jquery ? anyContainer[0] : (anyContainer as HTMLElement));

			if (target) {
				// If options were not provided, parse from <option> child elements
				if (this.options.length === 0) {
					target.querySelectorAll('option').forEach((opt) => {
						this.options.push({
							id: opt.id,
							value: opt.value,
							label: opt.textContent ? opt.textContent.trim() : opt.value,
						});
					});
					if (!this.value && this.options[0]) {
						this.value = this.options[0].value;
					}
					if (!this.title && target.getAttribute('title')) {
						this.title = target.getAttribute('title') || '';
					}
				}

				this.element = this._render();
				target.innerHTML = '';
				target.appendChild(this.element);
			} else {
				this.element = this._render();
			}
		} else {
			this.element = this._render();
		}
	}

	private _render(): HTMLElement {
		const root = document.createElement('div');
		root.className = 'potree-toggle-group';

		if (this.title) {
			const legend = document.createElement('div');
			legend.className = 'potree-toggle-group-title';
			legend.textContent = this.title;
			root.appendChild(legend);
		}

		const track = document.createElement('div');
		track.className = 'potree-toggle-track';
		track.setAttribute('role', 'radiogroup');

		this.items = [];

		this.options.forEach((opt) => {
			const item = document.createElement('button');
			item.type = 'button';
			item.className = 'potree-toggle-item' + (opt.value === this.value ? ' active' : '');
			item.dataset.value = opt.value;
			item.setAttribute('role', 'radio');
			item.setAttribute('aria-checked', opt.value === this.value ? 'true' : 'false');

			const hiddenInput = document.createElement('input');
			hiddenInput.type = 'radio';
			hiddenInput.name = this.name;
			hiddenInput.value = opt.value;
			if (opt.id) hiddenInput.id = opt.id;
			hiddenInput.checked = (opt.value === this.value);
			hiddenInput.style.display = 'none';

			if (opt.icon) {
				const iconSpan = document.createElement('span');
				iconSpan.className = 'potree-toggle-icon';
				iconSpan.innerHTML = opt.icon;
				item.appendChild(iconSpan);
			}

			const labelSpan = document.createElement('span');
			labelSpan.className = 'potree-toggle-label';
			labelSpan.textContent = opt.label;
			item.appendChild(labelSpan);
			item.appendChild(hiddenInput);

			item.addEventListener('click', (e) => {
				e.preventDefault();
				this.setValue(opt.value, true);
			});

			this.items.push({ element: item, input: hiddenInput, value: opt.value });
			track.appendChild(item);
		});

		root.appendChild(track);
		return root;
	}

	public setValue(value: string, triggerChange = false): void {
		this.value = value;
		this.items.forEach((item) => {
			const isMatch = String(item.value) === String(value);
			if (isMatch) {
				item.element.classList.add('active');
				item.element.setAttribute('aria-checked', 'true');
				item.input.checked = true;
			} else {
				item.element.classList.remove('active');
				item.element.setAttribute('aria-checked', 'false');
				item.input.checked = false;
			}
		});

		if (triggerChange) {
			if (typeof this.onChange === 'function') {
				this.onChange(value);
			}
			const event = new CustomEvent('change', { detail: { value }, bubbles: true });
			this.element.dispatchEvent(event);
		}
	}

	public getValue(): string {
		return this.value;
	}

	public destroy(): void {
		if (this.element && this.element.parentNode) {
			this.element.parentNode.removeChild(this.element);
		}
	}
}
