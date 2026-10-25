import React from 'react';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
	size?: number;
	color?: string;
}

export const IconEye: React.FC<IconProps> = ({ size = 18, color = 'currentColor', ...props }) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
		<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
		<circle cx="12" cy="12" r="3" />
	</svg>
);

export const IconLayers: React.FC<IconProps> = ({ size = 18, color = 'currentColor', ...props }) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
		<polygon points="12 2 2 7 12 12 22 7 12 2" />
		<polyline points="2 17 12 22 22 17" />
		<polyline points="2 12 12 17 22 12" />
	</svg>
);

export const IconTool: React.FC<IconProps> = ({ size = 18, color = 'currentColor', ...props }) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
		<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
	</svg>
);

export const IconFilter: React.FC<IconProps> = ({ size = 18, color = 'currentColor', ...props }) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
		<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
	</svg>
);

export const IconSettings: React.FC<IconProps> = ({ size = 18, color = 'currentColor', ...props }) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
		<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
		<circle cx="12" cy="12" r="3" />
	</svg>
);

export const IconRuler: React.FC<IconProps> = ({ size = 18, color = 'currentColor', ...props }) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
		<path d="M21.3 15.3l-6.6-6.6a2 2 0 0 0-2.8 0L3.3 17.3a2 2 0 0 0 0 2.8l.6.6a2 2 0 0 0 2.8 0l8.6-8.6" />
		<path d="M14.5 12.5l2-2" />
		<path d="M11.5 15.5l2-2" />
		<path d="M8.5 18.5l2-2" />
	</svg>
);

export const IconBox: React.FC<IconProps> = ({ size = 18, color = 'currentColor', ...props }) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
		<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
		<polyline points="3.27 6.96 12 12.01 20.73 6.96" />
		<line x1="12" y1="22.08" x2="12" y2="12" />
	</svg>
);

export const IconClose: React.FC<IconProps> = ({ size = 18, color = 'currentColor', ...props }) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
		<line x1="18" y1="6" x2="6" y2="18" />
		<line x1="6" y1="6" x2="18" y2="18" />
	</svg>
);

export const IconChevronRight: React.FC<IconProps> = ({ size = 18, color = 'currentColor', ...props }) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
		<polyline points="9 18 15 12 9 6" />
	</svg>
);

export const IconChevronDown: React.FC<IconProps> = ({ size = 18, color = 'currentColor', ...props }) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
		<polyline points="6 9 12 15 18 9" />
	</svg>
);

export const IconRotateCW: React.FC<IconProps> = ({ size = 18, color = 'currentColor', ...props }) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
		<path d="M21 2v6h-6" />
		<path d="M21 13a9 9 0 1 1-3-7.7L21 8" />
	</svg>
);

export const IconRotateCCW: React.FC<IconProps> = ({ size = 18, color = 'currentColor', ...props }) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
		<path d="M3 2v6h6" />
		<path d="M3 13a9 9 0 1 0 3-7.7L3 8" />
	</svg>
);

export const IconFit: React.FC<IconProps> = ({ size = 18, color = 'currentColor', ...props }) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
		<path d="M8 3H5a2 2 0 0 0-2 2v3" />
		<path d="M21 8V5a2 2 0 0 0-2-2h-3" />
		<path d="M3 16v3a2 2 0 0 0 2 2h3" />
		<path d="M16 21h3a2 2 0 0 0 2-2v-3" />
	</svg>
);

export const IconDownload: React.FC<IconProps> = ({ size = 18, color = 'currentColor', ...props }) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
		<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
		<polyline points="7 10 12 15 17 10" />
		<line x1="12" y1="15" x2="12" y2="3" />
	</svg>
);

export const IconArrowLeft: React.FC<IconProps> = ({ size = 18, color = 'currentColor', ...props }) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
		<line x1="19" y1="12" x2="5" y2="12" />
		<polyline points="12 19 5 12 12 5" />
	</svg>
);

export const IconArrowRight: React.FC<IconProps> = ({ size = 18, color = 'currentColor', ...props }) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
		<line x1="5" y1="12" x2="19" y2="12" />
		<polyline points="12 5 19 12 12 19" />
	</svg>
);

export const IconCopy: React.FC<IconProps> = ({ size = 16, color = 'currentColor', ...props }) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
		<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
		<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
	</svg>
);

export const IconCheck: React.FC<IconProps> = ({ size = 16, color = 'currentColor', ...props }) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
		<polyline points="20 6 9 17 4 12" />
	</svg>
);

export const IconMenu: React.FC<IconProps> = ({ size = 20, color = 'currentColor', ...props }) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
		<line x1="4" y1="6" x2="20" y2="6" />
		<line x1="4" y1="12" x2="20" y2="12" />
		<line x1="4" y1="18" x2="20" y2="18" />
	</svg>
);

export const IconFolder: React.FC<IconProps> = ({ size = 16, color = 'currentColor', ...props }) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
		<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
	</svg>
);

export const IconCloud: React.FC<IconProps> = ({ size = 16, color = 'currentColor', ...props }) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
		<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
	</svg>
);

export const IconCamera: React.FC<IconProps> = ({ size = 16, color = 'currentColor', ...props }) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
		<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
		<circle cx="12" cy="13" r="3" />
	</svg>
);

export const IconTag: React.FC<IconProps> = ({ size = 16, color = 'currentColor', ...props }) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
		<path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
		<path d="M7 7h.01" />
	</svg>
);

