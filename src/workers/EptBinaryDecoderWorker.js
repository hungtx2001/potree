import {parseEpt} from "../loader/ept/ParseBuffer.js";

onmessage = function(event) {
	parseEpt(event);
};

