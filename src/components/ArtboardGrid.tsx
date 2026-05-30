import { useAppSelector } from "../types";

function gridLineSpacing(range: number, unit: number): number[] {
  return [...Array(Math.floor(range / unit) + 1).keys()].map(i => i * unit);
}

export default function ArtboardGrid() {
  const { width, height, zoom, offsetX, offsetY, gridInterval } = useAppSelector(state => state.artboard);

  const HorizontalLines = () => gridLineSpacing(height, gridInterval).map(line => (
    <g key={line}>
      <text
        x="0.25"
        y={line}
        fill="lightgray"
        fontFamily="Arial Narrow"
        fontSize="3px"
        letterSpacing="-0.2px"
        transform="translate(0, -0.5)"
      >
        {line}
      </text>
      <line
        x1="0"
        y1={line}
        x2={width}
        y2={line}
        stroke="lightgray"
        strokeWidth="0.5"
      />
    </g>
  ));

  const VerticalLines = () => gridLineSpacing(width, gridInterval).map(line => (
    <g key={line}>
      <text
        x={line}
        y="0.25"
        fill="lightgray"
        writingMode="vertical-rl"
        fontFamily="Arial Narrow"
        fontSize="3px"
        letterSpacing="-0.2px"
        transform="translate(2)"
      >
        {line}
      </text>
      <line
        x1={line}
        y1="0"
        x2={line}
        y2={height}
        stroke="lightgray"
        strokeWidth="0.5"
      />
    </g>
  ));

  return (
    <g transform={`translate(${offsetY.toFixed(2)} ${offsetX.toFixed(2)}) scale(${zoom / 100} ${zoom / 100})`}>
      <HorizontalLines />
      <VerticalLines />
    </g>
  );
}
