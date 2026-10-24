import { ModernSlider } from "./ui/components/ModernSlider.js";

function addCommas(nStr){
	nStr += '';
	let x = nStr.split('.');
	let x1 = x[0];
	let x2 = x.length > 1 ? '.' + x[1] : '';
	let rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) {
		x1 = x1.replace(rgx, '$1' + ',' + '$2');
	}
	return x1 + x2;
};

function format(value){
	return addCommas(value.toFixed(3));
};

export class HierarchicalSlider{

	constructor(params = {}){
		this.element = document.createElement("div");

		this.labels = [];
		this.sliders = [];
		this.range = params.range != null ? params.range : [0, 1];
		this.slide = params.slide != null ? params.slide : null;
		this.step = params.step != null ? params.step : 0.0001;

		let levels = params.levels != null ? params.levels : 1;

		for(let level = 0; level < levels; level++){
			this.addLevel();
		}
	}

	setRange(range){
		this.range = [...range];

		if (this.sliders.length > 0) {
			const rootSlider = this.sliders[0];
			rootSlider.setOption('min', range[0]);
			rootSlider.setOption('max', range[1]);
		}

		for(let i = 1; i < this.sliders.length; i++){
			let parentSlider = this.sliders[i - 1];
			let slider = this.sliders[i];

			let parentValues = parentSlider.getValues();
			slider.setOption('min', parentValues[0]);
			slider.setOption('max', parentValues[1]);
		}
		
		this.updateLabels();
	}

	setValues(values){
		for(let slider of this.sliders){
			slider.setValues([...values]);
		}

		this.updateLabels();
	}

	addLevel(){
		const elLevel = document.createElement("li");
		const elRange = document.createTextNode("Range: ");
		const label = document.createElement("span");
		const sliderContainer = document.createElement("div");

		let level = this.sliders.length;
		let [min, max] = [0, 0];

		if(this.sliders.length === 0){
			[min, max] = this.range;
		}else{
			let parentSlider = this.sliders[this.sliders.length - 1];
			[min, max] = parentSlider.getValues();
		}
		
		const modernSlider = new ModernSlider({
			container: sliderContainer,
			range: true, 
			min: min, 
			max: max, 
			step: this.step, 
			values: [min, max],
			slide: (event, ui) => {
				const currentValues = ui.values || [ui.value, ui.value];
				// set all descendants to same range
				let levels = this.sliders.length;
				for(let i = level + 1; i < levels; i++){
					let descendant = this.sliders[i];
					descendant.setOption('min', currentValues[0]);
					descendant.setOption('max', currentValues[1]);
					descendant.setValues([...currentValues]);
				}

				if(this.slide){
					this.slide({
						target: this, 
						range: this.range,
						values: [...currentValues],
					});
				}

				this.updateLabels();
			},
		});

		elLevel.append(elRange, label, sliderContainer);

		this.sliders.push(modernSlider);
		this.labels.push(label);
		this.element.append(elLevel);

		this.updateLabels();
	}

	removeLevel(){

	}

	updateSliders(){

	}

	updateLabels(){
		let levels = this.sliders.length;

		for(let i = 0; i < levels; i++){
			let slider = this.sliders[i];
			let label = this.labels[i];

			let values = slider.getValues();
			let min = values[0] !== undefined ? values[0] : 0;
			let max = values[1] !== undefined ? values[1] : min;
			let strMin = format(min);
			let strMax = format(max);
			let strLabel = `${strMin} to ${strMax}`;

			label.innerHTML = strLabel;
		}
	}
}
