import { EptBinaryLoader } from './BinaryLoader.js';
import { runtime } from '../../runtime/runtime.js';

export class EptZstandardLoader extends EptBinaryLoader {
	override extension(): string {
		return '.zst';
	}

	override workerPath(): string {
		return runtime.scriptPath + '/workers/EptZstandardDecoderWorker.js';
	}
}
