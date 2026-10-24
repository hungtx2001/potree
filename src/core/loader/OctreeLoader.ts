import * as THREE from 'three';
import { PointAttribute, PointAttributes, PointAttributeTypes, PointAttributeType } from './PointAttributes.js';
import { OctreeGeometry, OctreeGeometryNode } from './OctreeGeometry.js';
import { workerPool, runtime } from '../runtime/runtime.js';

export class NodeLoader {
	public url: string;
	public metadata: any;
	public attributes?: PointAttributes;
	public scale?: any;
	public offset?: THREE.Vector3;

	constructor(url: string) {
		this.url = url;
	}

	async load(node: OctreeGeometryNode): Promise<void> {
		if (node.loaded || node.loading) {
			return;
		}

		node.loading = true;
		runtime.numNodesLoading++;

		try {
			if (node.nodeType === 2) {
				await this.loadHierarchy(node);
			}

			const { byteOffset, byteSize } = node;
			const urlOctree = `${this.url}/../octree.bin`;

			const first = BigInt(byteOffset);
			const last = BigInt(byteOffset) + BigInt(byteSize) - 1n;

			let buffer: ArrayBuffer;

			if (BigInt(byteSize) === 0n) {
				buffer = new ArrayBuffer(0);
				console.warn(`loaded node with 0 bytes: ${node.name}`);
			} else {
				const response = await fetch(urlOctree, {
					headers: {
						'content-type': 'multipart/byteranges',
						'Range': `bytes=${first}-${last}`,
					},
				});
				buffer = await response.arrayBuffer();
			}

			let workerPath: string;
			if (this.metadata && this.metadata.encoding === 'BROTLI') {
				workerPath = runtime.scriptPath + '/workers/2.0/DecoderWorker_brotli.js';
			} else {
				workerPath = runtime.scriptPath + '/workers/2.0/DecoderWorker.js';
			}

			const worker = workerPool.getWorker(workerPath);

			worker.onmessage = function (e: any) {
				const data = e.data;
				const buffers = data.attributeBuffers;

				workerPool.returnWorker(workerPath, worker);

				const geometry = new THREE.BufferGeometry();

				for (const property in buffers) {
					const buffer = buffers[property].buffer;

					if (property === 'position') {
						geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(buffer), 3));
					} else if (property === 'rgba') {
						geometry.setAttribute('rgba', new THREE.BufferAttribute(new Uint8Array(buffer), 4, true));
					} else if (property === 'NORMAL') {
						geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(buffer), 3));
					} else if (property === 'INDICES') {
						const bufferAttribute = new THREE.BufferAttribute(new Uint8Array(buffer), 4);
						bufferAttribute.normalized = true;
						geometry.setAttribute('indices', bufferAttribute);
					} else {
						const bufferAttribute = new THREE.BufferAttribute(new Float32Array(buffer), 1);
						const batchAttribute = buffers[property].attribute;
						(bufferAttribute as any).potree = {
							offset: buffers[property].offset,
							scale: buffers[property].scale,
							preciseBuffer: buffers[property].preciseBuffer,
							range: batchAttribute ? batchAttribute.range : undefined,
						};
						geometry.setAttribute(property, bufferAttribute);
					}
				}

				node.density = data.density;
				node.geometry = geometry;
				node.loaded = true;
				node.loading = false;
				runtime.numNodesLoading--;
			};

			const pointAttributes = node.octreeGeometry.pointAttributes;
			const scale = node.octreeGeometry.scale;

			const box = node.boundingBox;
			const min = node.octreeGeometry.offset.clone().add(box.min);
			const size = box.max.clone().sub(box.min);
			const max = min.clone().add(size);
			const numPoints = node.numPoints;
			const offset = node.octreeGeometry.loader ? node.octreeGeometry.loader.offset : new THREE.Vector3();

			const message = {
				name: node.name,
				buffer: buffer,
				pointAttributes: pointAttributes,
				scale: scale,
				min: min,
				max: max,
				size: size,
				offset: offset,
				numPoints: numPoints,
			};

			worker.postMessage(message, [message.buffer]);
		} catch (e) {
			node.loaded = false;
			node.loading = false;
			runtime.numNodesLoading--;

			console.warn(`failed to load ${node.name}`, e);
		}
	}

	parseHierarchy(node: OctreeGeometryNode, buffer: ArrayBuffer): void {
		const view = new DataView(buffer);
		const bytesPerNode = 22;
		const numNodes = buffer.byteLength / bytesPerNode;

		const octree = node.octreeGeometry;
		const nodes: OctreeGeometryNode[] = new Array(numNodes);
		nodes[0] = node;
		let nodePos = 1;

		for (let i = 0; i < numNodes; i++) {
			const current = nodes[i];
			if (!current) continue;

			const type = view.getUint8(i * bytesPerNode + 0);
			const childMask = view.getUint8(i * bytesPerNode + 1);
			const numPoints = view.getUint32(i * bytesPerNode + 2, true);
			const byteOffset = view.getBigInt64(i * bytesPerNode + 6, true);
			const byteSize = view.getBigInt64(i * bytesPerNode + 14, true);

			if (current.nodeType === 2) {
				current.byteOffset = byteOffset;
				current.byteSize = byteSize;
				current.numPoints = numPoints;
			} else if (type === 2) {
				current.hierarchyByteOffset = byteOffset;
				current.hierarchyByteSize = byteSize;
				current.numPoints = numPoints;
			} else {
				current.byteOffset = byteOffset;
				current.byteSize = byteSize;
				current.numPoints = numPoints;
			}

			if (current.byteSize === 0n) {
				current.numPoints = 0;
			}

			current.nodeType = type;

			if (current.nodeType === 2) {
				continue;
			}

			for (let childIndex = 0; childIndex < 8; childIndex++) {
				const childExists = ((1 << childIndex) & childMask) !== 0;
				if (!childExists) continue;

				const childName = current.name + childIndex;
				const childAABB = createChildAABB(current.boundingBox, childIndex);
				const child = new OctreeGeometryNode(childName, octree, childAABB);
				child.name = childName;
				child.spacing = current.spacing / 2;
				child.level = current.level + 1;

				current.children[childIndex] = child;
				child.parent = current;

				nodes[nodePos] = child;
				nodePos++;
			}
		}
	}

	async loadHierarchy(node: OctreeGeometryNode): Promise<void> {
		const { hierarchyByteOffset, hierarchyByteSize } = node;
		const hierarchyPath = `${this.url}/../hierarchy.bin`;

		const first = BigInt(hierarchyByteOffset);
		const last = first + BigInt(hierarchyByteSize) - 1n;

		const response = await fetch(hierarchyPath, {
			headers: {
				'content-type': 'multipart/byteranges',
				'Range': `bytes=${first}-${last}`,
			},
		});

		const buffer = await response.arrayBuffer();
		this.parseHierarchy(node, buffer);
	}
}

const tmpVec3 = new THREE.Vector3();
function createChildAABB(aabb: THREE.Box3, index: number): THREE.Box3 {
	const min = aabb.min.clone();
	const max = aabb.max.clone();
	const size = tmpVec3.subVectors(max, min);

	if ((index & 0b0001) > 0) {
		min.z += size.z / 2;
	} else {
		max.z -= size.z / 2;
	}

	if ((index & 0b0010) > 0) {
		min.y += size.y / 2;
	} else {
		max.y -= size.y / 2;
	}

	if ((index & 0b0100) > 0) {
		min.x += size.x / 2;
	} else {
		max.x -= size.x / 2;
	}

	return new THREE.Box3(min, max);
}

const typenameTypeattributeMap: { [key: string]: PointAttributeType } = {
	'double': PointAttributeTypes.DATA_TYPE_DOUBLE,
	'float': PointAttributeTypes.DATA_TYPE_FLOAT,
	'int8': PointAttributeTypes.DATA_TYPE_INT8,
	'uint8': PointAttributeTypes.DATA_TYPE_UINT8,
	'int16': PointAttributeTypes.DATA_TYPE_INT16,
	'uint16': PointAttributeTypes.DATA_TYPE_UINT16,
	'int32': PointAttributeTypes.DATA_TYPE_INT32,
	'uint32': PointAttributeTypes.DATA_TYPE_UINT32,
	'int64': PointAttributeTypes.DATA_TYPE_INT64,
	'uint64': PointAttributeTypes.DATA_TYPE_UINT64,
};

export class OctreeLoader {
	static parseAttributes(jsonAttributes: any[]): PointAttributes {
		const attributes = new PointAttributes();
		const replacements: { [key: string]: string } = {
			'rgb': 'rgba',
		};

		for (const jsonAttribute of jsonAttributes) {
			const { name, numElements, min, max } = jsonAttribute;
			const type = typenameTypeattributeMap[jsonAttribute.type];
			const potreeAttributeName = replacements[name] ? replacements[name] : name;

			const attribute = new PointAttribute(potreeAttributeName, type, numElements);

			if (numElements === 1) {
				attribute.range = [min[0], max[0]];
			} else {
				attribute.range = [min, max];
			}

			if (name === 'gps-time') {
				if (attribute.range[0] === attribute.range[1]) {
					attribute.range[1] += 1;
				}
			}

			attribute.initialRange = attribute.range;
			attributes.add(attribute);
		}

		const hasNormals =
			attributes.attributes.find((a) => a.name === 'NormalX') !== undefined &&
			attributes.attributes.find((a) => a.name === 'NormalY') !== undefined &&
			attributes.attributes.find((a) => a.name === 'NormalZ') !== undefined;

		if (hasNormals) {
			const vector = {
				name: 'NORMAL',
				attributes: ['NormalX', 'NormalY', 'NormalZ'],
			};
			attributes.addVector(vector);
		}

		return attributes;
	}

	static async load(url: string): Promise<{ geometry: OctreeGeometry }> {
		const response = await fetch(url);
		const metadata = await response.json();

		const attributes = OctreeLoader.parseAttributes(metadata.attributes);

		const loader = new NodeLoader(url);
		loader.metadata = metadata;
		loader.attributes = attributes;
		loader.scale = metadata.scale;
		loader.offset = new THREE.Vector3().fromArray(metadata.offset || [0, 0, 0]);

		const octree = new OctreeGeometry();
		octree.url = url;
		octree.spacing = metadata.spacing;
		octree.scale = metadata.scale;

		const min = new THREE.Vector3(...metadata.boundingBox.min);
		const max = new THREE.Vector3(...metadata.boundingBox.max);
		const boundingBox = new THREE.Box3(min, max);

		const offset = min.clone();
		boundingBox.min.sub(offset);
		boundingBox.max.sub(offset);

		octree.projection = metadata.projection;
		octree.boundingBox = boundingBox;
		octree.tightBoundingBox = boundingBox.clone();
		octree.boundingSphere = boundingBox.getBoundingSphere(new THREE.Sphere());
		octree.tightBoundingSphere = boundingBox.getBoundingSphere(new THREE.Sphere());
		octree.offset = offset;
		octree.pointAttributes = OctreeLoader.parseAttributes(metadata.attributes);
		octree.loader = loader;

		const root = new OctreeGeometryNode('r', octree, boundingBox);
		root.level = 0;
		root.nodeType = 2;
		root.hierarchyByteOffset = 0n;
		root.hierarchyByteSize = BigInt(metadata.hierarchy.firstChunkSize);
		root.hasChildren = false;
		root.spacing = octree.spacing;
		root.byteOffset = 0;

		octree.root = root;
		loader.load(root);

		return { geometry: octree };
	}
}
