import React, { useState } from 'react';
import type { SceneTreeNode, SceneTreeProps } from './types.js';

interface TreeNodeItemProps {
	node: SceneTreeNode;
	selectedId?: string | null;
	onSelect?: (node: SceneTreeNode) => void;
	onToggleVisibility?: (node: SceneTreeNode, visible: boolean) => void;
}

const TreeNodeItem: React.FC<TreeNodeItemProps> = ({
	node,
	selectedId,
	onSelect,
	onToggleVisibility,
}) => {
	const [isCollapsed, setIsCollapsed] = useState(false);
	const [isVisible, setIsVisible] = useState(node.visible !== false);

	const hasChildren = Boolean(node.children && node.children.length > 0);
	const isSelected = selectedId === node.id;

	const handleToggleEye = (e: React.MouseEvent) => {
		e.stopPropagation();
		const nextVisible = !isVisible;
		setIsVisible(nextVisible);
		if (node.data) node.data.visible = nextVisible;
		onToggleVisibility?.(node, nextVisible);
	};

	const handleToggleChevron = (e: React.MouseEvent) => {
		e.stopPropagation();
		setIsCollapsed(!isCollapsed);
	};

	return (
		<div className="potree-tree-node">
			<div
				className={`potree-tree-header ${isSelected ? 'selected' : ''}`}
				onClick={() => onSelect?.(node)}
			>
				{/* Chevron */}
				<span
					className="potree-tree-toggle"
					style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
					onClick={handleToggleChevron}
				>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						{isCollapsed ? (
							<polyline points="9 18 15 12 9 6" />
						) : (
							<polyline points="6 9 12 15 18 9" />
						)}
					</svg>
				</span>

				{/* Eye visibility */}
				<button
					type="button"
					className={`potree-tree-eye ${isVisible ? 'active' : ''}`}
					title={isVisible ? 'Hide' : 'Show'}
					onClick={handleToggleEye}
				>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						{isVisible ? (
							<>
								<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
								<circle cx="12" cy="12" r="3" />
							</>
						) : (
							<>
								<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
								<line x1="1" y1="1" x2="23" y2="23" />
							</>
						)}
					</svg>
				</button>

				{/* Icon */}
				<span className="potree-tree-icon">
					{node.icon || (
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
						</svg>
					)}
				</span>

				{/* Label */}
				<span className="potree-tree-label">{node.text}</span>
			</div>

			{/* Children Container */}
			{hasChildren && !isCollapsed && (
				<div className="potree-tree-children">
					{node.children!.map((child) => (
						<TreeNodeItem
							key={child.id}
							node={child}
							selectedId={selectedId}
							onSelect={onSelect}
							onToggleVisibility={onToggleVisibility}
						/>
					))}
				</div>
			)}
		</div>
	);
};

export const SceneTree: React.FC<SceneTreeProps> = ({
	nodes,
	selectedId,
	onSelect,
	onToggleVisibility,
	className = '',
}) => {
	return (
		<div className={`potree-scene-tree ${className}`}>
			{nodes.map((node) => (
				<TreeNodeItem
					key={node.id}
					node={node}
					selectedId={selectedId}
					onSelect={onSelect}
					onToggleVisibility={onToggleVisibility}
				/>
			))}
		</div>
	);
};
