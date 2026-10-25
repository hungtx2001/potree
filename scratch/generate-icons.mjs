import fs from 'fs';
import path from 'path';

const icons = {
	iconAngle: 'angle.png',
	iconPoint: 'point.svg',
	iconDistance: 'distance.svg',
	iconHeight: 'height.svg',
	iconCircle: 'circle.svg',
	iconArea: 'area.svg',
	iconVolume: 'volume.svg',
	iconProfile: 'profile.svg',
	iconResetTools: 'reset_tools.svg',
	iconClipVolume: 'clip_volume.svg',
	iconClipPolygon: 'clip-polygon.svg',
	iconClipScreen: 'clip-screen.svg',
	iconRemove: 'remove.svg',
	iconEarth: 'earth_controls_1.png',
	iconFps: 'fps_controls.svg',
	iconHelicopter: 'helicopter_controls.svg',
	iconOrbit: 'orbit_controls.svg',
	iconFocus: 'focus.svg',
	iconNavCube: 'navigation_cube.svg',
	iconLeft: 'left.svg',
	iconRight: 'right.svg',
	iconFront: 'front.svg',
	iconBack: 'back.svg',
	iconTop: 'top.svg',
	iconBottom: 'bottom.svg',
};

let out = `/**
 * Embedded Potree Tool Icons (base64 data URIs)
 * Provides zero-dependency, bulletproof icon loading without needing external URL resolution.
 */

`;

for (const [k, file] of Object.entries(icons)) {
	const buf = fs.readFileSync(path.join('resources/icons', file));
	const mime = file.endsWith('.png') ? 'image/png' : 'image/svg+xml';
	const b64 = buf.toString('base64');
	out += `export const ${k} = 'data:${mime};base64,${b64}';\n`;
}

fs.writeFileSync('src/react/toolIcons.ts', out);
console.log('Successfully generated src/react/toolIcons.ts');
