#if defined(GL_EXT_frag_depth)
#extension GL_EXT_frag_depth : enable
#define gl_FragDepthCompat gl_FragDepthEXT
#elif !defined(GL_ES) || __VERSION__ >= 300
#define gl_FragDepthCompat gl_FragDepth
#else
#extension GL_EXT_frag_depth : enable
#define gl_FragDepthCompat gl_FragDepthEXT
#endif

precision mediump float;
precision mediump int;

uniform sampler2D uWeightMap;
uniform sampler2D uDepthMap;

varying vec2 vUv;

void main() {
	float depth = texture2D(uDepthMap, vUv).r;

	if (depth >= 1.0) {
		discard;
	}

	vec4 color = texture2D(uWeightMap, vUv);
	color = color / color.w;

	gl_FragColor = vec4(color.xyz, 1.0);
	gl_FragDepthCompat = depth;
}
