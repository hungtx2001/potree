import React, { useState } from 'react';
import type { ToggleGroupProps } from './types.js';

export const ToggleGroup: React.FC<ToggleGroupProps> = ({
	options,
	value: controlledValue,
	defaultValue,
	title,
	onChange,
	className = '',
}) => {
	const [internalValue, setInternalValue] = useState<string>(
		defaultValue || (options[0] ? options[0].value : '')
	);

	const activeValue = controlledValue !== undefined ? controlledValue : internalValue;

	const handleSelect = (val: string) => {
		if (controlledValue === undefined) {
			setInternalValue(val);
		}
		if (onChange) {
			onChange(val);
		}
	};

	return (
		<div className={`potree-toggle-group ${className}`}>
			{title && <div className="potree-toggle-group-title">{title}</div>}
			<div className="potree-toggle-track" role="radiogroup">
				{options.map((opt) => {
					const isActive = opt.value === activeValue;
					return (
						<button
							key={opt.value}
							type="button"
							className={`potree-toggle-item ${isActive ? 'active' : ''}`}
							role="radio"
							aria-checked={isActive}
							onClick={() => handleSelect(opt.value)}
						>
							{opt.icon && <span className="potree-toggle-icon">{opt.icon}</span>}
							<span className="potree-toggle-label">{opt.label}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
};
