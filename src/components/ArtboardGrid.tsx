import { useAppSelector } from "../types";

/**
 * Font-aware grid overlay.
 *
 * Coordinate system matches MetricsOverlay exactly:
 *   toSvgY(fontY) = offsetX - fontY * scale   (y-axis flipped: font up = SVG up)
 *   toSvgX(fontX) = offsetY + fontX * scale
 *
 * Hidden entirely when no font is loaded (caller also hides the toggle).
 * Grid lines run from descender to ascender vertically, edge-to-edge horizontally.
 * Labels show font-unit values.
 */
export default function ArtboardGrid() {
    const { zoom, offsetX, offsetY, gridInterval, dark } = useAppSelector(state => state.artboard);
    const { metrics, glyphs, activeGlyph } = useAppSelector(state => state.font);

    // Hide when no font loaded
    if (!Object.keys(glyphs).length) return null;

    const scale = zoom / 100;
    const toSvgY = (fontY: number) => offsetX - fontY * scale;
    const toSvgX = (fontX: number) => offsetY + fontX * scale;

    const { ascender, descender } = metrics;

    // SVG bounds of the em square
    const svgTop    = toSvgY(ascender);
    const svgBottom = toSvgY(descender);

    // Horizontal extent: use advance width of active glyph if available,
    // otherwise fall back to a reasonable screen-width span in font units
    const screenW = window.innerWidth;
    const advanceWidth = activeGlyph ? glyphs[activeGlyph]?.advanceWidth : null;
    const svgLeft  = toSvgX(0);
    const svgRight = advanceWidth ? toSvgX(advanceWidth) : screenW;

    // Font-unit grid values between two font-coordinate bounds
    function fontUnitRange(from: number, to: number, step: number): number[] {
        const lines: number[] = [];
        const start = Math.ceil(from / step) * step;
        for (let v = start; v <= to; v += step) {
            lines.push(v);
        }
        return lines;
    }

    const horizontalValues = fontUnitRange(descender, ascender, gridInterval);

    const rightFontX = advanceWidth ?? (screenW - offsetY) / scale;
    const verticalValues = fontUnitRange(0, rightFontX, gridInterval);

    const strokeColor   = dark ? "#333" : "#ddd";
    const baselineColor = dark ? "#666" : "#bbb";
    const labelColor    = dark ? "#555" : "#ccc";

    // Label font size in screen pixels, clamped so it stays readable
    const labelPx = Math.max(9, Math.min(11, 11 * scale));

    // Only show labels when there's enough room between lines
    const lineSpacingPx = gridInterval * scale;
    const showLabels = lineSpacingPx >= 24;

    return (
        <g style={{ pointerEvents: "none" }}>
            {/* Horizontal lines: left sidebearing to advance width */}
            {horizontalValues.map(fontY => {
                const svgY = toSvgY(fontY);
                const isBaseline = fontY === 0;
                return (
                    <g key={`h-${fontY}`}>
                        <line
                            x1={svgLeft}
                            y1={svgY}
                            x2={svgRight}
                            y2={svgY}
                            stroke={isBaseline ? baselineColor : strokeColor}
                            strokeWidth={isBaseline ? 1 : 0.5}
                        />
                        {showLabels && (
                            <text
                                x={svgLeft + 4}
                                y={svgY - 3}
                                fill={labelColor}
                                fontSize={labelPx}
                                fontFamily="Arial Narrow, Arial, sans-serif"
                            >
                                {fontY}
                            </text>
                        )}
                    </g>
                );
            })}

            {/* Vertical lines: baseline origin to advance width, descender to ascender */}
            {verticalValues.map(fontX => {
                const svgX = toSvgX(fontX);
                const isOrigin = fontX === 0;
                return (
                    <g key={`v-${fontX}`}>
                        <line
                            x1={svgX}
                            y1={svgTop}
                            x2={svgX}
                            y2={svgBottom}
                            stroke={isOrigin ? baselineColor : strokeColor}
                            strokeWidth={isOrigin ? 1 : 0.5}
                        />
                        {showLabels && fontX !== 0 && (
                            <text
                                x={svgX + 3}
                                y={svgBottom + labelPx + 3}
                                fill={labelColor}
                                fontSize={labelPx}
                                fontFamily="Arial Narrow, Arial, sans-serif"
                            >
                                {fontX}
                            </text>
                        )}
                    </g>
                );
            })}
        </g>
    );
}