import * as THREE from 'three';
import { PointCloudOctreeGeometry, PointCloudOctreeGeometryNode } from '../octree/PointCloudOctreeGeometry.js';
import { Version } from '../utils/Version.js';
import { XHRFactory } from '../utils/XHRFactory.js';
import { BinaryLoader } from './BinaryLoader.js';
import { Utils } from '../utils/Utils.js';
import { PointAttribute, PointAttributes, PointAttributeTypes, PointAttributeType } from './PointAttributes.js';

function parseAttributes(cloudjs: any): PointAttributes {
	const version = new Version(cloudjs.version);

	const replacements: { [key: string]: string } = {
		'COLOR_PACKED': 'rgba',
		'RGBA': 'rgba',
		'INTENSITY': 'intensity',
		'CLASSIFICATION': 'classification',
		'GPS_TIME': 'gps-time',
	};

	const replaceOldNames = (old: string) => {
		return replacements[old] || old;
	};

	const pointAttributes: any[] = [];
	if (version.upTo('1.7')) {
		for (const attributeName of cloudjs.pointAttributes) {
			const oldAttribute = (PointAttribute as any)[attributeName];
			if (oldAttribute) {
				const attribute = {
					name: oldAttribute.name,
					size: oldAttribute.byteSize,
					elements: oldAttribute.numElements,
					elementSize: oldAttribute.byteSize / oldAttribute.numElements,
					type: oldAttribute.type.name,
					description: '',
				};
				pointAttributes.push(attribute);
			}
		}
	} else {
		pointAttributes.push(...cloudjs.pointAttributes);
	}

	const attributes = new PointAttributes();
	const typeConversion: { [key: string]: PointAttributeType } = {
		int8: PointAttributeTypes.DATA_TYPE_INT8,
		int16: PointAttributeTypes.DATA_TYPE_INT16,
		int32: PointAttributeTypes.DATA_TYPE_INT32,
		int64: PointAttributeTypes.DATA_TYPE_INT64,
		uint8: PointAttributeTypes.DATA_TYPE_UINT8,
		uint16: PointAttributeTypes.DATA_TYPE_UINT16,
		uint32: PointAttributeTypes.DATA_TYPE_UINT32,
		uint64: PointAttributeTypes.DATA_TYPE_UINT64,
		double: PointAttributeTypes.DATA_TYPE_DOUBLE,
		float: PointAttributeTypes.DATA_TYPE_FLOAT,
	};

	for (const jsAttribute of pointAttributes) {
		const name = replaceOldNames(jsAttribute.name);
		const type = typeConversion[jsAttribute.type];
		const numElements = jsAttribute.elements;

		const attribute = new PointAttribute(name, type, numElements);
		attributes.add(attribute);
	}

	const hasNormals =
		pointAttributes.find((a) => a.name === 'NormalX') !== undefined &&
		pointAttributes.find((a) => a.name === 'NormalY') !== undefined &&
		pointAttributes.find((a) => a.name === 'NormalZ') !== undefined;

	if (hasNormals) {
		const vector = {
			name: 'NORMAL',
			attributes: ['NormalX', 'NormalY', 'NormalZ'],
		};
		attributes.addVector(vector);
	}

	return attributes;
}

export class POCLoader {
	static load(url: string, callback?: (geometry: PointCloudOctreeGeometry | null) => void): void {
		try {
			const pco = new PointCloudOctreeGeometry();
			pco.url = url;
			const xhr = XHRFactory.createXMLHttpRequest();
			xhr.open('GET', url, true);

			xhr.onreadystatechange = function () {
				if (xhr.readyState === 4 && (xhr.status === 200 || xhr.status === 0)) {
					const fMno = JSON.parse(xhr.responseText);
					const version = new Version(fMno.version);

					if (fMno.octreeDir.indexOf('http') === 0) {
						pco.octreeDir = fMno.octreeDir;
					} else {
						pco.octreeDir = url + '/../' + fMno.octreeDir;
					}

					pco.spacing = fMno.spacing;
					pco.hierarchyStepSize = fMno.hierarchyStepSize;
					pco.pointAttributes = fMno.pointAttributes;

					const min = new THREE.Vector3(fMno.boundingBox.lx, fMno.boundingBox.ly, fMno.boundingBox.lz);
					const max = new THREE.Vector3(fMno.boundingBox.ux, fMno.boundingBox.uy, fMno.boundingBox.uz);
					const boundingBox = new THREE.Box3(min, max);
					const tightBoundingBox = boundingBox.clone();

					if (fMno.tightBoundingBox) {
						tightBoundingBox.min.copy(new THREE.Vector3(fMno.tightBoundingBox.lx, fMno.tightBoundingBox.ly, fMno.tightBoundingBox.lz));
						tightBoundingBox.max.copy(new THREE.Vector3(fMno.tightBoundingBox.ux, fMno.tightBoundingBox.uy, fMno.tightBoundingBox.uz));
					}

					const offset = min.clone();
					boundingBox.min.sub(offset);
					boundingBox.max.sub(offset);
					tightBoundingBox.min.sub(offset);
					tightBoundingBox.max.sub(offset);

					pco.projection = fMno.projection;
					pco.boundingBox = boundingBox;
					pco.tightBoundingBox = tightBoundingBox;
					pco.boundingSphere = boundingBox.getBoundingSphere(new THREE.Sphere());
					pco.tightBoundingSphere = tightBoundingBox.getBoundingSphere(new THREE.Sphere());
					pco.offset = offset;

					pco.loader = new BinaryLoader(fMno.version, boundingBox, fMno.scale);
					pco.pointAttributes = parseAttributes(fMno);

					const nodes: { [key: string]: PointCloudOctreeGeometryNode } = {};

					{
						const name = 'r';
						const root = new PointCloudOctreeGeometryNode(name, pco, boundingBox);
						root.level = 0;
						root.hasChildren = true;
						root.spacing = pco.spacing;
						if (version.upTo('1.5')) {
							root.numPoints = fMno.hierarchy[0][1];
						} else {
							root.numPoints = 0;
						}
						pco.root = root;
						pco.root.load();
						nodes[name] = root;
					}

					if (version.upTo('1.4')) {
						for (let i = 1; i < fMno.hierarchy.length; i++) {
							const name = fMno.hierarchy[i][0];
							const numPoints = fMno.hierarchy[i][1];
							const index = parseInt(name.charAt(name.length - 1), 10);
							const parentName = name.substring(0, name.length - 1);
							const parentNode = nodes[parentName];
							const level = name.length - 1;
							const nodeAABB = Utils.createChildAABB(parentNode.boundingBox, index);

							const node = new PointCloudOctreeGeometryNode(name, pco, nodeAABB);
							node.level = level;
							node.numPoints = numPoints;
							node.spacing = pco.spacing / Math.pow(2, level);
							parentNode.addChild(node);
							nodes[name] = node;
						}
					}

					pco.nodes = nodes;
					if (callback) callback(pco);
				}
			};

			xhr.send(null);
		} catch (e) {
			console.warn("Loading failed: '" + url + "'", e);
			if (callback) callback(null);
		}
	}
}
