import { EventDispatcher } from '../EventDispatcher.js';

export interface ActionArgs {
	icon?: string;
	tooltip?: string;
	onclick?: (event: any) => void;
}

export class Action extends EventDispatcher {
	public icon: string;
	public tooltip?: string;
	public onclick?: (event: any) => void;

	constructor(args: ActionArgs = {}) {
		super();

		this.icon = args.icon || '';
		this.tooltip = args.tooltip;

		if (args.onclick !== undefined) {
			this.onclick = args.onclick;
		}
	}

	pairWith(_object: any): void {}

	setIcon(newIcon: string): void {
		const oldIcon = this.icon;

		if (newIcon === oldIcon) {
			return;
		}

		this.icon = newIcon;

		this.dispatchEvent({
			type: 'icon_changed',
			action: this,
			icon: newIcon,
			oldIcon: oldIcon
		});
	}
}
