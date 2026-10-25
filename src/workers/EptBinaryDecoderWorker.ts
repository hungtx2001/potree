import { parseEpt } from "../core/loader/ept/ParseBuffer.js";

onmessage = function(event) {
	parseEpt(event);
};

