/**
 * Core EventDispatcher with typed events support
 */

export interface EventRecord {
	type: string;
	target?: any;
	[key: string]: any;
}

export type EventListener<T = EventRecord> = (event: T) => void;

export class EventDispatcher {
	public _listeners: Record<string, EventListener<any>[]>;

	constructor() {
		this._listeners = {};
	}

	public addEventListener<T = EventRecord>(type: string, listener: EventListener<T>): void {
		const listeners = this._listeners;

		if (listeners[type] === undefined) {
			listeners[type] = [];
		}

		if (listeners[type].indexOf(listener) === -1) {
			listeners[type].push(listener);
		}
	}

	public hasEventListener(type: string, listener: EventListener<any>): boolean {
		const listeners = this._listeners;
		return listeners[type] !== undefined && listeners[type].indexOf(listener) !== -1;
	}

	public removeEventListener(type: string, listener: EventListener<any>): void {
		const listeners = this._listeners;
		const listenerArray = listeners[type];

		if (listenerArray !== undefined) {
			const index = listenerArray.indexOf(listener);
			if (index !== -1) {
				listenerArray.splice(index, 1);
			}
		}
	}

	public removeEventListeners(type: string): void {
		if (this._listeners[type] !== undefined) {
			delete this._listeners[type];
		}
	}

	public dispatchEvent(event: EventRecord): void {
		const listeners = this._listeners;
		const listenerArray = listeners[event.type];

		if (listenerArray !== undefined) {
			event.target = this;

			const slice = listenerArray.slice(0);
			for (let i = 0; i < slice.length; i++) {
				slice[i].call(this, event);
			}
		}
	}
}
