import jQuery from 'jquery';
import './styles/theme.css';
import './viewer/potree.css';

import { ToggleGroup } from './viewer/ui/components/ToggleGroup.js';
import { ModernSlider } from './viewer/ui/components/ModernSlider.js';
import { ModernColorPicker } from './viewer/ui/components/ModernColorPicker.js';
import { SceneTree } from './viewer/ui/components/SceneTree.js';

// Auto-install modern component shims for jQuery
ToggleGroup.installJQueryPlugin(jQuery);
ModernSlider.installJQueryPlugin(jQuery);
ModernColorPicker.installJQueryPlugin(jQuery);
SceneTree.installJQueryPlugin(jQuery);

if (typeof window !== 'undefined') {
	window.$ = window.jQuery = jQuery;
}

export * from './Potree.js';
export { jQuery, jQuery as $ };
export { FloatingToolbar } from './viewer/ui/FloatingToolbar.js';
export { icons, getIcon } from './viewer/ui/icons.js';
export { PotreeStore } from './viewer/store/PotreeStore.js';
export { ToggleGroup, ModernSlider, ModernColorPicker, SceneTree };
