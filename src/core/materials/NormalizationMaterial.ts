import * as THREE from 'three';
import normalizeVert from './shaders/normalize.vert?raw';
import normalizeFrag from './shaders/normalize.frag?raw';

export interface NormalizationUniforms {
	uDepthMap: { value: THREE.Texture | null };
	uWeightMap: { value: THREE.Texture | null };
	[uniform: string]: THREE.IUniform;
}

export class NormalizationMaterial extends THREE.RawShaderMaterial {
	public declare uniforms: NormalizationUniforms;

	constructor(parameters: Partial<THREE.ShaderMaterialParameters> = {}) {
		const uniforms: NormalizationUniforms = {
			uDepthMap: { value: null },
			uWeightMap: { value: null },
		};

		super({
			uniforms,
			vertexShader: normalizeVert,
			fragmentShader: normalizeFrag,
			extensions: {
				fragDepth: true,
			},
			...parameters,
		});
	}
}
