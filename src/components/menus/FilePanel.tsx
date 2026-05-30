import { useRef } from "react";
import { useAppDispatch, useAppSelector } from "../../types";
import { loadShapes } from "../../redux/shapesSlice";
import { downloadArtboardAsSvg, parsePathsFromSvg } from "../../utilities/fileUtilities";

export default function FilePanel() {
    const dispatch = useAppDispatch();
    const { activeShape, inactiveShapes } = useAppSelector(state => state.shapes);
    const { width, height } = useAppSelector(state => state.artboard);
    const uploadRef = useRef<HTMLInputElement>(null);

    const handleUpload = (uploadEvent: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFile = uploadEvent.target.files?.[0];
        if (uploadedFile && uploadedFile.type === "image/svg+xml") {
            const fileReader = new FileReader();
            fileReader.onload = async (loadEvent) => {
                const result = loadEvent.target?.result;
                if (typeof result === 'string') {
                    dispatch(loadShapes(parsePathsFromSvg(result)));
                }
            };
            fileReader.readAsText(uploadedFile);
        }
    };

    const handleDownload = () => {
        downloadArtboardAsSvg(
            activeShape ? [activeShape, ...inactiveShapes] : [...inactiveShapes],
            [width, height]
        );
    };

    return (
        <div className="menu-panel">
            <div className="menu-header">File</div>
            <input
                type="file"
                ref={uploadRef}
                onChange={handleUpload}
                hidden
            />
            <button onClick={() => {
                alert("This will erase your artboard!");
                uploadRef.current?.click();
            }}>
                🗂 <b>Load from SVG</b>
            </button>
            <button onClick={handleDownload}>〈／〉 <b>Download as SVG</b></button>
        </div>
    );
}