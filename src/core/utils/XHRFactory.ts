export interface CustomHeader {
	header: string | null;
	value: string | null;
}

export interface XHRConfig {
	withCredentials: boolean;
	customHeaders: CustomHeader[];
}

export const XHRFactory = {
	config: {
		withCredentials: false,
		customHeaders: [
			{ header: null, value: null }
		]
	} as XHRConfig,

	createXMLHttpRequest: function (): XMLHttpRequest {
		const xhr = new XMLHttpRequest();

		if (this.config.customHeaders &&
			Array.isArray(this.config.customHeaders) &&
			this.config.customHeaders.length > 0) {
			const baseOpen = xhr.open;
			const customHeaders = this.config.customHeaders;
			xhr.open = function (...args: any[]) {
				(baseOpen as any).apply(this, args);
				customHeaders.forEach((customHeader) => {
					if (customHeader.header && customHeader.value) {
						xhr.setRequestHeader(customHeader.header, customHeader.value);
					}
				});
			};
		}

		return xhr;
	}
};
