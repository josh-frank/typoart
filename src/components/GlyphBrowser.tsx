import { useAppDispatch, useAppSelector } from "../types";
import { setActiveGlyph } from "../redux/fontSlice";
import { loadShapes } from "../redux/shapesSlice";

export default function GlyphBrowser() {
    const dispatch = useAppDispatch();
    const { glyphs, activeGlyph, name, metrics } = useAppSelector(state => state.font);
    const { dark } = useAppSelector(state => state.artboard);

    const chars = Object.keys(glyphs).sort((a, b) =>
        (a.codePointAt(0) ?? 0) - (b.codePointAt(0) ?? 0)
    );

    const selectGlyph = (char: string) => {
        dispatch(setActiveGlyph(char));
        // Feed this glyph's paths into the existing shapes store
        // so the Artboard renders them unchanged.
        const paths = glyphs[char]?.paths ?? [];
        dispatch(loadShapes(paths));
    };

    const colorBg   = dark ? "#111" : "#f4f4f4";
    const colorText = dark ? "#eee" : "#222";
    const colorBorder = dark ? "#333" : "#ddd";
    const colorActive = dark ? "#444" : "#d0e8ff";
    const colorHover  = dark ? "#2a2a2a" : "#e8e8e8";

    return (
        <div style={{
            width: "14rem",
            minWidth: "14rem",
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            background: colorBg,
            borderRight: `1px solid ${colorBorder}`,
            zIndex: 10,
            position: "fixed",
            top: 0,
            left: 0,
            overflow: "hidden",
        }}>
            {/* Header */}
            <div style={{
                padding: "0.5rem 0.75rem",
                borderBottom: `1px solid ${colorBorder}`,
                background: dark ? "#000" : "#e0e0e0",
            }}>
                <div style={{
                    fontWeight: "bold",
                    fontSize: "0.8rem",
                    color: colorText,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                }}>
                    {name || "No font loaded"}
                </div>
                {name && (
                    <div style={{ fontSize: "0.65rem", color: dark ? "#888" : "#666", marginTop: "0.2rem" }}>
                        {chars.length} glyphs · {metrics.unitsPerEm} UPM
                    </div>
                )}
            </div>

            {/* Glyph grid */}
            <div style={{
                flex: 1,
                overflowY: "auto",
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                alignContent: "start",
                gap: "1px",
                padding: "1px",
            }}>
                {chars.length === 0 && (
                    <div style={{
                        gridColumn: "1 / -1",
                        padding: "1.5rem 0.75rem",
                        fontSize: "0.72rem",
                        color: dark ? "#666" : "#999",
                        textAlign: "center",
                        lineHeight: 1.5,
                    }}>
                        Open a .otf, .ttf,<br />or .yaml font file
                    </div>
                )}
                {chars.map(char => (
                    <button
                        key={char}
                        onClick={() => selectGlyph(char)}
                        title={`U+${(char.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0")} ${char}`}
                        style={{
                            background: activeGlyph === char ? colorActive : "transparent",
                            border: "none",
                            cursor: "pointer",
                            padding: "0.4rem 0.2rem",
                            fontSize: "1.1rem",
                            color: colorText,
                            borderRadius: "2px",
                            transition: "background 0.1s",
                            lineHeight: 1,
                        }}
                        onMouseEnter={e => {
                            if (activeGlyph !== char)
                                (e.currentTarget as HTMLButtonElement).style.background = colorHover;
                        }}
                        onMouseLeave={e => {
                            if (activeGlyph !== char)
                                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                        }}
                    >
                        {char}
                    </button>
                ))}
            </div>

            {/* Active glyph info footer */}
            {activeGlyph && glyphs[activeGlyph] && (
                <div style={{
                    padding: "0.4rem 0.75rem",
                    borderTop: `1px solid ${colorBorder}`,
                    fontSize: "0.68rem",
                    color: dark ? "#aaa" : "#555",
                }}>
                    <span style={{ fontWeight: "bold", fontSize: "1rem", marginRight: "0.5rem" }}>
                        {activeGlyph}
                    </span>
                    U+{(activeGlyph.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0")}
                    <br />
                    adv. width: {glyphs[activeGlyph].advanceWidth}
                </div>
            )}
        </div>
    );
}
