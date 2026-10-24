
import { runtime } from "../runtime.js";

export class Message{

	constructor(content){
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

	setMessage(content){
		this.elContainer.replaceChildren();
		if(typeof content === "string"){
			const span = document.createElement('span');
			span.textContent = content;
			this.elContainer.appendChild(span);
		}else if(content instanceof HTMLElement){
			this.elContainer.appendChild(content);
		}
	}

}