import type { ReactNode } from 'react';

export interface ToggleOption {
	value: string;
	label: string;
	id?: string;
	icon?: ReactNode;
}

export interface ToggleGroupProps {
	options: ToggleOption[];
	value?: string;
	defaultValue?: string;
	title?: string;
	onChange?: (value: string) => void;
	className?: string;
}

export interface SliderProps {
	min?: number;
	max?: number;
	step?: number;
	value?: number;
	defaultValue?: number;
	values?: [number, number];
	defaultValues?: [number, number];
	range?: boolean;
	onChange?: (value: number | [number, number]) => void;
	onSlide?: (value: number | [number, number]) => void;
	className?: string;
}

export interface ColorPickerProps {
	value?: string;
	defaultValue?: string;
	onChange?: (hex: string) => void;
	className?: string;
}

export interface SceneTreeNode {
	id: string;
	parentId?: string | null;
	text: string;
	icon?: ReactNode;
	data?: any;
	visible?: boolean;
	children?: SceneTreeNode[];
}

export interface SceneTreeProps {
	nodes: SceneTreeNode[];
	selectedId?: string | null;
	onSelect?: (node: SceneTreeNode) => void;
	onToggleVisibility?: (node: SceneTreeNode, visible: boolean) => void;
	className?: string;
}

export interface ToolbarAction {
	id: string;
	title?: string;
	icon?: ReactNode;
	label?: string;
	type?: 'button' | 'toggle' | 'divider';
	group?: string;
	active?: boolean;
	disabled?: boolean;
	visible?: boolean;
	onClick?: (viewer: any, event: React.MouseEvent) => void;
}

export interface FloatingToolbarProps {
	viewer?: any;
	actions?: ToolbarAction[];
	position?: 'top-center' | 'top-left' | 'top-right' | 'bottom-center' | 'bottom-left' | 'bottom-right';
	className?: string;
}

export interface PotreeViewerProps {
	pointcloudUrl?: string;
	pointcloudName?: string;
	className?: string;
	style?: React.CSSProperties;
	toolbar?: boolean;
	showSidebar?: boolean;
	onViewerReady?: (viewer: any) => void;
	onPointcloudLoaded?: (pointcloud: any) => void;
}
