import * as THREE from 'three';

export interface GradientStop {
	pos: number;
	color: THREE.Color;
}

export type Gradient = [number, THREE.Color][];

export const Gradients: Record<string, Gradient> = {
	RAINBOW: [
		[0.0, new THREE.Color(0x278DD3)],
		[0.2, new THREE.Color(0x319E53)],
		[0.4, new THREE.Color(0x65BA45)],
		[0.6, new THREE.Color(0xFBB82F)],
		[0.8, new THREE.Color(0xF58322)],
		[1.0, new THREE.Color(0xEF4E28)],
	],
	VIRIDIS: [
		[0.0, new THREE.Color(0x440154)],
		[0.25, new THREE.Color(0x3b528b)],
		[0.5, new THREE.Color(0x21918c)],
		[0.75, new THREE.Color(0x5ec962)],
		[1.0, new THREE.Color(0xfde725)],
	],
	PLASMA: [
		[0.0, new THREE.Color(0x0d0887)],
		[0.25, new THREE.Color(0x6a00a8)],
		[0.5, new THREE.Color(0xb12a90)],
		[0.75, new THREE.Color(0xe16462)],
		[1.0, new THREE.Color(0xf0f921)],
	],
	TURBO: [
		[0.0, new THREE.Color(0x30123b)],
		[0.25, new THREE.Color(0x28bbec)],
		[0.5, new THREE.Color(0xa2fc3c)],
		[0.75, new THREE.Color(0xfb8022)],
		[1.0, new THREE.Color(0x7a0403)],
	],
	GRAYSCALE: [
		[0.0, new THREE.Color(0x000000)],
		[1.0, new THREE.Color(0xffffff)],
	],
	SPECTRAL: [
		[0.0, new THREE.Color(0x9e0142)],
		[0.2, new THREE.Color(0xd53e4f)],
		[0.4, new THREE.Color(0xfee08b)],
		[0.6, new THREE.Color(0xe6f598)],
		[0.8, new THREE.Color(0x66c2a5)],
		[1.0, new THREE.Color(0x5e4fa2)],
	],
};

/**
 * Generates a 1D gradient canvas/texture for GPU shader sampling
 */
export function generateGradientTexture(gradient: Gradient, size = 256): THREE.CanvasTexture {
	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = 1;
	const ctx = canvas.getContext('2d');
	if (!ctx) {
		throw new Error('Canvas 2D context not available');
	}

	const grad = ctx.createLinearGradient(0, 0, size, 0);
	for (const [stop, color] of gradient) {
		grad.addColorStop(stop, color.getStyle());
	}

	ctx.fillStyle = grad;
	ctx.fillRect(0, 0, size, 1);

	const texture = new THREE.CanvasTexture(canvas);
	texture.minFilter = THREE.LinearFilter;
	texture.magFilter = THREE.LinearFilter;
	texture.wrapS = THREE.ClampToEdgeWrapping;
	texture.wrapT = THREE.ClampToEdgeWrapping;
	texture.generateMipmaps = false;

	return texture;
}
