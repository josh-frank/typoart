import { useRef } from "react";
import { useAppDispatch, useAppSelector } from "../../types";
import { loadShapes } from "../../redux/shapesSlice";
import { loadFont } from "../../redux/fontSlice";
import {
    downloadArtboardAsSvg,
    parsePathsFromSvg,
    saveAsYaml,
    exportAsOtf,
} from "../../utilities/fileUtilities";
import { parseBinaryFont, parseYamlFont } from "../../utilities/fontLoader";

export default function FilePanel() {
    const dispatch = useAppDispatch();
    const { activeShape, inactiveShapes } = useAppSelector(state => state.shapes);
    const { width, height } = useAppSelector(state => state.artboard);
    const fontState = useAppSelector(state => state.font);

    const svgUploadRef  = useRef<HTMLInputElement>(null);
    const fontUploadRef = useRef<HTMLInputElement>(null);

    // ── existing SVG load ────────────────────────────────────────────────────
    const handleSvgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type === "image/svg+xml") {
            const reader = new FileReader();
            reader.onload = ev => {
                const result = ev.target?.result;
                if (typeof result === "string")
                    dispatch(loadShapes(parsePathsFromSvg(result)));
            };
            reader.readAsText(file);
        }
        e.target.value = "";
    };

    const handleSvgDownload = () => {
        downloadArtboardAsSvg(
            activeShape ? [activeShape, ...inactiveShapes] : [...inactiveShapes],
            [width, height]
        );
    };

    // ── font open (otf / ttf / yaml) ─────────────────────────────────────────
    const handleFontOpen = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const name = file.name.toLowerCase();
            if (name.endsWith(".otf") || name.endsWith(".ttf")) {
                const buffer = await file.arrayBuffer();
                dispatch(loadFont(await parseBinaryFont(buffer, file.name)));
            } else if (name.endsWith(".yaml") || name.endsWith(".yml")) {
                dispatch(loadFont(await parseYamlFont(await file.text(), file.name)));
            } else {
                alert("Please open a .otf, .ttf, or .yaml file.");
            }
        } catch (err) {
            alert(`Could not load font: ${(err as Error).message}`);
        }
        e.target.value = "";
    };

    const hasFontLoaded = !!fontState.fileName;

    return (
        <div className="menu-panel">
            <div className="menu-header">File</div>

            {/* hidden inputs */}
            <input type="file" ref={svgUploadRef}  onChange={handleSvgUpload}  accept=".svg"                    hidden />
            <input type="file" ref={fontUploadRef} onChange={handleFontOpen}   accept=".otf,.ttf,.yaml,.yml"    hidden />

            {/* ── SVG (original Sendero) ── */}
            <button onClick={() => {
                alert("This will erase your artboard!");
                svgUploadRef.current?.click();
            }}>
                🗂 <b>Load from SVG</b>
            </button>
            <button onClick={handleSvgDownload}>
                〈／〉 <b>Download as SVG</b>
            </button>

            {/* ── Font ── */}
            <div className="menu-header" style={{ marginTop: "0.5rem" }}>Font</div>
            <button onClick={() => fontUploadRef.current?.click()}>
                📂 <b>Open font…</b>
            </button>
            <button
                onClick={() => saveAsYaml(fontState)}
                disabled={!hasFontLoaded}
                title={hasFontLoaded ? undefined : "Open a font first"}
            >
                💾 <b>Save as YAML</b>
            </button>
            <button
                onClick={() => exportAsOtf(fontState)}
                disabled={!hasFontLoaded}
                title={hasFontLoaded ? undefined : "Open a font first"}
            >
                ⬆️ <b>Export as OTF</b>
            </button>
        </div>
    );
}
