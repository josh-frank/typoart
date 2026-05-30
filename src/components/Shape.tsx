import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../types";
import { activateShape, deactivateShape } from "../redux/shapesSlice";
import { Path } from "../utilities/PathParser";
import Handle from "./Handle";

interface ShapeProps {
    descriptor: string;
}

export default function Shape({ descriptor }: ShapeProps) {
    const dispatch = useAppDispatch();
    const active = useAppSelector(state => state.shapes.activeShape === descriptor);
    const { dark } = useAppSelector(state => state.artboard);
    const [hover, toggleHover] = useState(false);
    const { zoom, offsetX, offsetY } = useAppSelector(state => state.artboard);

    const shapePath = active && new Path( descriptor );
    // console.log( 'shapePath: ', shapePath );

    const activate = (): void => {
        dispatch(activateShape(descriptor));
    };

    const deactivate = (): void => {
        dispatch(deactivateShape());
    };

    return (
        <g transform={`translate(${offsetY.toFixed(2)} ${offsetX.toFixed(2)}) scale(${zoom / 100} ${zoom / 100})`}>
            <path
                d={descriptor}
                stroke={hover || active ? "red" : dark ? "white" : "black"}
                strokeWidth="1"
                fill={dark ? "black" : "white"}
                onMouseEnter={() => toggleHover(true)}
                onMouseLeave={() => toggleHover(false)}
                onClick={active ? deactivate : activate}
            />
            {active && shapePath?.parsedCommands
                .filter(parsedCommand => parsedCommand.commandLetter.toLowerCase() !== "z")
                .map(parsedCommand => (
                    <Handle
                        key={parsedCommand.index}
                        parsedCommand={parsedCommand}
                    />
                ))
            }
        </g>
    );
}