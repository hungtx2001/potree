import * as Copc from 'copc';

onmessage = async function (e) {
	const msg = e.data;
	try {
		if (msg.type === 'decompress') {
			const u = new Uint8Array(msg.buffer);
			const decompressed = await Copc.Las.PointData.decompressFile(u);
			postMessage({ status: 1, buffer: decompressed.buffer }, [decompressed.buffer]);
		}
	} catch (err) {
		postMessage({ status: 0, error: err.message });
	}
};