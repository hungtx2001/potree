
import * as THREE from 'three';
import {Utils} from "../../utils.js";
import {runtime} from "../../runtime.js";
import {PointCloudTree} from "../../PointCloudTree.js";
import {Annotation} from "../../Annotation.js";
import {Measure} from "../../utils/Measure.js";
import {Profile} from "../../utils/Profile.js";
import {Volume, BoxVolume, SphereVolume} from "../../utils/Volume.js";
import {CameraAnimation} from "../../modules/CameraAnimation/CameraAnimation.js";
import {PointSizeType, PointShape, ElevationGradientRepeat} from "../../defines.js";
import {Gradients} from "../../materials/Gradients.js";

import {MeasurePanel} from "./MeasurePanel.js";
import {DistancePanel} from "./DistancePanel.js";
import {PointPanel} from "./PointPanel.js";
import {AreaPanel} from "./AreaPanel.js";
import {AnglePanel} from "./AnglePanel.js";
import {CirclePanel} from "./CirclePanel.js";
import {HeightPanel} from "./HeightPanel.js";
import {VolumePanel} from "./VolumePanel.js";
import {ProfilePanel} from "./ProfilePanel.js";
import {CameraPanel} from "./CameraPanel.js";
import {AnnotationPanel} from "./AnnotationPanel.js";
import { CameraAnimationPanel } from "./CameraAnimationPanel.js";
import { ModernSlider } from "../ui/components/ModernSlider.js";
import { ToggleGroup } from "../ui/components/ToggleGroup.js";
import { ModernColorPicker } from "../ui/components/ModernColorPicker.js";

export class PropertiesPanel{

	constructor(container, viewer){
		this.container = container;
		this.viewer = viewer;
		this.object = null;
		this.cleanupTasks = [];
		this.scene = null;
	}

	setScene(scene){
		this.scene = scene;
	}

	set(object){
		if(this.object === object){
			return;
		}

		this.object = object;
		
		for(let task of this.cleanupTasks){
			task();
		}
		this.cleanupTasks = [];
		this.container.empty();

		if(object instanceof PointCloudTree){
			this.setPointCloud(object);
		}else if(object instanceof Measure || object instanceof Profile || object instanceof Volume){
			this.setMeasurement(object);
		}else if(object instanceof THREE.Camera){
			this.setCamera(object);
		}else if(object instanceof Annotation){
			this.setAnnotation(object);
		}else if(object instanceof CameraAnimation){
			this.setCameraAnimation(object);
		}
		
	}

	//
	// Used for events that should be removed when the property object changes.
	// This is for listening to materials, scene, point clouds, etc.
	// not required for DOM listeners, since they are automatically cleared by removing the DOM subtree.
	//
	addVolatileListener(target, type, callback){
		target.addEventListener(type, callback);
		this.cleanupTasks.push(() => {
			target.removeEventListener(type, callback);
		});
	}

	setPointCloud(pointcloud){

		let material = pointcloud.material;

		let panel = $(`
			<div class="scene_content selectable">
				<ul class="pv-menu-list">

				<li>
				<span data-i18n="appearance.point_size"></span>:&nbsp;<span id="lblPointSize"></span> <div id="sldPointSize"></div>
				</li>
				<li>
				<span data-i18n="appearance.min_point_size"></span>:&nbsp;<span id="lblMinPointSize"></span> <div id="sldMinPointSize"></div>
				</li>

				<!-- SIZE TYPE -->
				<li>
					<label for="optPointSizing" class="pv-select-label" data-i18n="appearance.point_size_type">Point Sizing </label>
					<select id="optPointSizing" name="optPointSizing">
						<option>FIXED</option>
						<option>ATTENUATED</option>
						<option>ADAPTIVE</option>
					</select>
				</li>

				<!-- SHAPE -->
				<li>
					<label for="optShape" class="pv-select-label" data-i18n="appearance.point_shape"></label><br>
					<select id="optShape" name="optShape">
						<option>SQUARE</option>
						<option>CIRCLE</option>
						<option>PARABOLOID</option>
					</select>
				</li>

				<li id="materials_backface_container">
				<label><input id="set_backface_culling" type="checkbox" /><span data-i18n="appearance.backface_culling"></span></label>
				</li>
				
				<!-- OPACITY -->
				<li><span data-i18n="appearance.point_opacity"></span>:<span id="lblOpacity"></span><div id="sldOpacity"></div></li>

				<div class="divider">
					<span>Attribute</span>
				</div>

				<li>
					<select id="optMaterial" name="optMaterial"></select>
				</li>

				<div id="materials.composite_weight_container">
					<div class="divider">
						<span>Attribute Weights</span>
					</div>

					<li>RGB: <span id="lblWeightRGB"></span> <div id="sldWeightRGB"></div>	</li>
					<li>Intensity: <span id="lblWeightIntensity"></span> <div id="sldWeightIntensity"></div>	</li>
					<li>Elevation: <span id="lblWeightElevation"></span> <div id="sldWeightElevation"></div>	</li>
					<li>Classification: <span id="lblWeightClassification"></span> <div id="sldWeightClassification"></div>	</li>
					<li>Return Number: <span id="lblWeightReturnNumber"></span> <div id="sldWeightReturnNumber"></div>	</li>
					<li>Source ID: <span id="lblWeightSourceID"></span> <div id="sldWeightSourceID"></div>	</li>
				</div>

				<div id="materials.rgb_container">
					<div class="divider">
						<span>RGB</span>
					</div>

					<li>Gamma: <span id="lblRGBGamma"></span> <div id="sldRGBGamma"></div>	</li>
					<li>Brightness: <span id="lblRGBBrightness"></span> <div id="sldRGBBrightness"></div>	</li>
					<li>Contrast: <span id="lblRGBContrast"></span> <div id="sldRGBContrast"></div>	</li>
				</div>

				<div id="materials.extra_container">
					<div class="divider">
						<span>Extra Attribute</span>
					</div>

					<li><span data-i18n="appearance.extra_range"></span>: <span id="lblExtraRange"></span> <div id="sldExtraRange"></div></li>

					<li>
						<selectgroup id="extra_gradient_repeat_option">
							<option id="extra_gradient_repeat_clamp" value="CLAMP">Clamp</option>
							<option id="extra_gradient_repeat_repeat" value="REPEAT">Repeat</option>
							<option id="extra_gradient_repeat_mirrored_repeat" value="MIRRORED_REPEAT">Mirrored Repeat</option>
						</selectgroup>
					</li>

					<li>
						<span>Gradient Scheme:</span>
						<div id="extra_gradient_scheme_selection" class="gradient_scheme" style="display: flex; padding: 1em 0em">
						</div>
					</li>
				</div>
				
				<div id="materials.matcap_container">
					<div class="divider">
						<span>MATCAP</span>
					</div>

					<li>
						<div id="matcap_scheme_selection" style="display: flex; flex-wrap: wrap;"> </div>
					</li>
				</div>

				<div id="materials.color_container">
					<div class="divider">
						<span>Color</span>
					</div>

					<input id="materials.color.picker" />
				</div>


				<div id="materials.elevation_container">
					<div class="divider">
						<span>Elevation</span>
					</div>

					<li><span data-i18n="appearance.elevation_range"></span>: <span id="lblHeightRange"></span> <div id="sldHeightRange"></div>	</li>

					<li>
						<selectgroup id="gradient_repeat_option">
							<option id="gradient_repeat_clamp" value="CLAMP">Clamp</option>
							<option id="gradient_repeat_repeat" value="REPEAT">Repeat</option>
							<option id="gradient_repeat_mirrored_repeat" value="MIRRORED_REPEAT">Mirrored Repeat</option>
						</selectgroup>
					</li>

					<li>
						<span>Gradient Scheme:</span>
						<div id="elevation_gradient_scheme_selection" class="gradient_scheme" style="display: flex; padding: 1em 0em">
						</div>
					</li>
				</div>

				<div id="materials.transition_container">
					<div class="divider">
						<span>Transition</span>
					</div>

					<li>transition: <span id="lblTransition"></span> <div id="sldTransition"></div>	</li>
				</div>

				<div id="materials.intensity_container">
					<div class="divider">
						<span>Intensity</span>
					</div>

					<li>Range: <span id="lblIntensityRange"></span> <div id="sldIntensityRange"></div>	</li>
					<li>Gamma: <span id="lblIntensityGamma"></span> <div id="sldIntensityGamma"></div>	</li>
					<li>Brightness: <span id="lblIntensityBrightness"></span> <div id="sldIntensityBrightness"></div>	</li>
					<li>Contrast: <span id="lblIntensityContrast"></span> <div id="sldIntensityContrast"></div>	</li>
				</div>

				<div id="materials.gpstime_container">
					<div class="divider">
						<span>GPS Time</span>
					</div>

				</div>
				
				<div id="materials.index_container">
					<div class="divider">
						<span>Indices</span>
					</div>
				</div>


				</ul>
			</div>
		`);

		panel.i18n();
		this.container.append(panel);

		{ // POINT SIZE
			let sldPointSize = panel.find(`#sldPointSize`);
			let lblPointSize = panel.find(`#lblPointSize`);

			this.sldPointSize = new ModernSlider({
				container: sldPointSize[0] || sldPointSize,
				value: material.size,
				min: 0,
				max: 3,
				step: 0.01,
				slide: function (event, ui) { material.size = ui.value; }
			});

			let update = (e) => {
				lblPointSize.html(material.size.toFixed(2));
				this.sldPointSize.setValue(material.size);
			};
			this.addVolatileListener(material, "point_size_changed", update);
			
			update();
		}

		{ // MINIMUM POINT SIZE
			let sldMinPointSize = panel.find(`#sldMinPointSize`);
			let lblMinPointSize = panel.find(`#lblMinPointSize`);

			this.sldMinPointSize = new ModernSlider({
				container: sldMinPointSize[0] || sldMinPointSize,
				value: material.minSize,
				min: 0,
				max: 3,
				step: 0.01,
				slide: function (event, ui) { material.minSize = ui.value; }
			});

			let update = (e) => {
				lblMinPointSize.html(material.minSize.toFixed(2));
				this.sldMinPointSize.setValue(material.minSize);
			};
			this.addVolatileListener(material, "point_size_changed", update);
			
			update();
		}

		{ // POINT SIZING
			let strSizeType = Object.keys(PointSizeType)[material.pointSizeType];

			let opt = panel.find(`#optPointSizing`);
			opt.selectmenu();
			opt.val(strSizeType).selectmenu('refresh');

			opt.selectmenu({
				change: (event, ui) => {
					material.pointSizeType = PointSizeType[ui.item.value];
				}
			});
		}

		{ // SHAPE
			let opt = panel.find(`#optShape`);

			opt.selectmenu({
				change: (event, ui) => {
					let value = ui.item.value;

					material.shape = PointShape[value];
				}
			});

			let update = () => {
				let typename = Object.keys(PointShape)[material.shape];

				opt.selectmenu().val(typename).selectmenu('refresh');
			};
			this.addVolatileListener(material, "point_shape_changed", update);

			update();
		}

		{ // BACKFACE CULLING
			
			let opt = panel.find(`#set_backface_culling`);
			opt.click(() => {
				material.backfaceCulling = opt.prop("checked");
			});
			let update = () => {
				let value = material.backfaceCulling;
				opt.prop("checked", value);
			};
			this.addVolatileListener(material, "backface_changed", update);
			update();

			let blockBackface = $('#materials_backface_container');
			blockBackface.css('display', 'none');

			const pointAttributes = pointcloud.pcoGeometry.pointAttributes;
			const hasNormals = pointAttributes.hasNormals ? pointAttributes.hasNormals() : false;
			if(hasNormals) {
				blockBackface.css('display', 'block');
			}
			/*
			opt.checkboxradio({
				clicked: (event, ui) => {
					// let value = ui.item.value;
					let value = ui.item.checked;
					console.log(value);
					material.backfaceCulling = value; // $('#set_freeze').prop("checked");
				}
			});
			*/
		}

		{ // OPACITY
			let sldOpacity = panel.find(`#sldOpacity`);
			let lblOpacity = panel.find(`#lblOpacity`);

			this.sldOpacity = new ModernSlider({
				container: sldOpacity[0] || sldOpacity,
				value: material.opacity,
				min: 0,
				max: 1,
				step: 0.001,
				slide: function (event, ui) { 
					material.opacity = ui.value;
				}
			});

			let update = (e) => {
				lblOpacity.html(material.opacity.toFixed(2));
				this.sldOpacity.setValue(material.opacity);
			};
			this.addVolatileListener(material, "opacity_changed", update);

			update();
		}

		{

			const attributes = pointcloud.pcoGeometry.pointAttributes.attributes;

			let options = [];

			options.push(...attributes.map(a => a.name));

			const intensityIndex = options.indexOf("intensity");
			if(intensityIndex >= 0){
				options.splice(intensityIndex + 1, 0, "intensity gradient");
			}

			options.push(
				"elevation",
				"color",
				'matcap',
				'indices',
				'level of detail',
				'composite'
			);

			const blacklist = [
				"POSITION_CARTESIAN",
				"position",
			];

			options = options.filter(o => !blacklist.includes(o));

			let attributeSelection = panel.find('#optMaterial');
			for(let option of options){
				let elOption = $(`<option>${option}</option>`);
				attributeSelection.append(elOption);
			}

			let updateMaterialPanel = (event, ui) => {
				let selectedValue = attributeSelection.selectmenu().val();
				material.activeAttributeName = selectedValue;

				let attribute = pointcloud.getAttribute(selectedValue);

				if(selectedValue === "intensity gradient"){
					attribute = pointcloud.getAttribute("intensity");
				}

				const isIntensity = attribute ? ["intensity", "intensity gradient"].includes(attribute.name) : false;

				if(isIntensity){
					if(pointcloud.material.intensityRange[0] === Infinity){
						pointcloud.material.intensityRange = attribute.range;
					}

					const [min, max] = attribute.range;

					const elIntensityRange = panel.find('#sldIntensityRange');
					this.sldIntensityRange = new ModernSlider({
						container: elIntensityRange[0] || elIntensityRange,
						range: true,
						min: min, max: max, step: 0.01,
						values: [min, max],
						slide: (event, ui) => {
							let min = ui.values[0];
							let max = ui.values[1];
							material.intensityRange = [min, max];
						}
					});
				} else if(attribute){
					const [min, max] = attribute.range;

					let selectedRange = material.getRange(attribute.name);

					if(!selectedRange){
						selectedRange = [...attribute.range];
					}

					let minMaxAreNumbers = typeof min === "number" && typeof max === "number";

					if(minMaxAreNumbers){
						const elExtraRange = panel.find('#sldExtraRange');
						this.sldExtraRange = new ModernSlider({
							container: elExtraRange[0] || elExtraRange,
							range: true,
							min: min, 
							max: max, 
							step: 0.01,
							values: selectedRange,
							slide: (event, ui) => {
								let [a, b] = ui.values;

								material.setRange(attribute.name, [a, b]);
							}
						});
					}

				}

				let blockWeights = $('#materials\\.composite_weight_container');
				let blockElevation = $('#materials\\.elevation_container');
				let blockRGB = $('#materials\\.rgb_container');
				let blockExtra = $('#materials\\.extra_container');
				let blockColor = $('#materials\\.color_container');
				let blockIntensity = $('#materials\\.intensity_container');
				let blockIndex = $('#materials\\.index_container');
				let blockTransition = $('#materials\\.transition_container');
				let blockGps = $('#materials\\.gpstime_container');
				let blockMatcap = $('#materials\\.matcap_container');

				blockIndex.css('display', 'none');
				blockIntensity.css('display', 'none');
				blockElevation.css('display', 'none');
				blockRGB.css('display', 'none');
				blockExtra.css('display', 'none');
				blockColor.css('display', 'none');
				blockWeights.css('display', 'none');
				blockTransition.css('display', 'none');
				blockMatcap.css('display', 'none');
				blockGps.css('display', 'none');

				if (selectedValue === 'composite') {
					blockWeights.css('display', 'block');
					blockElevation.css('display', 'block');
					blockRGB.css('display', 'block');
					blockIntensity.css('display', 'block');
				} else if (selectedValue === 'elevation') {
					blockElevation.css('display', 'block');
				} else if (selectedValue === 'RGB and Elevation') {
					blockRGB.css('display', 'block');
					blockElevation.css('display', 'block');
				} else if (selectedValue === 'rgba') {
					blockRGB.css('display', 'block');
				} else if (selectedValue === 'color') {
					blockColor.css('display', 'block');
				} else if (selectedValue === 'intensity') {
					blockIntensity.css('display', 'block');
				} else if (selectedValue === 'intensity gradient') {
					blockIntensity.css('display', 'block');
				} else if (selectedValue === "indices" ){
					blockIndex.css('display', 'block');
				} else if (selectedValue === "matcap" ){
					blockMatcap.css('display', 'block');
				} else if (selectedValue === "classification" ){
					// add classification color selctor?
				} else if (selectedValue === "gps-time" ){
					blockGps.css('display', 'block');
				} else if(selectedValue === "number of returns"){
					
				} else if(selectedValue === "return number"){
					
				} else if(["source id", "point source id"].includes(selectedValue)){
					
				} else{
					blockExtra.css('display', 'block');
				}
			};

			attributeSelection.selectmenu({change: updateMaterialPanel});

			let update = () => {
				attributeSelection.val(material.activeAttributeName).selectmenu('refresh');
			};
			this.addVolatileListener(material, "point_color_type_changed", update);
			this.addVolatileListener(material, "active_attribute_changed", update);

			update();
			updateMaterialPanel();
		}

		{
			const schemes = Object.keys(Gradients).map(name => ({name: name, values: Gradients[name]}));

			let elSchemeContainers = panel.find("div.gradient_scheme");

			for(let scheme of schemes){
				elSchemeContainers.each(function(index, container){
					let elScheme = $(`
						<span style="flex-grow: 1;">
						</span>
					`);

					const svg = Utils.createSvgGradient(scheme.values);
					svg.setAttributeNS(null, "class", `button-icon`);

					elScheme.append($(svg));

					elScheme.click( () => {
						material.gradient = Gradients[scheme.name];
					});

					$(container).append(elScheme);
				});
			}
		}

		{
			let matcaps = [
				{name: "Normals", icon: `${runtime.resourcePath}/icons/matcap/check_normal+y.jpg`}, 
				{name: "Basic 1", icon: `${runtime.resourcePath}/icons/matcap/basic_1.jpg`}, 
				{name: "Basic 2", icon: `${runtime.resourcePath}/icons/matcap/basic_2.jpg`}, 
				{name: "Basic Dark", icon: `${runtime.resourcePath}/icons/matcap/basic_dark.jpg`}, 
				{name: "Basic Side", icon: `${runtime.resourcePath}/icons/matcap/basic_side.jpg`}, 
				{name: "Ceramic Dark", icon: `${runtime.resourcePath}/icons/matcap/ceramic_dark.jpg`}, 
				{name: "Ceramic Lightbulb", icon: `${runtime.resourcePath}/icons/matcap/ceramic_lightbulb.jpg`}, 
				{name: "Clay Brown", icon: `${runtime.resourcePath}/icons/matcap/clay_brown.jpg`}, 
				{name: "Clay Muddy", icon: `${runtime.resourcePath}/icons/matcap/clay_muddy.jpg`}, 
				{name: "Clay Studio", icon: `${runtime.resourcePath}/icons/matcap/clay_studio.jpg`}, 
				{name: "Resin", icon: `${runtime.resourcePath}/icons/matcap/resin.jpg`}, 
				{name: "Skin", icon: `${runtime.resourcePath}/icons/matcap/skin.jpg`}, 
				{name: "Jade", icon: `${runtime.resourcePath}/icons/matcap/jade.jpg`}, 
				{name: "Metal_ Anisotropic", icon: `${runtime.resourcePath}/icons/matcap/metal_anisotropic.jpg`}, 
				{name: "Metal Carpaint", icon: `${runtime.resourcePath}/icons/matcap/metal_carpaint.jpg`}, 
				{name: "Metal Lead", icon: `${runtime.resourcePath}/icons/matcap/metal_lead.jpg`}, 
				{name: "Metal Shiny", icon: `${runtime.resourcePath}/icons/matcap/metal_shiny.jpg`}, 
				{name: "Pearl", icon: `${runtime.resourcePath}/icons/matcap/pearl.jpg`}, 
				{name: "Toon", icon: `${runtime.resourcePath}/icons/matcap/toon.jpg`},
				{name: "Check Rim Light", icon: `${runtime.resourcePath}/icons/matcap/check_rim_light.jpg`}, 
				{name: "Check Rim Dark", icon: `${runtime.resourcePath}/icons/matcap/check_rim_dark.jpg`}, 
				{name: "Contours 1", icon: `${runtime.resourcePath}/icons/matcap/contours_1.jpg`}, 
				{name: "Contours 2", icon: `${runtime.resourcePath}/icons/matcap/contours_2.jpg`}, 
				{name: "Contours 3", icon: `${runtime.resourcePath}/icons/matcap/contours_3.jpg`}, 
				{name: "Reflection Check Horizontal", icon: `${runtime.resourcePath}/icons/matcap/reflection_check_horizontal.jpg`}, 
				{name: "Reflection Check Vertical", icon: `${runtime.resourcePath}/icons/matcap/reflection_check_vertical.jpg`}, 
			];

			let elMatcapContainer = panel.find("#matcap_scheme_selection");

			for(let matcap of matcaps){
				let elMatcap = $(`
						<img src="${matcap.icon}" class="button-icon" style="width: 25%;" />
				`);

				elMatcap.click( () => {
					material.matcap = matcap.icon.substring(matcap.icon.lastIndexOf('/'));
				});

				elMatcapContainer.append(elMatcap);
			}
		}

		{
			const elRGBGamma = panel.find('#sldRGBGamma');
			this.sldRGBGamma = new ModernSlider({
				container: elRGBGamma[0] || elRGBGamma,
				value: material.rgbGamma,
				min: 0, max: 4, step: 0.01,
				slide: (event, ui) => {material.rgbGamma = ui.value}
			});

			const elRGBContrast = panel.find('#sldRGBContrast');
			this.sldRGBContrast = new ModernSlider({
				container: elRGBContrast[0] || elRGBContrast,
				value: material.rgbContrast,
				min: -1, max: 1, step: 0.01,
				slide: (event, ui) => {material.rgbContrast = ui.value}
			});

			const elRGBBrightness = panel.find('#sldRGBBrightness');
			this.sldRGBBrightness = new ModernSlider({
				container: elRGBBrightness[0] || elRGBBrightness,
				value: material.rgbBrightness,
				min: -1, max: 1, step: 0.01,
				slide: (event, ui) => {material.rgbBrightness = ui.value}
			});

			const elExtraGamma = panel.find('#sldExtraGamma');
			this.sldExtraGamma = new ModernSlider({
				container: elExtraGamma[0] || elExtraGamma,
				value: material.extraGamma,
				min: 0, max: 4, step: 0.01,
				slide: (event, ui) => {material.extraGamma = ui.value}
			});

			const elExtraBrightness = panel.find('#sldExtraBrightness');
			this.sldExtraBrightness = new ModernSlider({
				container: elExtraBrightness[0] || elExtraBrightness,
				value: material.extraBrightness,
				min: -1, max: 1, step: 0.01,
				slide: (event, ui) => {material.extraBrightness = ui.value}
			});

			const elExtraContrast = panel.find('#sldExtraContrast');
			this.sldExtraContrast = new ModernSlider({
				container: elExtraContrast[0] || elExtraContrast,
				value: material.extraContrast,
				min: -1, max: 1, step: 0.01,
				slide: (event, ui) => {material.extraContrast = ui.value}
			});

			const elHeightRange = panel.find('#sldHeightRange');
			this.sldHeightRange = new ModernSlider({
				container: elHeightRange[0] || elHeightRange,
				range: true,
				min: 0, max: 1000, step: 0.01,
				values: [0, 1000],
				slide: (event, ui) => {
					material.heightMin = ui.values[0];
					material.heightMax = ui.values[1];
				}
			});

			const elIntensityGamma = panel.find('#sldIntensityGamma');
			this.sldIntensityGamma = new ModernSlider({
				container: elIntensityGamma[0] || elIntensityGamma,
				value: material.intensityGamma,
				min: 0, max: 4, step: 0.01,
				slide: (event, ui) => {material.intensityGamma = ui.value}
			});

			const elIntensityContrast = panel.find('#sldIntensityContrast');
			this.sldIntensityContrast = new ModernSlider({
				container: elIntensityContrast[0] || elIntensityContrast,
				value: material.intensityContrast,
				min: -1, max: 1, step: 0.01,
				slide: (event, ui) => {material.intensityContrast = ui.value}
			});

			const elIntensityBrightness = panel.find('#sldIntensityBrightness');
			this.sldIntensityBrightness = new ModernSlider({
				container: elIntensityBrightness[0] || elIntensityBrightness,
				value: material.intensityBrightness,
				min: -1, max: 1, step: 0.01,
				slide: (event, ui) => {material.intensityBrightness = ui.value}
			});

			const elWeightRGB = panel.find('#sldWeightRGB');
			this.sldWeightRGB = new ModernSlider({
				container: elWeightRGB[0] || elWeightRGB,
				value: material.weightRGB,
				min: 0, max: 1, step: 0.01,
				slide: (event, ui) => {material.weightRGB = ui.value}
			});

			const elWeightIntensity = panel.find('#sldWeightIntensity');
			this.sldWeightIntensity = new ModernSlider({
				container: elWeightIntensity[0] || elWeightIntensity,
				value: material.weightIntensity,
				min: 0, max: 1, step: 0.01,
				slide: (event, ui) => {material.weightIntensity = ui.value}
			});

			const elWeightElevation = panel.find('#sldWeightElevation');
			this.sldWeightElevation = new ModernSlider({
				container: elWeightElevation[0] || elWeightElevation,
				value: material.weightElevation,
				min: 0, max: 1, step: 0.01,
				slide: (event, ui) => {material.weightElevation = ui.value}
			});

			const elWeightClassification = panel.find('#sldWeightClassification');
			this.sldWeightClassification = new ModernSlider({
				container: elWeightClassification[0] || elWeightClassification,
				value: material.weightClassification,
				min: 0, max: 1, step: 0.01,
				slide: (event, ui) => {material.weightClassification = ui.value}
			});

			const elWeightReturnNumber = panel.find('#sldWeightReturnNumber');
			this.sldWeightReturnNumber = new ModernSlider({
				container: elWeightReturnNumber[0] || elWeightReturnNumber,
				value: material.weightReturnNumber,
				min: 0, max: 1, step: 0.01,
				slide: (event, ui) => {material.weightReturnNumber = ui.value}
			});

			const elWeightSourceID = panel.find('#sldWeightSourceID');
			this.sldWeightSourceID = new ModernSlider({
				container: elWeightSourceID[0] || elWeightSourceID,
				value: material.weightSourceID,
				min: 0, max: 1, step: 0.01,
				slide: (event, ui) => {material.weightSourceID = ui.value}
			});

			const elColorPicker = panel.find(`#materials\\.color\\.picker`);
			this.colorPicker = new ModernColorPicker({
				container: elColorPicker[0] || elColorPicker,
				color: `#${material.color.getHexString()}`,
				showAlpha: false,
				onChange: colorHex => {
					material.color = new THREE.Color(colorHex);
				}
			});

			this.addVolatileListener(material, "color_changed", () => {
				if (this.colorPicker) {
					this.colorPicker.setColor(`#${material.color.getHexString()}`, false);
				}
			});

			let updateHeightRange = () => {
				let aPosition = pointcloud.getAttribute("position");

				let bMin, bMax;

				if(aPosition){
					// for new format 2.0 and loader that contain precomputed min/max of attributes
					let min = aPosition.range[0][2];
					let max = aPosition.range[1][2];
					let width = max - min;

					bMin = min - 0.2 * width;
					bMax = max + 0.2 * width;
				}else{
					// for format up until exlusive 2.0
					let box = [pointcloud.pcoGeometry.tightBoundingBox, pointcloud.getBoundingBoxWorld()]
						.find(v => v !== undefined);

					pointcloud.updateMatrixWorld(true);
					box = Utils.computeTransformedBoundingBox(box, pointcloud.matrixWorld);

					let bWidth = box.max.z - box.min.z;
					bMin = box.min.z - 0.2 * bWidth;
					bMax = box.max.z + 0.2 * bWidth;
				}

				let range = material.elevationRange;

				panel.find('#lblHeightRange').html(`${range[0].toFixed(2)} to ${range[1].toFixed(2)}`);
				if (this.sldHeightRange) {
					this.sldHeightRange.setOption('min', bMin);
					this.sldHeightRange.setOption('max', bMax);
					this.sldHeightRange.setValues(range);
				}
			};

			let updateExtraRange = function () {

				let attributeName = material.activeAttributeName;
				let attribute = pointcloud.getAttribute(attributeName);

				if(attribute == null){
					return;
				}
				
				let range = material.getRange(attributeName);

				if(range == null){
					range = attribute.range;
				}

				// currently only supporting scalar ranges.
				// rgba, normals, positions, etc have vector ranges, however
				let isValidRange = (typeof range[0] === "number") && (typeof range[1] === "number");
				if(!isValidRange){
					return;
				}

				if(range){
					let msg = `${range[0].toFixed(2)} to ${range[1].toFixed(2)}`;
					panel.find('#lblExtraRange').html(msg);
				}else{
					panel.find("could not deduce range");
				}
			};

			let updateIntensityRange = function () {
				let range = material.intensityRange;

				panel.find('#lblIntensityRange').html(`${parseInt(range[0])} to ${parseInt(range[1])}`);
			};

			{
				updateHeightRange();
			}

			{
				let elGradientRepeat = panel.find("#gradient_repeat_option");
				let current = Object.keys(ElevationGradientRepeat)
					.filter(key => ElevationGradientRepeat[key] === this.viewer.elevationGradientRepeat);

				this.gradientRepeatToggle = new ToggleGroup({
					container: elGradientRepeat[0] || elGradientRepeat,
					title: "Gradient",
					value: current[0] || 'CLAMP',
					onChange: (value) => {
						this.viewer.setElevationGradientRepeat(ElevationGradientRepeat[value]);
					}
				});
			}

			{
				let elGradientRepeat = panel.find("#extra_gradient_repeat_option");
				let current = Object.keys(ElevationGradientRepeat)
					.filter(key => ElevationGradientRepeat[key] === this.viewer.elevationGradientRepeat);

				this.extraGradientRepeatToggle = new ToggleGroup({
					container: elGradientRepeat[0] || elGradientRepeat,
					title: "Gradient",
					value: current[0] || 'CLAMP',
					onChange: (value) => {
						this.viewer.setElevationGradientRepeat(ElevationGradientRepeat[value]);
					}
				});
			}

			let onIntensityChange = () => {
				let gamma = material.intensityGamma;
				let contrast = material.intensityContrast;
				let brightness = material.intensityBrightness;

				updateIntensityRange();

				panel.find('#lblIntensityGamma').html(gamma.toFixed(2));
				panel.find('#lblIntensityContrast').html(contrast.toFixed(2));
				panel.find('#lblIntensityBrightness').html(brightness.toFixed(2));

				if (this.sldIntensityGamma) this.sldIntensityGamma.setValue(gamma);
				if (this.sldIntensityContrast) this.sldIntensityContrast.setValue(contrast);
				if (this.sldIntensityBrightness) this.sldIntensityBrightness.setValue(brightness);
			};

			let onRGBChange = () => {
				let gamma = material.rgbGamma;
				let contrast = material.rgbContrast;
				let brightness = material.rgbBrightness;

				panel.find('#lblRGBGamma').html(gamma.toFixed(2));
				panel.find('#lblRGBContrast').html(contrast.toFixed(2));
				panel.find('#lblRGBBrightness').html(brightness.toFixed(2));

				if (this.sldRGBGamma) this.sldRGBGamma.setValue(gamma);
				if (this.sldRGBContrast) this.sldRGBContrast.setValue(contrast);
				if (this.sldRGBBrightness) this.sldRGBBrightness.setValue(brightness);
			};

			this.addVolatileListener(material, "material_property_changed", updateExtraRange);
			this.addVolatileListener(material, "material_property_changed", updateHeightRange);
			this.addVolatileListener(material, "material_property_changed", onIntensityChange);
			this.addVolatileListener(material, "material_property_changed", onRGBChange);

			updateExtraRange();
			updateHeightRange();
			onIntensityChange();
			onRGBChange();
		}

	}

	

	setMeasurement(object){

		let TYPE = {
			DISTANCE: {panel: DistancePanel},
			AREA: {panel: AreaPanel},
			POINT: {panel: PointPanel},
			ANGLE: {panel: AnglePanel},
			HEIGHT: {panel: HeightPanel},
			PROFILE: {panel: ProfilePanel},
			VOLUME: {panel: VolumePanel},
			CIRCLE: {panel: CirclePanel},
			OTHER: {panel: PointPanel},
		};

		let getType = (measurement) => {
			if (measurement instanceof Measure) {
				if (measurement.showDistances && !measurement.showArea && !measurement.showAngles) {
					return TYPE.DISTANCE;
				} else if (measurement.showDistances && measurement.showArea && !measurement.showAngles) {
					return TYPE.AREA;
				} else if (measurement.maxMarkers === 1) {
					return TYPE.POINT;
				} else if (!measurement.showDistances && !measurement.showArea && measurement.showAngles) {
					return TYPE.ANGLE;
				} else if (measurement.showHeight) {
					return TYPE.HEIGHT;
				} else if (measurement.showCircle) {
					return TYPE.CIRCLE;
				} else {
					return TYPE.OTHER;
				}
			} else if (measurement instanceof Profile) {
				return TYPE.PROFILE;
			} else if (measurement instanceof Volume) {
				return TYPE.VOLUME;
			}
		};

		//this.container.html("measurement");

		let type = getType(object);
		let Panel = type.panel;

		let panel = new Panel(this.viewer, object, this);
		this.container.append(panel.elContent);
	}

	setCamera(camera){
		let panel = new CameraPanel(this.viewer, this);
		this.container.append(panel.elContent);
	}

	setAnnotation(annotation){
		let panel = new AnnotationPanel(this.viewer, this, annotation);
		this.container.append(panel.elContent);
	}

	setCameraAnimation(animation){
		let panel = new CameraAnimationPanel(this.viewer, this, animation)
		this.container.append(panel.elContent);
	}

}
