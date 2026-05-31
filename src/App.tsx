import './App.css';

import { useRef } from 'react';
import { useAppDispatch, useAppSelector } from './types';
import { toggleDark, zoomInButton, zoomOutButton } from './redux/artboardSlice';
import { loadFont } from './redux/fontSlice';
import { parseBinaryFont, parseYamlFont } from './utilities/fontLoader';
import { saveAsYaml, exportAsOtf } from './utilities/fileUtilities';

import Artboard from './components/Artboard';
import GlyphBrowser from './components/GlyphBrowser';
import MainMenu from './components/menus/MainMenu';
import ArtboardMenu from './components/menus/ArtboardMenu';

const SIDEBAR_WIDTH = "14rem";

function App() {
    const dispatch = useAppDispatch();
    const { dark } = useAppSelector(state => state.artboard);
    const fontState = useAppSelector(state => state.font);
    const { fileName } = fontState;
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileOpen = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const name = file.name.toLowerCase();
            if (name.endsWith(".otf") || name.endsWith(".ttf")) {
                const buffer = await file.arrayBuffer();
                dispatch(loadFont(await parseBinaryFont(buffer, file.name)));
            } else if (name.endsWith(".yaml") || name.endsWith(".yml")) {
                dispatch(loadFont(await parseYamlFont(await file.text(), file.name)));
            } else {
                alert("Please open a .otf, .ttf, or .yaml font file.");
            }
        } catch (err) {
            alert(`Could not load font: ${(err as Error).message}`);
        }
        e.target.value = "";
    };

    const hasFontLoaded = !!fileName;

    const TopBar = () => (
        <div style={{
            position: "fixed",
            top: 0,
            left: SIDEBAR_WIDTH,
            right: 0,
            height: "2.25rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0 0.75rem",
            background: dark ? "#111" : "#e8e8e8",
            borderBottom: `1px solid ${dark ? "#333" : "#ccc"}`,
            zIndex: 500,
            fontSize: "0.78rem",
            color: dark ? "#ccc" : "#444",
        }}>
            <input
                ref={fileInputRef}
                type="file"
                accept=".otf,.ttf,.yaml,.yml"
                onChange={handleFileOpen}
                style={{ display: "none" }}
            />
            <button
                onClick={() => fileInputRef.current?.click()}
                style={topBtnStyle(dark)}
            >
                📂 Open font…
            </button>
            <button
                onClick={() => saveAsYaml(fontState)}
                disabled={!hasFontLoaded}
                title={hasFontLoaded ? undefined : "Open a font first"}
                style={topBtnStyle(dark, !hasFontLoaded)}
            >
                💾 Save YAML
            </button>
            <button
                onClick={() => exportAsOtf(fontState)}
                disabled={!hasFontLoaded}
                title={hasFontLoaded ? undefined : "Open a font first"}
                style={topBtnStyle(dark, !hasFontLoaded)}
            >
                ⬆️ Export OTF
            </button>
            {fileName && (
                <span style={{ opacity: 0.6, fontStyle: "italic" }}>{fileName}</span>
            )}
            <div style={{ marginLeft: "auto", display: "flex", gap: "0.3rem" }}>
                <button
                    onClick={() => dispatch(toggleDark())}
                    title="Toggle dark mode"
                    style={btnStyle(dark)}
                >
                    {dark ? "☼" : "☾"}
                </button>
                <button onClick={() => dispatch(zoomInButton())} style={btnStyle(dark)}>＋</button>
                <button onClick={() => dispatch(zoomOutButton())} style={btnStyle(dark)}>－</button>
            </div>
        </div>
    );

    return (
        <main style={{
            width: "100vw",
            height: "100vh",
            overflow: "hidden",
            margin: 0,
            display: "flex",
        }}>
            {/* Left sidebar - glyph browser */}
            <GlyphBrowser />

            {/* Main area - shifted right of sidebar */}
            <div style={{
                marginLeft: SIDEBAR_WIDTH,
                flex: 1,
                position: "relative",
                overflow: "hidden",
            }}>
                <TopBar />
                {/* Artboard fills the space below the top bar */}
                <div style={{ marginTop: "2.25rem", height: "calc(100vh - 2.25rem)", overflow: "hidden" }}>
                    <Artboard />
                </div>
            </div>

            {/* Sendero's existing menus — hidden when font mode is active,
                but kept in tree so path editing still works */}
            <div style={{ display: "none" }}>
                <MainMenu />
            </div>
            <ArtboardMenu />
        </main>
    );
}

function topBtnStyle(dark: boolean, disabled = false): React.CSSProperties {
    return {
        padding: "0.2rem 0.6rem",
        fontSize: "0.75rem",
        cursor: disabled ? "default" : "pointer",
        border: `1px solid ${dark ? "#555" : "#bbb"}`,
        background: dark ? "#222" : "#fff",
        color: disabled ? (dark ? "#555" : "#bbb") : (dark ? "#ddd" : "#333"),
        borderRadius: "3px",
        opacity: disabled ? 0.5 : 1,
    };
}

function btnStyle(dark: boolean): React.CSSProperties {
    return {
        width: "1.8rem",
        height: "1.8rem",
        border: `1px solid ${dark ? "#555" : "#bbb"}`,
        background: dark ? "#222" : "#fff",
        color: dark ? "#ddd" : "#333",
        borderRadius: "3px",
        cursor: "pointer",
        fontSize: "0.85rem",
        padding: 0,
    };
}

export default App;
