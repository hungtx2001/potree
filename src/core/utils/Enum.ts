export class EnumItem {
	[key: string]: any;

	constructor(object: Record<string, any>) {
		for (const key of Object.keys(object)) {
			this[key] = object[key];
		}
	}

	inspect(): string {
		return `Enum(${this.name}: ${this.value})`;
	}
}

export class Enum {
	public object: Record<string, any>;
	[key: string]: any;

	constructor(object: Record<string, any>) {
		this.object = object;

		for (const key of Object.keys(object)) {
			let value = object[key];

			if (typeof value === 'object' && value !== null) {
				value.name = key;
			} else {
				value = { name: key, value: value };
			}

			this[key] = new EnumItem(value);
		}
	}

	fromValue(value: any): EnumItem {
		for (const key of Object.keys(this.object)) {
			if (this[key].value === value) {
				return this[key];
			}
		}

		throw new Error(`No enum for value: ${value}`);
	}
}
