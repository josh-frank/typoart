import { useAppSelector } from "../types";

/**
 * Renders font metric guide lines as an SVG overlay on top of the artboard.
 * Sits in the same coordinate space as Shape.tsx (same transform).
 * The y-axis is flipped: font y=0 (baseline) maps to SVG y = offsetX,
 * positive font values go UP (negative SVG direction).
 */
export default function MetricsOverlay() {
    const { zoom, offsetX, offsetY } = useAppSelector(state => state.artboard);
    const { metrics, activeGlyph, glyphs } = useAppSelector(state => state.font);
    const { dark } = useAppSelector(state => state.artboard);

    if (!activeGlyph) return null;

    const glyph = glyphs[activeGlyph];
    if (!glyph) return null;

    const scale = zoom / 100;

    // Convert a font-coordinate y value to SVG screen y.
    // Font y increases upward; SVG y increases downward.
    // Baseline (font y=0) sits at SVG y = offsetX.
    const toSvgY = (fontY: number) => offsetX - fontY * scale;

    // Convert a font-coordinate x value to SVG screen x.
    const toSvgX = (fontX: number) => offsetY + fontX * scale;

    const { ascender, descender, capHeight, xHeight } = metrics;
    const advanceWidth = glyph.advanceWidth;

    // Viewport width for horizontal lines
    const lineWidth = window.innerWidth;

    const lines: Array<{ y: number; label: string; color: string; dash?: string }> = [
        { y: ascender,   label: "ascender",   color: "#4a9eff", dash: "4,4" },
        { y: capHeight,  label: "cap height",  color: "#9b59b6", dash: "4,4" },
        { y: xHeight,    label: "x-height",    color: "#27ae60", dash: "4,4" },
        { y: 0,          label: "baseline",    color: dark ? "#ccc" : "#333" },
        { y: descender,  label: "descender",   color: "#e74c3c", dash: "4,4" },
    ];

    const labelStyle: React.CSSProperties = {
        fontSize: `${Math.max(9, 11 * scale)}px`,
        dominantBaseline: "auto",
    };

    return (
        <g style={{ pointerEvents: "none" }}>
            {/* Horizontal metric lines */}
            {lines.map(({ y, label, color, dash }) => {
                const svgY = toSvgY(y);
                return (
                    <g key={label}>
                        <line
                            x1={0}
                            y1={svgY}
                            x2={lineWidth}
                            y2={svgY}
                            stroke={color}
                            strokeWidth={y === 0 ? 1 : 0.5}
                            strokeDasharray={dash}
                            opacity={0.6}
                        />
                        <text
                            x={toSvgX(advanceWidth) + 6}
                            y={svgY - 2}
                            fill={color}
                            opacity={0.8}
                            style={labelStyle}
                        >
                            {label}
                        </text>
                    </g>
                );
            })}

            {/* Left sidebearing line (x=0) */}
            <line
                x1={toSvgX(0)}
                y1={toSvgY(ascender + 50)}
                x2={toSvgX(0)}
                y2={toSvgY(descender - 50)}
                stroke={dark ? "#888" : "#aaa"}
                strokeWidth={0.5}
                strokeDasharray="4,4"
                opacity={0.7}
            />

            {/* Advance width line */}
            <line
                x1={toSvgX(advanceWidth)}
                y1={toSvgY(ascender + 50)}
                x2={toSvgX(advanceWidth)}
                y2={toSvgY(descender - 50)}
                stroke={dark ? "#888" : "#aaa"}
                strokeWidth={0.5}
                strokeDasharray="4,4"
                opacity={0.7}
            />

            {/* Advance width label */}
            <text
                x={toSvgX(advanceWidth) + 4}
                y={toSvgY(ascender + 50) + 12}
                fill={dark ? "#888" : "#aaa"}
                style={labelStyle}
                opacity={0.8}
            >
                {advanceWidth}u
            </text>
        </g>
    );
}
