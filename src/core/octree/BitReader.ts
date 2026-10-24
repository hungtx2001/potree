/**
 * Reads unsigned integers encoded in a variable amount of bits from the buffer.
 * Bits are aligned into 32bit unsigned integers.
 */
export class BitReader {
	private buffer: Uint32Array;
	private bitOffset: number = 0;

	constructor(buf: ArrayBuffer) {
		this.buffer = new Uint32Array(buf);
		this.bitOffset = 0;
	}

	public read(bits: number): number {
		let result: number;

		if ((this.bitOffset % 32) + bits <= 32) {
			const val = this.buffer[Math.floor(this.bitOffset / 32)];
			const leftGap = this.bitOffset % 32;
			const rightGap = 32 - (leftGap + bits);

			result = (val << leftGap) >>> (leftGap + rightGap);
		} else {
			let val = this.buffer[Math.floor(this.bitOffset / 32)];
			const leftGap = this.bitOffset % 32;
			const rightGap = (leftGap + bits) - 32;

			result = (val << leftGap) >>> (leftGap - rightGap);

			val = this.buffer[Math.floor(this.bitOffset / 32) + 1];
			result = result | (val >>> (32 - rightGap));
		}

		this.bitOffset += bits;
		return result;
	}
}
