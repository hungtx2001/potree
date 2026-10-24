export interface FeatureDetection {
	SHADER_INTERPOLATION: { isSupported: () => boolean };
	SHADER_SPLATS: { isSupported: () => boolean };
	SHADER_EDL: { isSupported: () => boolean };
	precision: string;
}

export const Features: FeatureDetection = (function (): FeatureDetection {
	if (typeof document === 'undefined') {
		return {
			SHADER_INTERPOLATION: { isSupported: () => false },
			SHADER_SPLATS: { isSupported: () => false },
			SHADER_EDL: { isSupported: () => false },
			precision: 'highp'
		};
	}

	const ftCanvas = document.createElement('canvas');
	const gl = (ftCanvas.getContext('webgl') || ftCanvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
	if (gl === null) {
		return {
			SHADER_INTERPOLATION: { isSupported: () => false },
			SHADER_SPLATS: { isSupported: () => false },
			SHADER_EDL: { isSupported: () => false },
			precision: 'mediump'
		};
	}

	const _vertexShaderPrecisionHighpFloat = gl.getShaderPrecisionFormat(gl.VERTEX_SHADER, gl.HIGH_FLOAT);
	const _fragmentShaderPrecisionHighpFloat = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
	const _vertexShaderPrecisionMediumpFloat = gl.getShaderPrecisionFormat(gl.VERTEX_SHADER, gl.MEDIUM_FLOAT);
	const _fragmentShaderPrecisionMediumpFloat = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.MEDIUM_FLOAT);

	const highpAvailable = !!(_vertexShaderPrecisionHighpFloat && _vertexShaderPrecisionHighpFloat.precision > 0 &&
		_fragmentShaderPrecisionHighpFloat && _fragmentShaderPrecisionHighpFloat.precision > 0);
	const mediumpAvailable = !!(_vertexShaderPrecisionMediumpFloat && _vertexShaderPrecisionMediumpFloat.precision > 0 &&
		_fragmentShaderPrecisionMediumpFloat && _fragmentShaderPrecisionMediumpFloat.precision > 0);

	let precision = 'lowp';
	if (highpAvailable) {
		precision = 'highp';
	} else if (mediumpAvailable) {
		precision = 'mediump';
	}

	return {
		SHADER_INTERPOLATION: {
			isSupported: function (): boolean {
				let supported = true;
				supported = supported && !!gl.getExtension('EXT_frag_depth');
				supported = supported && gl.getParameter(gl.MAX_VARYING_VECTORS) >= 8;
				return supported;
			}
		},
		SHADER_SPLATS: {
			isSupported: function (): boolean {
				let supported = true;
				supported = supported && !!gl.getExtension('EXT_frag_depth');
				supported = supported && !!gl.getExtension('OES_texture_float');
				supported = supported && gl.getParameter(gl.MAX_VARYING_VECTORS) >= 8;
				return supported;
			}
		},
		SHADER_EDL: {
			isSupported: function (): boolean {
				let supported = true;
				supported = supported && !!gl.getExtension('EXT_frag_depth');
				supported = supported && !!gl.getExtension('OES_texture_float');
				supported = supported && gl.getParameter(gl.MAX_VARYING_VECTORS) >= 8;
				return supported;
			}
		},
		precision: precision
	};
})();
