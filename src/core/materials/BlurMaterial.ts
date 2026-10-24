import * as THREE from 'three';
import blurVert from './shaders/blur.vert?raw';
import blurFrag from './shaders/blur.frag?raw';

export interface BlurUniforms {
	near: { value: number };
	far: { value: number };
	screenWidth: { value: number };
	screenHeight: { value: number };
	map: { value: THREE.Texture | null };
	[uniform: string]: THREE.IUniform;
}

export class BlurMaterial extends THREE.ShaderMaterial {
	public declare uniforms: BlurUniforms;

	constructor(parameters: Partial<THREE.ShaderMaterialParameters> = {}) {
		const uniforms: BlurUniforms = {
			near: { value: 0 },
			far: { value: 0 },
			screenWidth: { value: 0 },
			screenHeight: { value: 0 },
			map: { value: null },
		};

		super({
			uniforms,
			vertexShader: blurVert,
			fragmentShader: blurFrag,
			...parameters,
		});
	}
}
