import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export interface GlyphData {
    advanceWidth: number;
    paths: string[]; // SVG path d strings (already y-flipped for SVG coordinates)
}

export interface FontMetrics {
    unitsPerEm: number;
    ascender: number;
    descender: number;
    capHeight: number;
    xHeight: number;
}

export interface FontState {
    name: string;
    metrics: FontMetrics;
    glyphs: Record<string, GlyphData>; // keyed by character e.g. "A"
    activeGlyph: string | null;
    fileName: string | null;
}

const defaultMetrics: FontMetrics = {
    unitsPerEm: 1000,
    ascender: 800,
    descender: -200,
    capHeight: 700,
    xHeight: 500,
};

const initialState: FontState = {
    name: "",
    metrics: defaultMetrics,
    glyphs: {},
    activeGlyph: null,
    fileName: null,
};

const fontSlice = createSlice({
    name: "font",
    initialState,
    reducers: {
        loadFont: (state, action: PayloadAction<Omit<FontState, "activeGlyph">>) => {
            state.name = action.payload.name;
            state.metrics = action.payload.metrics;
            state.glyphs = action.payload.glyphs;
            state.fileName = action.payload.fileName;
            state.activeGlyph = null;
        },
        setActiveGlyph: (state, action: PayloadAction<string | null>) => {
            state.activeGlyph = action.payload;
        },
        clearFont: (state) => {
            state.name = "";
            state.metrics = defaultMetrics;
            state.glyphs = {};
            state.activeGlyph = null;
            state.fileName = null;
        },
    },
});

export const { loadFont, setActiveGlyph, clearFont } = fontSlice.actions;
export default fontSlice.reducer;
