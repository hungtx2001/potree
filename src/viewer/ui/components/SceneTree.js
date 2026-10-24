/**
 * Modern Vanilla JS Scene Tree Component
 * Replaces legacy jstree with a sleek, responsive, glassmorphism tree view.
 * Zero external dependencies. Uses crisp SVG icons for visibility toggle, folder expand, and selection.
 */

import { icons } from '../icons.js';

export class SceneTree {
	/**
	 * @param {Object} options
	 * @param {HTMLElement|string} [options.container]
	 * @param {Function} [options.onSelect]
	 * @param {Function} [options.onDeselect]
	 * @param {Function} [options.onToggleVisibility]
	 * @param {Function} [options.onDoubleClick]
	 * @param {Function} [options.onDelete]
	 */
	constructor(options = {}) {
		this.options = options;
		this.nodes = new Map(); // id -> nodeData
		this.selectedNodeId = null;

		this.element = this._render();
		if (options.container) {
			const target = typeof options.container === 'string'
				? document.querySelector(options.container)
				: (options.container.jquery ? options.container[0] : options.container);
			if (target) {
				target.innerHTML = '';
				target.appendChild(this.element);
			}
		}
	}

	_render() {
		const root = document.createElement('div');
		root.className = 'potree-scene-tree';
		return root;
	}

	/**
	 * Creates a node in the tree
	 * @param {string} parentId - '#' for root
	 * @param {Object} data - { id, text, icon, data }
	 * @returns {string} nodeId
	 */
	createNode(parentId, data = {}) {
		const id = data.id || `tree_node_${Math.random().toString(36).substr(2, 9)}`;
		const text = data.text || '';
		const icon = data.icon || null;
		const userData = data.data || null;

		const node = {
			id,
			parentId: parentId === '#' ? null : parentId,
			text,
			icon,
			data: userData,
			checked: true,
			children: [],
			element: null,
			childrenContainer: null
		};

		this.nodes.set(id, node);

		// DOM creation
		const nodeEl = document.createElement('div');
		nodeEl.className = 'potree-tree-node';
		nodeEl.dataset.nodeId = id;

		const header = document.createElement('div');
		header.className = 'potree-tree-header';

		// Expand / collapse chevron
		const toggleEl = document.createElement('span');
		toggleEl.className = 'potree-tree-toggle';
		toggleEl.innerHTML = icons.chevronDown;
		header.appendChild(toggleEl);

		// Visibility checkbox / eye icon
		const eyeEl = document.createElement('button');
		eyeEl.type = 'button';
		eyeEl.className = 'potree-tree-eye active';
		eyeEl.title = 'Toggle Visibility';
		eyeEl.innerHTML = icons.eye;
		eyeEl.addEventListener('click', (e) => {
			e.stopPropagation();
			this.toggleNodeVisibility(id);
		});
		header.appendChild(eyeEl);

		// Node Icon
		const iconEl = document.createElement('span');
		iconEl.className = 'potree-tree-icon';
		if (icon) {
			if (typeof icon === 'string' && (icon.endsWith('.svg') || icon.endsWith('.png'))) {
				const img = document.createElement('img');
				img.src = icon;
				img.alt = '';
				iconEl.appendChild(img);
			} else {
				iconEl.innerHTML = icon;
			}
		} else {
			iconEl.innerHTML = icons.folder;
		}
		header.appendChild(iconEl);

		// Label
		const labelEl = document.createElement('span');
		labelEl.className = 'potree-tree-label';
		labelEl.innerHTML = text;
		header.appendChild(labelEl);

		// Actions (delete)
		const actionsEl = document.createElement('span');
		actionsEl.className = 'potree-tree-actions';
		header.appendChild(actionsEl);

		// Children container
		const childrenContainer = document.createElement('div');
		childrenContainer.className = 'potree-tree-children';

		toggleEl.addEventListener('click', (e) => {
			e.stopPropagation();
			const isCollapsed = childrenContainer.classList.toggle('collapsed');
			toggleEl.innerHTML = isCollapsed ? icons.chevronRight : icons.chevronDown;
		});

		header.addEventListener('click', (e) => {
			this.selectNode(id);
		});

		header.addEventListener('dblclick', (e) => {
			if (e.target.closest('.potree-tree-eye') || e.target.closest('.potree-tree-toggle')) return;
			if (typeof this.options.onDoubleClick === 'function') {
				this.options.onDoubleClick(node);
			}
			this.element.dispatchEvent(new CustomEvent('dblclick_node', { detail: { node } }));
		});

		nodeEl.appendChild(header);
		nodeEl.appendChild(childrenContainer);

		node.element = nodeEl;
		node.header = header;
		node.toggleEl = toggleEl;
		node.eyeEl = eyeEl;
		node.childrenContainer = childrenContainer;

		if (!node.parentId) {
			this.element.appendChild(nodeEl);
		} else {
			const parentNode = this.nodes.get(node.parentId);
			if (parentNode) {
				parentNode.children.push(id);
				parentNode.childrenContainer.appendChild(nodeEl);
				parentNode.toggleEl.style.visibility = 'visible';
			} else {
				this.element.appendChild(nodeEl);
			}
		}

		if (node.children.length === 0) {
			toggleEl.style.visibility = 'hidden';
		}

		this.element.dispatchEvent(new CustomEvent('create_node', { detail: { node } }));
		return id;
	}

	toggleNodeVisibility(id) {
		const node = this.nodes.get(id);
		if (!node) return;
		this.setNodeVisibility(id, !node.checked);
	}

	setNodeVisibility(id, visible) {
		const node = this.nodes.get(id);
		if (!node) return;
		node.checked = visible;
		if (visible) {
			node.eyeEl.classList.add('active');
			node.eyeEl.innerHTML = icons.eye;
			if (node.data) node.data.visible = true;
			this.element.dispatchEvent(new CustomEvent('check_node', { detail: { node } }));
			if (typeof this.options.onToggleVisibility === 'function') {
				this.options.onToggleVisibility(node, true);
			}
		} else {
			node.eyeEl.classList.remove('active');
			node.eyeEl.innerHTML = icons.eyeOff;
			if (node.data) node.data.visible = false;
			this.element.dispatchEvent(new CustomEvent('uncheck_node', { detail: { node } }));
			if (typeof this.options.onToggleVisibility === 'function') {
				this.options.onToggleVisibility(node, false);
			}
		}
	}

	checkNode(id) {
		this.setNodeVisibility(id, true);
	}

	uncheckNode(id) {
		this.setNodeVisibility(id, false);
	}

	selectNode(id) {
		if (this.selectedNodeId === id) return;

		this.deselectAll();
		const node = this.nodes.get(id);
		if (!node) return;

		this.selectedNodeId = id;
		node.header.classList.add('selected');

		if (typeof this.options.onSelect === 'function') {
			this.options.onSelect(node);
		}
		this.element.dispatchEvent(new CustomEvent('select_node', { detail: { node } }));
	}

	deselectAll() {
		if (this.selectedNodeId) {
			const prev = this.nodes.get(this.selectedNodeId);
			if (prev && prev.header) {
				prev.header.classList.remove('selected');
			}
			if (typeof this.options.onDeselect === 'function') {
				this.options.onDeselect(prev);
			}
			this.element.dispatchEvent(new CustomEvent('deselect_node', { detail: { node: prev } }));
			this.selectedNodeId = null;
		}
	}

	deleteNode(id) {
		const node = this.nodes.get(id);
		if (!node) return;

		if (this.selectedNodeId === id) {
			this.deselectAll();
		}

		// Recursively remove children
		[...node.children].forEach(childId => this.deleteNode(childId));

		if (node.parentId) {
			const parent = this.nodes.get(node.parentId);
			if (parent) {
				parent.children = parent.children.filter(cid => cid !== id);
				if (parent.children.length === 0) {
					parent.toggleEl.style.visibility = 'hidden';
				}
			}
		}

		if (node.element && node.element.parentNode) {
			node.element.parentNode.removeChild(node.element);
		}

		this.nodes.delete(id);

		if (typeof this.options.onDelete === 'function') {
			this.options.onDelete(node);
		}
		this.element.dispatchEvent(new CustomEvent('delete_node', { detail: { node } }));
	}

	getNode(id) {
		return this.nodes.get(id) || null;
	}

	getJson(id) {
		const node = this.nodes.get(id);
		if (!node) return null;
		return {
			id: node.id,
			text: node.text,
			data: node.data,
			children: node.children.map(cid => this.getJson(cid))
		};
	}

	openAll() {
		this.nodes.forEach(n => {
			if (n.childrenContainer) {
				n.childrenContainer.classList.remove('collapsed');
				if (n.toggleEl) n.toggleEl.innerHTML = icons.chevronDown;
			}
		});
	}

	/**
	 * Installs seamless drop-in jQuery plugin for jstree
	 * Allows legacy sidebar code using $(...).jstree(...) to work directly with SceneTree!
	 * @param {Object} $ - jQuery instance
	 */
	static installJQueryPlugin($) {
		if (!$ || !$.fn) return;

		$.jstree = {
			reference: function(idOrEl) {
				const dom = (typeof idOrEl === 'string')
					? (document.getElementById(idOrEl) || document.querySelector(idOrEl))
					: (idOrEl && idOrEl.jquery ? idOrEl[0] : idOrEl);
				if (!dom) return null;
				const treeEl = dom.closest('.potree-scene-tree') || dom.querySelector('.potree-scene-tree');
				return treeEl && treeEl._potreeSceneTree ? treeEl._potreeSceneTree.getJQueryProxy() : null;
			}
		};

		$.fn.jstree = function(...args) {
			if (args.length === 0) {
				const el = this[0];
				return el && el._potreeSceneTree ? el._potreeSceneTree.getJQueryProxy() : null;
			}

			if (typeof args[0] === 'string') {
				const method = args[0];
				const el = this[0];
				const tree = el && el._potreeSceneTree;
				if (!tree) return null;
				const proxy = tree.getJQueryProxy();
				if (typeof proxy[method] === 'function') {
					return proxy[method](...args.slice(1));
				}
				return null;
			}

			// Initialization: $(el).jstree(options)
			return this.each(function() {
				const tree = new SceneTree();
				this.innerHTML = '';
				this.appendChild(tree.element);
				this._potreeSceneTree = tree;
				tree.element._potreeSceneTree = tree;

				// Forward custom events to jQuery events: create_node.jstree, select_node.jstree, etc.
				const $this = $(this);
				tree.element.addEventListener('select_node', (e) => {
					$this.trigger('select_node.jstree', { node: e.detail.node });
				});
				tree.element.addEventListener('deselect_node', (e) => {
					$this.trigger('deselect_node.jstree', { node: e.detail.node });
				});
				tree.element.addEventListener('check_node', (e) => {
					$this.trigger('check_node.jstree', { node: e.detail.node });
				});
				tree.element.addEventListener('uncheck_node', (e) => {
					$this.trigger('uncheck_node.jstree', { node: e.detail.node });
				});
				tree.element.addEventListener('delete_node', (e) => {
					$this.trigger('delete_node.jstree', { node: e.detail.node });
				});
				tree.element.addEventListener('create_node', (e) => {
					$this.trigger('create_node.jstree', { node: e.detail.node });
				});
			});
		};
	}

	getJQueryProxy() {
		return {
			create_node: (parent, data) => this.createNode(parent, data),
			check_node: (id) => this.checkNode(id),
			uncheck_node: (id) => this.uncheckNode(id),
			select_node: (id) => this.selectNode(id),
			deselect_all: () => this.deselectAll(),
			delete_node: (id) => this.deleteNode(id),
			get_node: (id) => this.getNode(id),
			get_json: (id) => this.getJson(id),
			open_all: () => this.openAll()
		};
	}
}
