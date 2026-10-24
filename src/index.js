import jQuery from 'jquery';
import './styles/theme.css';
import 'jquery-ui-dist/jquery-ui.css';
import 'jstree/dist/themes/default/style.min.css';
import 'spectrum-colorpicker2/dist/spectrum.min.css';
import './viewer/potree.css';

if (typeof window !== 'undefined') {
	window.$ = window.jQuery = jQuery;
}

export * from './Potree.js';
export { jQuery, jQuery as $ };
export { FloatingToolbar } from './viewer/ui/FloatingToolbar.js';
export { icons, getIcon } from './viewer/ui/icons.js';
export { PotreeStore } from './viewer/store/PotreeStore.js';
