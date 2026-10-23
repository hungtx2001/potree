import jQuery from 'jquery';
import 'jquery-ui-dist/jquery-ui.css';
import 'jstree/dist/themes/default/style.min.css';
import 'spectrum-colorpicker2/dist/spectrum.min.css';
import './viewer/potree.css';

if (typeof window !== 'undefined') {
	window.$ = window.jQuery = jQuery;
}

export * from './Potree.js';
export { jQuery, jQuery as $ };
