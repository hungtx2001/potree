export class InterleavedBufferAttribute {
	public name: string;
	public bytes: number;
	public numElements: number;
	public normalized: boolean;
	public type: string;

	constructor(name: string, bytes: number, numElements: number, type: string, normalized: boolean) {
		this.name = name;
		this.bytes = bytes;
		this.numElements = numElements;
		this.normalized = normalized;
		this.type = type; // gl type without prefix, e.g. "FLOAT", "UNSIGNED_INT"
	}
}

export class InterleavedBuffer {
	public data: ArrayBuffer;
	public attributes: InterleavedBufferAttribute[];
	public stride: number;
	public numElements: number;

	constructor(data: ArrayBuffer, attributes: InterleavedBufferAttribute[], numElements: number) {
		this.data = data;
		this.attributes = attributes;
		this.stride = attributes.reduce((a, att) => a + att.bytes, 0);
		this.stride = Math.ceil(this.stride / 4) * 4;
		this.numElements = numElements;
	}

	public offset(name: string): number | null {
		let offset = 0;

		for (const att of this.attributes) {
			if (att.name === name) {
				return offset;
			}
			offset += att.bytes;
		}

		return null;
	}
}
