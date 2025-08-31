import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

interface FontAwesomeIconProps {
    title: string;
    icon: IconDefinition;
    size?: number;
    class?: string;
}

export function FontAwesomeIcon({
    title,
    icon,
    size = 16,
    class: className,
}: FontAwesomeIconProps) {
    const [width, height, , , svgPathData] = icon.icon;
    const path = typeof svgPathData === "string" ? svgPathData : svgPathData[1];

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`0 0 ${width} ${height}`}
            width={size}
            height={size}
            class={className}
            fill="currentColor"
        >
            <title>{title}</title>
            <path d={path} />
        </svg>
    );
}
