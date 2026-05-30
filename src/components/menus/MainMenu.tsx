import { useState } from "react";
import { useAppSelector } from "../../types";
import type { Transformation } from "../../types";
import CommandsPanel from "./CommandsPanel";
import FilePanel from "./FilePanel";
import ModePanel from "./ModePanel";
import PathPanel from "./PathPanel";
import TransformPanel from "./TransformPanel";
import ShapesPanel from "./ShapesPanel";

export default function MainMenu() {
    const { dark } = useAppSelector(state => state.artboard);
    const [manualPathEdit, setManualPathEdit] = useState<string | null>(null);
    const [transformation, setTransformation] = useState<Transformation>({
        translate: [1, 1],
        scale: [1, 1],
        rotate: 0
    });
    const [collapseMenu, toggleCollapseMenu] = useState(false);

    return (
        <div className="menu-container">
            {!collapseMenu && (
                <section className={dark ? "menu dark" : "menu light"}>
                    <FilePanel />
                    <ModePanel />
                    <ShapesPanel />
                    <PathPanel
                        manualPathEdit={manualPathEdit}
                        setManualPathEdit={setManualPathEdit}
                    />
                    <TransformPanel
                        transformation={transformation}
                        setTransformation={setTransformation}
                    />
                    <CommandsPanel />
                </section>
            )}
            <button
                className={dark ? "collapse-button dark" : "collapse-button light"}
                onClick={() => toggleCollapseMenu(!collapseMenu)}
            >
                {collapseMenu ? "▶" : "◀"}
            </button>
        </div>
    );
}
