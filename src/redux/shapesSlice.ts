import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export interface ShapesState {
    inactiveShapes: string[];
    activeShape: string | null;
}

const initialState: ShapesState = {
    inactiveShapes: [],
    activeShape: null
};

const shapesSlice = createSlice({
    name: "shapes",
    initialState,
    reducers: {
        loadShapes: (state, action: PayloadAction<string[]>) => {
            state.inactiveShapes = action.payload;
            state.activeShape = null;
        },
        addShape: (state, action: PayloadAction<string>) => {
            state.inactiveShapes.push(action.payload);
        },
        removeShape: (state, action: PayloadAction<string>) => {
            state.inactiveShapes = state.inactiveShapes.filter(shape => shape !== action.payload);
            if (action.payload === state.activeShape) {
                state.activeShape = null;
            }
        },
        activateShape: (state, action: PayloadAction<string>) => {
            const filteredShapes = state.inactiveShapes.filter(shape => shape !== action.payload);
            if (state.activeShape) {
                filteredShapes.push(state.activeShape);
            }
            state.inactiveShapes = filteredShapes;
            state.activeShape = action.payload;
        },
        deactivateShape: (state) => {
            if (state.activeShape) {
                state.inactiveShapes.push(state.activeShape);
                state.activeShape = null;
            }
        },
        updateActiveShape: (state, action: PayloadAction<string>) => {
            state.activeShape = action.payload;
        }
    }
} );

export const {
    loadShapes,
    addShape,
    removeShape,
    activateShape,
    deactivateShape,
    updateActiveShape
} = shapesSlice.actions;
export default shapesSlice.reducer;