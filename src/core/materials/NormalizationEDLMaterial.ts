import * as THREE from 'three';
import normalizeVert from './shaders/normalize.vert?raw';
import normalizeAndEdlFrag from './shaders/normalize_and_edl.frag?raw';

export interface NormalizationEDLUniforms {
	screenWidth: { value: number };
	screenHeight: { value: number };
	edlStrength: { value: number };
	radius: { value: number };
	neighbours: { value: Float32Array };
	uEDLMap: { value: THREE.Texture | null };
	uDepthMap: { value: THREE.Texture | null };
	uWeightMap: { value: THREE.Texture | null };
	[uniform: string]: THREE.IUniform;
}

export class NormalizationEDLMaterial extends THREE.RawShaderMaterial {
	private _neighbourCount: number = 8;
	public neighbours: Float32Array = new Float32Array(16);
	public declare uniforms: NormalizationEDLUniforms;

	constructor(parameters: Partial<THREE.ShaderMaterialParameters> = {}) {
		const uniforms: NormalizationEDLUniforms = {
			screenWidth: { value: 0 },
			screenHeight: { value: 0 },
			edlStrength: { value: 1.0 },
			radius: { value: 1.0 },
			neighbours: { value: new Float32Array(16) },
			uEDLMap: { value: null },
			uDepthMap: { value: null },
			uWeightMap: { value: null },
		};

		super({
			uniforms,
			vertexShader: normalizeVert,
			fragmentShader: normalizeAndEdlFrag,
			...parameters,
		});

		this.neighbourCount = 8;
	}

	public get neighbourCount(): number {
		return this._neighbourCount;
	}

	public set neighbourCount(value: number) {
		if (this._neighbourCount !== value) {
			this._neighbourCount = value;
			this.neighbours = new Float32Array(this._neighbourCount * 2);
			for (let c = 0; c < this._neighbourCount; c++) {
				this.neighbours[2 * c + 0] = Math.cos((2 * c * Math.PI) / this._neighbourCount);
				this.neighbours[2 * c + 1] = Math.sin((2 * c * Math.PI) / this._neighbourCount);
			}

			this.updateShaderSource();
		}
	}

	public updateShaderSource(): void {
		this.defines = {
			NEIGHBOUR_COUNT: this._neighbourCount,
		};
		this.uniforms.neighbours.value = this.neighbours;
		this.needsUpdate = true;
	}
}
