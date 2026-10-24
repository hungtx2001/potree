import React, { useState } from 'react';
import type { ColorPickerProps } from './types.js';

export const ColorPicker: React.FC<ColorPickerProps> = ({
	value: controlledValue,
	defaultValue = '#38bdf8',
	onChange,
	className = '',
}) => {
	const [internalColor, setInternalColor] = useState<string>(defaultValue);
	const activeColor = controlledValue !== undefined ? controlledValue : internalColor;

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newHex = e.target.value;
		if (controlledValue === undefined) {
			setInternalColor(newHex);
		}
		onChange?.(newHex);
	};

	return (
		<div className={`potree-colorpicker-wrapper ${className}`}>
			<label
				className="potree-colorpicker-swatch"
				style={{ backgroundColor: activeColor }}
			>
				<input
					type="color"
					className="potree-colorpicker-input"
					value={activeColor}
					onChange={handleChange}
				/>
			</label>
		</div>
	);
};
