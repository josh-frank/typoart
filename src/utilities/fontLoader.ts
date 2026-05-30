import type { FontState, GlyphData, FontMetrics } from "../redux/fontSlice";

// Dynamically import opentype.js - add to package.json separately
// import * as opentype from "opentype.js";

/**
 * Parse an OTF/TTF ArrayBuffer using opentype.js.
 * Returns a FontState ready to dispatch to loadFont.
 */
export async function parseBinaryFont(
    buffer: ArrayBuffer,
    fileName: string
): Promise<Omit<FontState, "activeGlyph">> {
    // opentype.js is loaded via CDN in index.html to avoid build complexity
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const opentype = (window as any).opentype;
    if (!opentype) throw new Error("opentype.js not loaded");

    const font = opentype.parse(buffer);

    const upm: number = font.unitsPerEm ?? 1000;
    const ascender: number = font.ascender ?? 800;
    const descender: number = font.descender ?? -200;

    const metrics: FontMetrics = {
        unitsPerEm: upm,
        ascender,
        descender,
        capHeight: font.tables?.os2?.sCapHeight ?? Math.round(upm * 0.7),
        xHeight: font.tables?.os2?.sxHeight ?? Math.round(upm * 0.5),
    };

    const glyphs: Record<string, GlyphData> = {};

    // SVG y-axis is flipped relative to font coordinates.
    // We scale(1,-1) and translate in the overlay, so here we convert
    // font units → SVG path at scale 1 (1 font unit = 1 SVG unit).
    // The artboard zoom handles the rest.
    for (let i = 0; i < font.glyphs.length; i++) {
        const glyph = font.glyphs.get(i);

        if (!glyph.unicode) continue;
        const char = String.fromCodePoint(glyph.unicode);

        // getPath(x, y, fontSize) - use fontSize = upm so 1 unit = 1px
        const glyphPath = glyph.getPath(0, 0, upm);
        const svgPath = glyphPath.toPathData(2);

        if (!svgPath || svgPath.trim() === "") continue;

        glyphs[char] = {
            advanceWidth: glyph.advanceWidth ?? 0,
            paths: [svgPath],
        };
    }

    return {
        name: font.names?.fullName?.en ?? fileName.replace(/\.[^.]+$/, ""),
        metrics,
        glyphs,
        fileName,
    };
}

/**
 * Parse a YAML font file.
 * Expected structure:
 *   font:
 *     name: MyFont
 *     unitsPerEm: 1000
 *     ascender: 800
 *     descender: -200
 *     capHeight: 700
 *     xHeight: 500
 *   glyphs:
 *     A:
 *       advanceWidth: 612
 *       paths:
 *         - d: <base64>
 */
export async function parseYamlFont(
    text: string,
    fileName: string
): Promise<Omit<FontState, "activeGlyph">> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jsyaml = (window as any).jsyaml;
    if (!jsyaml) throw new Error("js-yaml not loaded");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = jsyaml.load(text) as any;

    const fontMeta = doc?.font ?? {};
    const metrics: FontMetrics = {
        unitsPerEm: fontMeta.unitsPerEm ?? 1000,
        ascender: fontMeta.ascender ?? 800,
        descender: fontMeta.descender ?? -200,
        capHeight: fontMeta.capHeight ?? 700,
        xHeight: fontMeta.xHeight ?? 500,
    };

    const rawGlyphs = doc?.glyphs ?? {};
    const glyphs: Record<string, GlyphData> = {};

    for (const [char, raw] of Object.entries(rawGlyphs)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const g = raw as any;
        const paths: string[] = (g.paths ?? []).map((p: { d: string }) =>
            atob(p.d)
        );
        glyphs[char] = {
            advanceWidth: g.advanceWidth ?? 0,
            paths,
        };
    }

    return {
        name: fontMeta.name ?? fileName.replace(/\.yaml$/, ""),
        metrics,
        glyphs,
        fileName,
    };
}

/**
 * Serialise current FontState to YAML text (for future save button).
 */
export function fontStateToYaml(state: Omit<FontState, "activeGlyph">): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jsyaml = (window as any).jsyaml;
    if (!jsyaml) throw new Error("js-yaml not loaded");

    const doc = {
        font: {
            name: state.name,
            ...state.metrics,
        },
        glyphs: Object.fromEntries(
            Object.entries(state.glyphs).map(([char, g]) => [
                char,
                {
                    advanceWidth: g.advanceWidth,
                    paths: g.paths.map((d) => ({ d: btoa(d) })),
                },
            ])
        ),
    };

    return jsyaml.dump(doc);
}
