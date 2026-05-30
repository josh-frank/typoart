import { configureStore } from "@reduxjs/toolkit";
import artboardReducer from "./artboardSlice";
import shapesReducer from "./shapesSlice";
import modeReducer from "./modeSlice";
import fontReducer from "./fontSlice";

const store = configureStore({
    reducer: {
        artboard: artboardReducer,
        shapes: shapesReducer,
        editMode: modeReducer,
        font: fontReducer,
    }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
