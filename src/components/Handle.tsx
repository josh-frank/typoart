import type { ParsedCommand } from "../utilities/PathParser";

interface HandleProps {
    parsedCommand: ParsedCommand;
}

interface QuadPolylineProps {
    parsedCommand: ParsedCommand;
}

export default function Handle({ parsedCommand }: HandleProps) {

    const QuadPolyline = ({ parsedCommand }: QuadPolylineProps) => {
        return parsedCommand.commandLetter.toLowerCase() === "q" && (
            <polyline
                points={parsedCommand.quadPolyLine?.().join(" ") || ""}
                fill="none"
                stroke="red"
            />
        );
    };

    return (
        <g>
            <circle
                data-name="point"
                data-command-index={parsedCommand.index}
                cx={parsedCommand.endPoint[0]}
                cy={parsedCommand.endPoint[1]}
                r="4"
                fill="red"
            />
            {parsedCommand.startHandlePoint && (
                <>
                    <circle
                        data-name="startHandle"
                        data-command-index={parsedCommand.index}
                        cx={parsedCommand.startHandlePoint[0]}
                        cy={parsedCommand.startHandlePoint[1]}
                        r="4"
                        fill="red"
                    />
                    <line
                        x1={parsedCommand.startPoint[0]}
                        y1={parsedCommand.startPoint[1]}
                        x2={parsedCommand.startHandlePoint[0]}
                        y2={parsedCommand.startHandlePoint[1]}
                        stroke="red"
                    />
                </>
            )}
            {parsedCommand.endHandlePoint && (
                <>
                    <circle
                        data-name="endHandle"
                        data-command-index={parsedCommand.index}
                        cx={parsedCommand.endHandlePoint[0]}
                        cy={parsedCommand.endHandlePoint[1]}
                        r="4"
                        fill="red"
                    />
                    <line
                        x1={parsedCommand.endPoint[0]}
                        y1={parsedCommand.endPoint[1]}
                        x2={parsedCommand.endHandlePoint[0]}
                        y2={parsedCommand.endHandlePoint[1]}
                        stroke="red"
                    />
                </>
            )}
            <QuadPolyline parsedCommand={parsedCommand} />
        </g>
    );
}