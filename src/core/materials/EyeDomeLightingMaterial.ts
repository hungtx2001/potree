import * as THREE from 'three';
import edlVert from './shaders/edl.vert?raw';
import edlFrag from './shaders/edl.frag?raw';

export interface EDLUniforms {
	screenWidth: { value: number };
	screenHeight: { value: number };
	edlStrength: { value: number };
	uNear: { value: number };
	uFar: { value: number };
	radius: { value: number };
	neighbours: { value: Float32Array };
	depthMap: { value: THREE.Texture | null };
	uEDLColor: { value: THREE.Texture | null };
	uEDLDepth: { value: THREE.Texture | null };
	opacity: { value: number };
	uProj: { value: Float32Array | number[] };
	[uniform: string]: THREE.IUniform;
}

/**
 * EyeDomeLightingMaterial - High quality depth-based shading for 3D point clouds.
 * Shaders are decoupled into dedicated GLSL files (edl.vert, edl.frag).
 */
export class EyeDomeLightingMaterial extends THREE.RawShaderMaterial {
	private _neighbourCount: number = 8;
	public neighbours: Float32Array = new Float32Array(16);
	public declare uniforms: EDLUniforms;

	constructor(parameters: Partial<THREE.ShaderMaterialParameters> = {}) {
		const uniforms: EDLUniforms = {
			screenWidth: { value: 0 },
			screenHeight: { value: 0 },
			edlStrength: { value: 1.0 },
			uNear: { value: 1.0 },
			uFar: { value: 1.0 },
			radius: { value: 1.4 },
			neighbours: { value: new Float32Array(16) },
			depthMap: { value: null },
			uEDLColor: { value: null },
			uEDLDepth: { value: null },
			opacity: { value: 1.0 },
			uProj: { value: new Float32Array(16) },
		};

		super({
			uniforms,
			vertexShader: edlVert,
			fragmentShader: edlFrag,
			depthTest: true,
			depthWrite: true,
			transparent: true,
			extensions: {
				fragDepth: true,
			},
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

	public getDefines(): string {
		return `#define NEIGHBOUR_COUNT ${this._neighbourCount}\n`;
	}

	public updateShaderSource(): void {
		this.defines = {
			NEIGHBOUR_COUNT: this._neighbourCount,
		};
		this.uniforms.neighbours.value = this.neighbours;
		this.needsUpdate = true;
	}

	public setDimensions(width: number, height: number): void {
		if (this.uniforms.screenWidth && this.uniforms.screenHeight) {
			this.uniforms.screenWidth.value = width;
			this.uniforms.screenHeight.value = height;
		}
	}
}
