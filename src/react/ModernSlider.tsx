import React, { useState } from 'react';
import type { SliderProps } from './types.js';

export const ModernSlider: React.FC<SliderProps> = ({
	min = 0,
	max = 100,
	step = 1,
	value: controlledValue,
	defaultValue,
	values: controlledValues,
	defaultValues,
	range = false,
	onChange,
	onSlide,
	className = '',
}) => {
	const isRange = range || controlledValues !== undefined || defaultValues !== undefined;

	// Single slider state
	const [singleVal, setSingleVal] = useState<number>(
		controlledValue !== undefined ? controlledValue : (defaultValue ?? min)
	);

	// Range slider state
	const [rangeVals, setRangeVals] = useState<[number, number]>(
		controlledValues !== undefined ? controlledValues : (defaultValues ?? [min, max])
	);

	const activeSingle = controlledValue !== undefined ? controlledValue : singleVal;
	const activeRange = controlledValues !== undefined ? controlledValues : rangeVals;

	const rangeSpan = max - min || 1;

	// Calculate track fill style
	let fillStyle: React.CSSProperties;
	if (isRange) {
		const left = Math.max(0, Math.min(100, ((activeRange[0] - min) / rangeSpan) * 100));
		const right = Math.max(0, Math.min(100, ((activeRange[1] - min) / rangeSpan) * 100));
		fillStyle = {
			left: `${left}%`,
			width: `${Math.max(0, right - left)}%`,
		};
	} else {
		const percent = Math.max(0, Math.min(100, ((activeSingle - min) / rangeSpan) * 100));
		fillStyle = {
			left: '0%',
			width: `${percent}%`,
		};
	}

	const handleSingleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const num = parseFloat(e.target.value);
		if (controlledValue === undefined) {
			setSingleVal(num);
		}
		onSlide?.(num);
		onChange?.(num);
	};

	const handleRangeChange = (index: 0 | 1, e: React.ChangeEvent<HTMLInputElement>) => {
		const num = parseFloat(e.target.value);
		let next: [number, number];

		if (index === 0) {
			const clamped = Math.min(num, activeRange[1]);
			next = [clamped, activeRange[1]];
		} else {
			const clamped = Math.max(num, activeRange[0]);
			next = [activeRange[0], clamped];
		}

		if (controlledValues === undefined) {
			setRangeVals(next);
		}
		onSlide?.(next);
		onChange?.(next);
	};

	return (
		<div className={`potree-slider-wrapper ${isRange ? 'potree-slider-range' : ''} ${className}`}>
			<div className="potree-slider-track">
				<div className="potree-slider-fill" style={fillStyle} />
			</div>

			{isRange ? (
				<>
					<input
						type="range"
						className="potree-range-input potree-range-min"
						min={min}
						max={max}
						step={step}
						value={activeRange[0]}
						onChange={(e) => handleRangeChange(0, e)}
					/>
					<input
						type="range"
						className="potree-range-input potree-range-max"
						min={min}
						max={max}
						step={step}
						value={activeRange[1]}
						onChange={(e) => handleRangeChange(1, e)}
					/>
				</>
			) : (
				<input
					type="range"
					className="potree-range-input"
					min={min}
					max={max}
					step={step}
					value={activeSingle}
					onChange={handleSingleChange}
				/>
			)}
		</div>
	);
};
