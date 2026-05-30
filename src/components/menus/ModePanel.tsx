import { useAppDispatch, useAppSelector } from "../../types";
import { panMode, pathMode } from "../../redux/modeSlice";

export default function ModePanel() {
    const dispatch = useAppDispatch();
    const editMode = useAppSelector(state => state.editMode);

    return (
        <div className="menu-panel">
            <div className="menu-header">Mode</div>
            <button
                disabled={editMode === "pan"}
                onClick={() => dispatch(panMode())}
            >
                🎥 <b>Pan</b>
            </button>
            <button
                disabled={editMode === "path"}
                onClick={() => dispatch(pathMode())}
            >
                👆 <b>Path</b>
            </button>
        </div>
    );
}