import type { FontState } from "../redux/fontSlice";
import { fontStateToYaml } from "./fontLoader";

type Point = [number, number];

// ─── existing Sendero utilities (unchanged) ───────────────────────────────────

export const downloadArtboardAsSvg = (paths: string[], dimensions: Point): void => {
    const element = document.createElement("a");
    element.setAttribute("href", "data:image/svg+xml;utf8," + encodeURIComponent([
        `<?xml version="1.0" encoding="utf-8"?>`,
        `<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">`,
        `<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="${dimensions[0]}px" height="${dimensions[1]}px" viewBox="0 0 ${dimensions[0]} ${dimensions[1]}" enable-background="new 0 0 ${dimensions[0]} ${dimensions[1]}" xml:space="preserve">`,
        ...paths.map(path => `<path d="${path}" stroke="black" stroke-width="1" fill="white" />`),
        `</svg>`
    ].join("")));
    element.setAttribute("download", `GievesEdit-${Date.now()}`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
};

export const parsePathsFromSvg = (svg: string): string[] => {
    const matchPathTag = /<path[\s\S]*?\/>/gmi;
    const matchDescriptor = /(?<=\sd=")[\s\S]*?(?=")/gmi;
    const cleanUpWhiteSpace = /[\n\s]+/g;

    const pathTags = svg.match(matchPathTag);
    if (!pathTags) return [];

    return pathTags
        .map(pathTag => {
            const descriptors = pathTag.match(matchDescriptor);
            return descriptors ? descriptors.join("").replace(cleanUpWhiteSpace, " ") : "";
        })
        .filter(path => path.length > 0);
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function triggerDownload(href: string, filename: string): void {
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

const safeName = (fontName: string) =>
    fontName.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "") || "font";

// ─── Save as YAML ─────────────────────────────────────────────────────────────

export function saveAsYaml(fontState: Omit<FontState, "activeGlyph">): void {
    const yaml = fontStateToYaml(fontState);
    const blob = new Blob([yaml], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, `${safeName(fontState.name)}.yaml`);
    URL.revokeObjectURL(url);
}

// ─── Export as OTF ───────────────────────────────────────────────────────────

export function exportAsOtf(fontState: Omit<FontState, "activeGlyph">): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const opentype = (window as any).opentype;
    if (!opentype) {
        alert("opentype.js not loaded — cannot export OTF.");
        return;
    }

    const { metrics, glyphs, name } = fontState;
    const { unitsPerEm, ascender, descender } = metrics;

    // opentype.js requires a .notdef glyph as index 0
    const notdefGlyph = new opentype.Glyph({
        name: ".notdef",
        unicode: 0,
        advanceWidth: 500,
        path: new opentype.Path(),
    });

    const otGlyphs = [notdefGlyph];

    for (const [char, glyphData] of Object.entries(glyphs)) {
        const unicode = char.codePointAt(0);
        if (!unicode) continue;

        const otPath = new opentype.Path();

        // Re-parse each SVG path string into opentype Path commands.
        // The paths are stored in SVG coordinate space (y-down),
        // so we flip y back to font coordinate space (y-up).
        for (const d of glyphData.paths) {
            const cmds = parseSvgPathToOtCommands(d, unitsPerEm, ascender);
            cmds.forEach(cmd => {
                if (cmd.type === "M") otPath.moveTo(cmd.x, cmd.y);
                else if (cmd.type === "L") otPath.lineTo(cmd.x, cmd.y);
                else if (cmd.type === "C") otPath.curveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
                else if (cmd.type === "Q") otPath.quadraticCurveTo(cmd.x1, cmd.y1, cmd.x, cmd.y);
                else if (cmd.type === "Z") otPath.close();
            });
        }

        otGlyphs.push(new opentype.Glyph({
            name: `uni${unicode.toString(16).toUpperCase().padStart(4, "0")}`,
            unicode,
            advanceWidth: glyphData.advanceWidth,
            path: otPath,
        }));
    }

    const otFont = new opentype.Font({
        familyName: name || "Untitled",
        styleName: "Regular",
        unitsPerEm,
        ascender,
        descender,
        glyphs: otGlyphs,
    });

    const arrayBuffer = otFont.download
        ? (otFont.download(), null) // opentype.js download() triggers save directly
        : otFont.arrayBuffer();

    // If download() didn't fire automatically, trigger manually
    if (arrayBuffer) {
        const blob = new Blob([arrayBuffer], { type: "font/otf" });
        const url = URL.createObjectURL(blob);
        triggerDownload(url, `${safeName(name)}.otf`);
        URL.revokeObjectURL(url);
    }
}

// ─── SVG path → opentype command objects ─────────────────────────────────────
// Minimal parser for the absolute cubic/line/move/close commands
// that opentype.js getPath() emits. Flips y-axis back to font space.

interface OtCmd {
    type: "M" | "L" | "C" | "Q" | "Z";
    x: number; y: number;
    x1?: number; y1?: number;
    x2?: number; y2?: number;
}

function flipY(y: number, upm: number, ascender: number): number {
    // SVG y=0 was font y=ascender (top of viewport when rendered at upm size)
    // Reverse: fontY = ascender - svgY
    return ascender - y;
}

function parseSvgPathToOtCommands(d: string, upm: number, ascender: number): OtCmd[] {
    const cmds: OtCmd[] = [];
    // tokenise: letters and numeric values
    const tokens = d.match(/[MmLlCcQqZz]|[-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?/g);
    if (!tokens) return cmds;

    let i = 0;
    const num = () => parseFloat(tokens[i++]);
    const fy = (y: number) => flipY(y, upm, ascender);

    while (i < tokens.length) {
        const cmd = tokens[i++];
        switch (cmd) {
            case "M": cmds.push({ type: "M", x: num(), y: fy(num()) }); break;
            case "L": cmds.push({ type: "L", x: num(), y: fy(num()) }); break;
            case "C": {
                const x1 = num(), y1 = fy(num());
                const x2 = num(), y2 = fy(num());
                const x  = num(), y  = fy(num());
                cmds.push({ type: "C", x1, y1, x2, y2, x, y });
                break;
            }
            case "Q": {
                const x1 = num(), y1 = fy(num());
                const x  = num(), y  = fy(num());
                cmds.push({ type: "Q", x1, y1, x, y });
                break;
            }
            case "Z": case "z": cmds.push({ type: "Z", x: 0, y: 0 }); break;
            default: break;
        }
    }
    return cmds;
}
