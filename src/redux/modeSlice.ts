import { createSlice } from "@reduxjs/toolkit";

export type EditMode = "pan" | "path";

export interface ModeState {
    value: EditMode;
}

const initialState: EditMode = "pan";

const modeSlice = createSlice({
    name: "editMode",
    initialState,
    reducers: {
        panMode: () => "pan" as const,
        pathMode: () => "path" as const
    }
});

export const { panMode, pathMode } = modeSlice.actions;
export default modeSlice.reducer;