import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export interface ArtboardState {
    width: number;
    height: number;
    zoom: number;
    offsetX: number;
    offsetY: number;
    displayGrid: boolean;
    gridInterval: number;
    dark: boolean;
}

interface SetDimensionsPayload {
    width?: number;
    height?: number;
}

interface SetOffsetPayload {
    offsetX?: number;
    offsetY?: number;
}

const initialState: ArtboardState = {
    width: 1000,
    height: 800,
    zoom: 100,
    offsetX: (document.documentElement.clientHeight - 800) / 2,
    offsetY: (document.documentElement.clientWidth - 1000) / 2,
    displayGrid: true,
    gridInterval: 10,
    dark: false
};

const artboardSlice = createSlice({
    name: "artboard",
    initialState,
    reducers: {
        setArtboardDimensions: (state, action: PayloadAction<SetDimensionsPayload>) => {
            state.width = action.payload.width ?? state.width;
            state.height = action.payload.height ?? state.height;
        },
        setZoom: (state, action: PayloadAction<number>) => {
            state.zoom = action.payload;
        },
        zoomInWheel: (state) => {
            state.zoom = Math.min(state.zoom + 6.25, 625);
        },
        zoomOutWheel: (state) => {
            state.zoom = Math.max(state.zoom - 6.25, 6.25);
        },
        zoomInButton: (state) => {
            state.zoom = Math.min(state.zoom + 10, 625);
        },
        zoomOutButton: (state) => {
            state.zoom = Math.max(state.zoom - 10, 6.25);
        },
        setArtboardOffset: (state, action: PayloadAction<SetOffsetPayload>) => {
            state.offsetX = action.payload.offsetX ?? state.offsetX;
            state.offsetY = action.payload.offsetY ?? state.offsetY;
        },
        moveArtboardLeft: (state) => {
            state.offsetY = state.offsetY - 0.5;
        },
        moveArtboardRight: (state) => {
            state.offsetY = state.offsetY + 0.5;
        },
        moveArtboardUp: (state) => {
            state.offsetX = state.offsetX - 0.5;
        },
        moveArtboardDown: (state) => {
            state.offsetX = state.offsetX + 0.5;
        },
        toggleGridDisplay: (state) => {
            state.displayGrid = !state.displayGrid;
        },
        setGridInterval: (state, action: PayloadAction<number>) => {
            state.gridInterval = Math.min(Math.max(Math.round(action.payload), 5), 100);
        },
        toggleDark: (state) => {
            state.dark = !state.dark;
        }
    }
} );

export const {
    setArtboardDimensions,
    setZoom,
    zoomInWheel,
    zoomOutWheel,
    zoomInButton,
    zoomOutButton,
    setArtboardOffset,
    moveArtboardLeft,
    moveArtboardRight,
    moveArtboardUp,
    moveArtboardDown,
    toggleGridDisplay,
    setGridInterval,
    toggleDark
} = artboardSlice.actions;
export default artboardSlice.reducer;
