import { runtime } from '../runtime/runtime.js';

export class Message {
	content: string | HTMLElement;
	element: HTMLDivElement;
	elContainer: HTMLSpanElement;
	elClose: HTMLImageElement;

	constructor(content: string | HTMLElement) {
		this.content = content;

		const res = runtime.resourcePath || './resources';

		this.element = document.createElement('div');
		this.element.className = 'potree_message';

		this.elContainer = document.createElement('span');
		this.elContainer.style.cssText = 'flex-grow: 1; padding: 5px;';
		this.element.appendChild(this.elContainer);

		this.elClose = document.createElement('img');
		this.elClose.src = `${res}/icons/close.svg`;
		this.elClose.className = 'button-icon';
		this.elClose.style.cssText = 'width: 16px; height: 16px; cursor: pointer;';
		this.element.appendChild(this.elClose);

		this.setMessage(content);
	}

	setMessage(content: string | HTMLElement): void {
		this.elContainer.replaceChildren();
		if (typeof content === 'string') {
			const span = document.createElement('span');
			span.textContent = content;
			this.elContainer.appendChild(span);
		} else if (content instanceof HTMLElement) {
			this.elContainer.appendChild(content);
		}
	}
}
