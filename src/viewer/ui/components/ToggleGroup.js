/**
 * Modern Segmented Toggle Group Component
 * Pure vanilla JS, glassmorphism design, accessible, zero-dependency.
 */

export class ToggleGroup {
	/**
	 * @param {Object} options
	 * @param {HTMLElement|string} [options.container]
	 * @param {string} [options.name]
	 * @param {string} [options.title]
	 * @param {Array<{value: string, label: string, id?: string, icon?: string}>} [options.options]
	 * @param {string} [options.value]
	 * @param {Function} [options.onChange]
	 */
	constructor(options = {}) {
		this.options = options.options ? [...options.options] : [];
		this.value = options.value || (this.options[0] ? this.options[0].value : '');
		this.title = options.title || '';
		this.name = options.name || `potree_toggle_${Math.random().toString(36).substr(2, 9)}`;
		this.onChange = options.onChange || null;

		if (options.container) {
			const target = typeof options.container === 'string'
				? document.querySelector(options.container)
				: (options.container.jquery ? options.container[0] : options.container);

			if (target) {
				// If options were not provided, parse from <option> child elements
				if (this.options.length === 0) {
					target.querySelectorAll('option').forEach(opt => {
						this.options.push({
							id: opt.id,
							value: opt.value,
							label: opt.textContent.trim()
						});
					});
					if (!this.value && this.options[0]) {
						this.value = this.options[0].value;
					}
					if (!this.title && target.getAttribute('title')) {
						this.title = target.getAttribute('title');
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

	_render() {
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

	setValue(value, triggerChange = false) {
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

	getValue() {
		return this.value;
	}

	destroy() {
		if (this.element && this.element.parentNode) {
			this.element.parentNode.removeChild(this.element);
		}
	}
}
