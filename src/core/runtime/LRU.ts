export class LRUItem {
	public previous: LRUItem | null = null;
	public next: LRUItem | null = null;
	public node: any;

	constructor(node: any) {
		this.node = node;
	}
}

/**
 * A doubly-linked-list of the least recently used elements.
 */
export class LRU {
	public first: LRUItem | null = null;
	public last: LRUItem | null = null;
	public items: Record<string | number, LRUItem> = {};
	public elements: number = 0;
	public numPoints: number = 0;
	public pointLoadLimit: number;

	constructor(pointLoadLimit: number = 1_000_000) {
		this.pointLoadLimit = pointLoadLimit;
	}

	public size(): number {
		return this.elements;
	}

	public contains(node: any): boolean {
		return this.items[node.id] != null;
	}

	public touch(node: any): void {
		if (!node.loaded) {
			return;
		}

		let item: LRUItem;
		if (this.items[node.id] == null) {
			// add to list
			item = new LRUItem(node);
			item.previous = this.last;
			this.last = item;
			if (item.previous !== null) {
				item.previous.next = item;
			}

			this.items[node.id] = item;
			this.elements++;

			if (this.first === null) {
				this.first = item;
			}
			this.numPoints += node.numPoints || 0;
		} else {
			// update in list
			item = this.items[node.id];
			if (item.previous === null) {
				// handle touch on first element
				if (item.next !== null) {
					this.first = item.next;
					this.first.previous = null;
					item.previous = this.last;
					item.next = null;
					this.last = item;
					if (item.previous) {
						item.previous.next = item;
					}
				}
			} else if (item.next === null) {
				// handle touch on last element
			} else {
				// handle touch on any other element
				if (item.previous) item.previous.next = item.next;
				if (item.next) item.next.previous = item.previous;
				item.previous = this.last;
				item.next = null;
				this.last = item;
				if (item.previous) {
					item.previous.next = item;
				}
			}
		}
	}

	public remove(node: any): void {
		const lruItem = this.items[node.id];
		if (lruItem) {
			if (this.elements === 1) {
				this.first = null;
				this.last = null;
			} else {
				if (!lruItem.previous) {
					this.first = lruItem.next;
					if (this.first) this.first.previous = null;
				}
				if (!lruItem.next) {
					this.last = lruItem.previous;
					if (this.last) this.last.next = null;
				}
				if (lruItem.previous && lruItem.next) {
					lruItem.previous.next = lruItem.next;
					lruItem.next.previous = lruItem.previous;
				}
			}

			delete this.items[node.id];
			this.elements--;
			this.numPoints -= (node.numPoints || 0);
		}
	}

	public getLRUItem(): any {
		if (this.first === null) {
			return null;
		}
		return this.first.node;
	}

	public toString(): string {
		let str = '{ ';
		let curr = this.first;
		while (curr !== null) {
			str += curr.node.id;
			if (curr.next !== null) {
				str += ', ';
			}
			curr = curr.next;
		}
		str += ` } (${this.size()})`;
		return str;
	}

	public freeMemory(): void {
		if (this.elements <= 1) {
			return;
		}

		while (this.numPoints > this.pointLoadLimit && this.first !== null) {
			const element = this.first;
			const node = element.node;
			this.disposeDescendants(node);
		}
	}

	public disposeDescendants(node: any): void {
		const stack = [node];
		while (stack.length > 0) {
			const current = stack.pop();
			if (!current) continue;

			if (current.dispose) {
				current.dispose();
			}
			this.remove(current);

			if (current.children) {
				for (const key of Object.keys(current.children)) {
					const child = current.children[key];
					if (child && child.loaded) {
						stack.push(child);
					}
				}
			}
		}
	}
}
