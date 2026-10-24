import * as THREE from 'three';
import pointcloudVert from './shaders/pointcloud.vert?raw';
import pointcloudFrag from './shaders/pointcloud.frag?raw';
import { Gradients } from './Gradients.js';
import { ClassificationScheme } from './ClassificationScheme.js';
import { PointSizeType, PointShape, TreeType, ElevationGradientRepeat } from '../types.js';
import { Utils } from '../../utils.js';
import { runtime } from '../../runtime.js';

export interface PointCloudMaterialParameters {
	size?: number;
	minSize?: number;
	maxSize?: number;
	treeType?: TreeType;
	[key: string]: any;
}

export class PointCloudMaterial extends THREE.RawShaderMaterial {
	public visibleNodesTexture: THREE.DataTexture;
	private _pointSizeType: PointSizeType = PointSizeType.FIXED;
	private _shape: PointShape = PointShape.SQUARE;
	private _useClipBox: boolean = false;
	public clipBoxes: any[] = [];
	public clipPolygons: any[] = [];
	private _weighted: boolean = false;
	private _gradient: any = Gradients.SPECTRAL;
	public gradientTexture: THREE.Texture;
	private _matcap: string = 'matcap.jpg';
	public matcapTexture: THREE.Texture;
	public lights: boolean = false;
	public fog: boolean = false;
	private _treeType: TreeType = TreeType.OCTREE;
	private _useEDL: boolean = false;
	public defines: Map<string, string> = new Map();
	public ranges: Map<string, [number, number]> = new Map();
	private _activeAttributeName: string | null = null;
	private _defaultIntensityRangeChanged: boolean = false;
	private _defaultElevationRangeChanged: boolean = false;
	public classificationTexture: THREE.DataTexture;
	public classification: any;
	private _hiddenListeners?: Record<string, any>;

	constructor(parameters: PointCloudMaterialParameters = {}) {
		super();

		this.visibleNodesTexture = Utils.generateDataTexture(2048, 1, new THREE.Color(0xffffff));
		this.visibleNodesTexture.minFilter = THREE.NearestFilter;
		this.visibleNodesTexture.magFilter = THREE.NearestFilter;

		const pointSize = parameters.size !== undefined ? parameters.size : 1.0;
		const minSize = parameters.minSize !== undefined ? parameters.minSize : 2.0;
		const maxSize = parameters.maxSize !== undefined ? parameters.maxSize : 50.0;
		const treeType = parameters.treeType !== undefined ? parameters.treeType : TreeType.OCTREE;

		this._pointSizeType = PointSizeType.FIXED;
		this._shape = PointShape.SQUARE;
		this._useClipBox = false;
		this.clipBoxes = [];
		this.clipPolygons = [];
		this._weighted = false;
		this._gradient = Gradients.SPECTRAL;
		this.gradientTexture = PointCloudMaterial.generateGradientTexture(this._gradient);
		this._matcap = 'matcap.jpg';
		this.matcapTexture = PointCloudMaterial.generateMatcapTexture(this._matcap);
		this.lights = false;
		this.fog = false;
		this._treeType = treeType;
		this._useEDL = false;
		this.defines = new Map();
		this.ranges = new Map();
		this._activeAttributeName = null;
		this._defaultIntensityRangeChanged = false;
		this._defaultElevationRangeChanged = false;

		{
			const [width, height] = [256, 1];
			const data = new Uint8Array(width * 4);
			const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
			texture.magFilter = THREE.NearestFilter;
			texture.needsUpdate = true;
			this.classificationTexture = texture;
		}

		this.uniforms = {
			level: { value: 0.0 },
			vnStart: { value: 0.0 },
			spacing: { value: 1.0 },
			blendHardness: { value: 2.0 },
			blendDepthSupplement: { value: 0.0 },
			fov: { value: 1.0 },
			screenWidth: { value: 1.0 },
			screenHeight: { value: 1.0 },
			near: { value: 0.1 },
			far: { value: 1.0 },
			uColor: { value: new THREE.Color(0xffffff) },
			uOpacity: { value: 1.0 },
			size: { value: pointSize },
			minSize: { value: minSize },
			maxSize: { value: maxSize },
			octreeSize: { value: 0 },
			bbSize: { value: [0, 0, 0] },
			elevationRange: { value: [0, 0] },
			clipBoxCount: { value: 0 },
			clipPolygonCount: { value: 0 },
			clipBoxes: { value: [] },
			clipPolygons: { value: [] },
			clipPolygonVCount: { value: [] },
			clipPolygonVP: { value: [] },
			visibleNodes: { value: this.visibleNodesTexture },
			pcIndex: { value: 0 },
			gradient: { value: this.gradientTexture },
			classificationLUT: { value: this.classificationTexture },
			uHQDepthMap: { value: null },
			toModel: { value: [] },
			diffuse: { value: [1, 1, 1] },
			transition: { value: 0.5 },
			intensityRange: { value: [Infinity, -Infinity] },
			intensity_gbc: { value: [1, 0, 0] },
			uRGB_gbc: { value: [1, 0, 0] },
			wRGB: { value: 1 },
			wIntensity: { value: 0 },
			wElevation: { value: 0 },
			wClassification: { value: 0 },
			wReturnNumber: { value: 0 },
			wSourceID: { value: 0 },
			useOrthographicCamera: { value: false },
			elevationGradientRepat: { value: ElevationGradientRepeat.CLAMP },
			clipTask: { value: 1 },
			clipMethod: { value: 1 },
			uShadowColor: { value: [0, 0, 0] },
			uExtraScale: { value: 1 },
			uExtraOffset: { value: 0 },
			uExtraRange: { value: [0, 1] },
			uExtraGammaBrightContr: { value: [1, 0, 0] },
			uFilterReturnNumberRange: { value: [0, 7] },
			uFilterNumberOfReturnsRange: { value: [0, 7] },
			uFilterGPSTimeClipRange: { value: [0, 7] },
			uFilterPointSourceIDClipRange: { value: [0, 65535] },
			matcapTextureUniform: { value: this.matcapTexture },
			backfaceCulling: { value: false },
		};

		this.classification = (ClassificationScheme as any).DEFAULT || {};

		this.defaultAttributeValues = {
			normal: [0, 0, 0],
			classification: [0, 0, 0],
			indices: [0, 0, 0, 0],
		};

		this.vertexShader = pointcloudVert;
		this.fragmentShader = pointcloudFrag;
		this.vertexColors = true;

		Object.defineProperty(this, 'opacity', {
			get: () => this.uniforms?.uOpacity?.value ?? 1.0,
			set: (value: number) => {
				if (this.uniforms && this.uniforms.uOpacity) {
					if (this.uniforms.uOpacity.value !== value) {
						this.uniforms.uOpacity.value = value;
						this.updateShaderSource();
						this.dispatchEvent({ type: 'opacity_changed', target: this });
						this.dispatchEvent({ type: 'material_property_changed', target: this });
					}
				}
			},
			configurable: true,
			enumerable: true,
		});

		this.updateShaderSource();
	}

	setDefine(key: string, value: any): void {
		if (value !== undefined && value !== null) {
			if (this.defines.get(key) !== value) {
				this.defines.set(key, value);
				this.updateShaderSource();
			}
		} else {
			this.removeDefine(key);
		}
	}

	removeDefine(key: string): void {
		if (this.defines.has(key)) {
			this.defines.delete(key);
			this.updateShaderSource();
		}
	}

	updateShaderSource(): void {
		let vs = pointcloudVert;
		let fs = pointcloudFrag;
		const definesString = this.getDefines();

		const vsVersionIndex = vs.indexOf('#version ');
		const fsVersionIndex = fs.indexOf('#version ');

		if (vsVersionIndex >= 0) {
			vs = vs.replace(/(#version .*)/, `$1\n${definesString}`);
		} else {
			vs = `${definesString}\n${vs}`;
		}

		if (fsVersionIndex >= 0) {
			fs = fs.replace(/(#version .*)/, `$1\n${definesString}`);
		} else {
			fs = `${definesString}\n${fs}`;
		}

		this.vertexShader = vs;
		this.fragmentShader = fs;

		if (this.opacity === 1.0) {
			this.blending = THREE.NoBlending;
			this.transparent = false;
			this.depthTest = true;
			this.depthWrite = true;
			this.depthFunc = THREE.LessEqualDepth;
		} else if (this.opacity < 1.0 && !this.useEDL) {
			this.blending = THREE.AdditiveBlending;
			this.transparent = true;
			this.depthTest = false;
			this.depthWrite = true;
			this.depthFunc = THREE.AlwaysDepth;
		}

		if (this.weighted) {
			this.blending = THREE.AdditiveBlending;
			this.transparent = true;
			this.depthTest = true;
			this.depthWrite = false;
		}

		this.needsUpdate = true;
	}

	getDefines(): string {
		const defines: string[] = [];

		if (this.pointSizeType === PointSizeType.FIXED) {
			defines.push('#define fixed_point_size');
		} else if (this.pointSizeType === PointSizeType.ATTENUATED) {
			defines.push('#define attenuated_point_size');
		} else if (this.pointSizeType === PointSizeType.ADAPTIVE) {
			defines.push('#define adaptive_point_size');
		}

		if (this.shape === PointShape.SQUARE) {
			defines.push('#define square_point_shape');
		} else if (this.shape === PointShape.CIRCLE) {
			defines.push('#define circle_point_shape');
		} else if (this.shape === PointShape.PARABOLOID) {
			defines.push('#define paraboloid_point_shape');
		}

		if (this._useEDL) {
			defines.push('#define use_edl');
		}

		if (this.activeAttributeName) {
			const attributeName = this.activeAttributeName.replace(/[^a-zA-Z0-9]/g, '_');
			defines.push(`#define color_type_${attributeName}`);
		}

		if (this._treeType === TreeType.OCTREE) {
			defines.push('#define tree_type_octree');
		} else if (this._treeType === TreeType.KDTREE) {
			defines.push('#define tree_type_kdtree');
		}

		if (this.weighted) {
			defines.push('#define weighted_splats');
		}

		for (const [, value] of this.defines) {
			defines.push(value);
		}

		return defines.join('\n');
	}

	setClipBoxes(clipBoxes: any[]): void {
		if (!clipBoxes) return;

		const doUpdate = (this.clipBoxes.length !== clipBoxes.length) && (clipBoxes.length === 0 || this.clipBoxes.length === 0);
		this.uniforms.clipBoxCount.value = clipBoxes.length;
		this.clipBoxes = clipBoxes;

		if (doUpdate) {
			this.updateShaderSource();
		}

		this.uniforms.clipBoxes.value = new Float32Array(this.clipBoxes.length * 16);
		for (let i = 0; i < this.clipBoxes.length; i++) {
			const box = clipBoxes[i];
			this.uniforms.clipBoxes.value.set(box.inverse.elements, 16 * i);
		}

		for (let i = 0; i < this.uniforms.clipBoxes.value.length; i++) {
			if (Number.isNaN(this.uniforms.clipBoxes.value[i])) {
				this.uniforms.clipBoxes.value[i] = Infinity;
			}
		}
	}

	setClipPolygons(clipPolygons: any[]): void {
		if (!clipPolygons) return;

		const doUpdate = (this.clipPolygons.length !== clipPolygons.length);
		this.clipPolygons = clipPolygons;

		if (doUpdate) {
			this.updateShaderSource();
		}
	}

	get gradient(): any {
		return this._gradient;
	}

	set gradient(value: any) {
		if (this._gradient !== value) {
			this._gradient = value;
			this.gradientTexture = PointCloudMaterial.generateGradientTexture(this._gradient);
			this.uniforms.gradient.value = this.gradientTexture;
		}
	}

	get matcap(): string {
		return this._matcap;
	}

	set matcap(value: string) {
		if (this._matcap !== value) {
			this._matcap = value;
			this.matcapTexture = PointCloudMaterial.generateMatcapTexture(this._matcap);
			this.uniforms.matcapTextureUniform.value = this.matcapTexture;
		}
	}

	get useOrthographicCamera(): boolean {
		return this.uniforms.useOrthographicCamera.value;
	}

	set useOrthographicCamera(value: boolean) {
		if (this.uniforms.useOrthographicCamera.value !== value) {
			this.uniforms.useOrthographicCamera.value = value;
		}
	}

	get backfaceCulling(): boolean {
		return this.uniforms.backfaceCulling.value;
	}

	set backfaceCulling(value: boolean) {
		if (this.uniforms.backfaceCulling.value !== value) {
			this.uniforms.backfaceCulling.value = value;
			this.dispatchEvent({ type: 'backface_changed', target: this });
		}
	}

	recomputeClassification(): void {
		const classification = this.classification;
		const data = this.classificationTexture.image.data;
		const width = 256;
		const black = [1, 1, 1, 1];
		let valuesChanged = false;

		for (let i = 0; i < width; i++) {
			let color: number[];
			let visible = true;

			if (classification[i]) {
				color = classification[i].color;
				visible = classification[i].visible;
			} else if (classification[i % 32]) {
				color = classification[i % 32].color;
				visible = classification[i % 32].visible;
			} else if (classification.DEFAULT) {
				color = classification.DEFAULT.color;
				visible = classification.DEFAULT.visible;
			} else {
				color = black;
			}

			const r = Math.round(255 * color[0]);
			const g = Math.round(255 * color[1]);
			const b = Math.round(255 * color[2]);
			const a = visible ? Math.round(255 * color[3]) : 0;

			if (data[4 * i + 0] !== r) { data[4 * i + 0] = r; valuesChanged = true; }
			if (data[4 * i + 1] !== g) { data[4 * i + 1] = g; valuesChanged = true; }
			if (data[4 * i + 2] !== b) { data[4 * i + 2] = b; valuesChanged = true; }
			if (data[4 * i + 3] !== a) { data[4 * i + 3] = a; valuesChanged = true; }
		}

		if (valuesChanged) {
			this.classificationTexture.needsUpdate = true;
			this.dispatchEvent({ type: 'material_property_changed', target: this });
		}
	}

	get spacing(): number {
		return this.uniforms.spacing.value;
	}

	set spacing(value: number) {
		if (this.uniforms.spacing.value !== value) {
			this.uniforms.spacing.value = value;
		}
	}

	get useClipBox(): boolean {
		return this._useClipBox;
	}

	set useClipBox(value: boolean) {
		if (this._useClipBox !== value) {
			this._useClipBox = value;
			this.updateShaderSource();
		}
	}

	get clipTask(): number {
		return this.uniforms.clipTask.value;
	}

	set clipTask(mode: number) {
		this.uniforms.clipTask.value = mode;
	}

	get clipMethod(): number {
		return this.uniforms.clipMethod.value;
	}

	set clipMethod(mode: number) {
		this.uniforms.clipMethod.value = mode;
	}

	get weighted(): boolean {
		return this._weighted;
	}

	set weighted(value: boolean) {
		if (this._weighted !== value) {
			this._weighted = value;
			this.updateShaderSource();
		}
	}

	get fov(): number {
		return this.uniforms.fov.value;
	}

	set fov(value: number) {
		if (this.uniforms.fov.value !== value) {
			this.uniforms.fov.value = value;
		}
	}

	get screenWidth(): number {
		return this.uniforms.screenWidth.value;
	}

	set screenWidth(value: number) {
		if (this.uniforms.screenWidth.value !== value) {
			this.uniforms.screenWidth.value = value;
		}
	}

	get screenHeight(): number {
		return this.uniforms.screenHeight.value;
	}

	set screenHeight(value: number) {
		if (this.uniforms.screenHeight.value !== value) {
			this.uniforms.screenHeight.value = value;
		}
	}

	get near(): number {
		return this.uniforms.near.value;
	}

	set near(value: number) {
		if (this.uniforms.near.value !== value) {
			this.uniforms.near.value = value;
		}
	}

	get far(): number {
		return this.uniforms.far.value;
	}

	set far(value: number) {
		if (this.uniforms.far.value !== value) {
			this.uniforms.far.value = value;
		}
	}
	get activeAttributeName(): string | null {
		return this._activeAttributeName;
	}

	set activeAttributeName(value: string | null) {
		if (this._activeAttributeName !== value) {
			this._activeAttributeName = value;
			this.updateShaderSource();
			this.dispatchEvent({ type: 'active_attribute_changed', target: this });
			this.dispatchEvent({ type: 'material_property_changed', target: this });
		}
	}

	get pointSizeType(): PointSizeType {
		return this._pointSizeType;
	}

	set pointSizeType(value: PointSizeType) {
		if (this._pointSizeType !== value) {
			this._pointSizeType = value;
			this.updateShaderSource();
			this.dispatchEvent({ type: 'point_size_type_changed', target: this });
			this.dispatchEvent({ type: 'material_property_changed', target: this });
		}
	}

	get useEDL(): boolean {
		return this._useEDL;
	}

	set useEDL(value: boolean) {
		if (this._useEDL !== value) {
			this._useEDL = value;
			this.updateShaderSource();
		}
	}

	get color(): THREE.Color {
		return this.uniforms.uColor.value;
	}

	set color(value: THREE.Color) {
		if (!this.uniforms.uColor.value.equals(value)) {
			this.uniforms.uColor.value.copy(value);
			this.dispatchEvent({ type: 'color_changed', target: this });
			this.dispatchEvent({ type: 'material_property_changed', target: this });
		}
	}

	get shape(): PointShape {
		return this._shape;
	}

	set shape(value: PointShape) {
		if (this._shape !== value) {
			this._shape = value;
			this.updateShaderSource();
			this.dispatchEvent({ type: 'point_shape_changed', target: this });
			this.dispatchEvent({ type: 'material_property_changed', target: this });
		}
	}

	get treeType(): TreeType {
		return this._treeType;
	}

	set treeType(value: TreeType) {
		if (this._treeType !== value) {
			this._treeType = value;
			this.updateShaderSource();
		}
	}

	get bbSize(): [number, number, number] {
		return this.uniforms.bbSize.value;
	}

	set bbSize(value: [number, number, number]) {
		this.uniforms.bbSize.value = value;
	}

	get size(): number {
		return this.uniforms.size.value;
	}

	set size(value: number) {
		if (this.uniforms.size.value !== value) {
			this.uniforms.size.value = value;
			this.dispatchEvent({ type: 'point_size_changed', target: this });
			this.dispatchEvent({ type: 'material_property_changed', target: this });
		}
	}

	get minSize(): number {
		return this.uniforms.minSize.value;
	}

	set minSize(value: number) {
		if (this.uniforms.minSize.value !== value) {
			this.uniforms.minSize.value = value;
			this.dispatchEvent({ type: 'point_size_changed', target: this });
			this.dispatchEvent({ type: 'material_property_changed', target: this });
		}
	}

	get elevationRange(): [number, number] {
		return this.uniforms.elevationRange.value;
	}

	set elevationRange(value: [number, number]) {
		const changed = this.uniforms.elevationRange.value[0] !== value[0] || this.uniforms.elevationRange.value[1] !== value[1];
		if (changed) {
			this.uniforms.elevationRange.value = value;
			this._defaultElevationRangeChanged = true;
			this.dispatchEvent({ type: 'material_property_changed', target: this });
		}
	}

	get heightMin(): number {
		return this.uniforms.elevationRange.value[0];
	}

	set heightMin(value: number) {
		this.elevationRange = [value, this.elevationRange[1]];
	}

	get heightMax(): number {
		return this.uniforms.elevationRange.value[1];
	}

	set heightMax(value: number) {
		this.elevationRange = [this.elevationRange[0], value];
	}

	get transition(): number {
		return this.uniforms.transition.value;
	}

	set transition(value: number) {
		this.uniforms.transition.value = value;
	}

	get intensityRange(): [number, number] {
		return this.uniforms.intensityRange.value;
	}

	set intensityRange(value: [number, number]) {
		if (!(value instanceof Array && value.length === 2)) return;
		if (value[0] === this.uniforms.intensityRange.value[0] && value[1] === this.uniforms.intensityRange.value[1]) return;
		this.uniforms.intensityRange.value = value;
		this._defaultIntensityRangeChanged = true;
		this.dispatchEvent({ type: 'material_property_changed', target: this });
	}

	get intensityGamma(): number {
		return this.uniforms.intensity_gbc.value[0];
	}

	set intensityGamma(value: number) {
		if (this.uniforms.intensity_gbc.value[0] !== value) {
			this.uniforms.intensity_gbc.value[0] = value;
			this.dispatchEvent({ type: 'material_property_changed', target: this });
		}
	}

	get intensityContrast(): number {
		return this.uniforms.intensity_gbc.value[1];
	}

	set intensityContrast(value: number) {
		if (this.uniforms.intensity_gbc.value[1] !== value) {
			this.uniforms.intensity_gbc.value[1] = value;
			this.dispatchEvent({ type: 'material_property_changed', target: this });
		}
	}

	get intensityBrightness(): number {
		return this.uniforms.intensity_gbc.value[2];
	}

	set intensityBrightness(value: number) {
		if (this.uniforms.intensity_gbc.value[2] !== value) {
			this.uniforms.intensity_gbc.value[2] = value;
			this.dispatchEvent({ type: 'material_property_changed', target: this });
		}
	}

	get rgbGamma(): number {
		return this.uniforms.uRGB_gbc.value[0];
	}

	set rgbGamma(value: number) {
		if (this.uniforms.uRGB_gbc.value[0] !== value) {
			this.uniforms.uRGB_gbc.value[0] = value;
			this.dispatchEvent({ type: 'material_property_changed', target: this });
		}
	}

	get rgbContrast(): number {
		return this.uniforms.uRGB_gbc.value[1];
	}

	set rgbContrast(value: number) {
		if (this.uniforms.uRGB_gbc.value[1] !== value) {
			this.uniforms.uRGB_gbc.value[1] = value;
			this.dispatchEvent({ type: 'material_property_changed', target: this });
		}
	}

	get rgbBrightness(): number {
		return this.uniforms.uRGB_gbc.value[2];
	}

	set rgbBrightness(value: number) {
		if (this.uniforms.uRGB_gbc.value[2] !== value) {
			this.uniforms.uRGB_gbc.value[2] = value;
			this.dispatchEvent({ type: 'material_property_changed', target: this });
		}
	}

	get weightRGB(): number {
		return this.uniforms.wRGB.value;
	}

	set weightRGB(value: number) {
		if (this.uniforms.wRGB.value !== value) {
			this.uniforms.wRGB.value = value;
			this.dispatchEvent({ type: 'material_property_changed', target: this });
		}
	}

	get weightIntensity(): number {
		return this.uniforms.wIntensity.value;
	}

	set weightIntensity(value: number) {
		if (this.uniforms.wIntensity.value !== value) {
			this.uniforms.wIntensity.value = value;
			this.dispatchEvent({ type: 'material_property_changed', target: this });
		}
	}

	get weightElevation(): number {
		return this.uniforms.wElevation.value;
	}

	set weightElevation(value: number) {
		if (this.uniforms.wElevation.value !== value) {
			this.uniforms.wElevation.value = value;
			this.dispatchEvent({ type: 'material_property_changed', target: this });
		}
	}

	get weightClassification(): number {
		return this.uniforms.wClassification.value;
	}

	set weightClassification(value: number) {
		if (this.uniforms.wClassification.value !== value) {
			this.uniforms.wClassification.value = value;
			this.dispatchEvent({ type: 'material_property_changed', target: this });
		}
	}

	get weightReturnNumber(): number {
		return this.uniforms.wReturnNumber.value;
	}

	set weightReturnNumber(value: number) {
		if (this.uniforms.wReturnNumber.value !== value) {
			this.uniforms.wReturnNumber.value = value;
			this.dispatchEvent({ type: 'material_property_changed', target: this });
		}
	}

	get weightSourceID(): number {
		return this.uniforms.wSourceID.value;
	}

	set weightSourceID(value: number) {
		if (this.uniforms.wSourceID.value !== value) {
			this.uniforms.wSourceID.value = value;
			this.dispatchEvent({ type: 'material_property_changed', target: this });
		}
	}

	static generateGradientTexture(gradient: [number, THREE.Color][]): THREE.Texture {
		const size = 64;
		if (typeof document === 'undefined') {
			// Headless stub fallback
			const data = new Uint8Array(size * size * 4);
			const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
			texture.needsUpdate = true;
			return texture;
		}

		const canvas = document.createElement('canvas');
		canvas.width = size;
		canvas.height = size;
		const context = canvas.getContext('2d');

		if (context) {
			context.rect(0, 0, size, size);
			const ctxGradient = context.createLinearGradient(0, 0, size, size);
			for (let i = 0; i < gradient.length; i++) {
				const step = gradient[i];
				ctxGradient.addColorStop(step[0], '#' + step[1].getHexString());
			}
			context.fillStyle = ctxGradient;
			context.fill();
		}

		const texture = new THREE.CanvasTexture(canvas);
		texture.needsUpdate = true;
		texture.minFilter = THREE.LinearFilter;
		texture.wrapS = THREE.RepeatWrapping;
		texture.wrapT = THREE.RepeatWrapping;
		texture.repeat.set(2, 2);
		return texture;
	}

	static generateMatcapTexture(matcap: string): THREE.Texture {
		const base = runtime.resourcePath || './resources';
		const url = `${base}/textures/matcap/${matcap}`;
		const texture = new THREE.TextureLoader().load(url);
		texture.magFilter = THREE.LinearFilter;
		texture.minFilter = THREE.LinearFilter;
		texture.needsUpdate = true;
		return texture;
	}

	disableEvents(): void {
		if (this._hiddenListeners === undefined) {
			this._hiddenListeners = (this as any)._listeners;
			(this as any)._listeners = {};
		}
	}

	enableEvents(): void {
		(this as any)._listeners = this._hiddenListeners;
		this._hiddenListeners = undefined;
	}
}
