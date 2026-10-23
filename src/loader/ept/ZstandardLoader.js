import {EptBinaryLoader} from "./BinaryLoader.js";
import {runtime} from "../../runtime.js";

export class EptZstandardLoader extends EptBinaryLoader {
    extension() {
        return '.zst';
    }

    workerPath() {
        return runtime.scriptPath + '/workers/EptZstandardDecoderWorker.js';
    }
};

