"use client";

import { javascript } from "@codemirror/lang-javascript";
import { lintGutter, setDiagnostics, type Diagnostic } from "@codemirror/lint";
import { EditorSelection, Prec } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import { useEffect, useMemo, useState } from "react";

export interface Marker {
  line: number;
  column: number;
  severity: "error" | "warning" | "info";
  message: string;
}

// Let the card's surface show through, so the editor sits flush in the playground's frame.
const frame = Prec.highest(
  EditorView.theme({
    "&": { backgroundColor: "transparent" },
    ".cm-gutters": { backgroundColor: "transparent", border: "none" },
    ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "color-mix(in srgb, var(--accent) 7%, transparent)" },
  }),
);

function useDarkMode(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setDark(mq.matches);
    const on = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return dark;
}

/** Code editor with retrysafe findings shown as diagnostics. `focusLine` scrolls to and selects a line. */
export default function Editor({
  value,
  language,
  onChange,
  markers,
  focusLine,
}: {
  value: string;
  language: "ts" | "other";
  onChange: (v: string) => void;
  markers: Marker[];
  focusLine?: { line: number; nonce: number };
}) {
  const dark = useDarkMode();
  const [view, setView] = useState<EditorView>();
  const extensions = useMemo(() => [lintGutter(), EditorView.lineWrapping, frame, ...(language === "ts" ? [javascript({ typescript: true, jsx: true })] : [])], [language]);

  useEffect(() => {
    if (!view) return;
    const doc = view.state.doc;
    const diagnostics: Diagnostic[] = markers
      .filter((m) => m.line >= 1 && m.line <= doc.lines)
      .map((m) => {
        const line = doc.line(m.line);
        const from = Math.min(line.from + Math.max(0, m.column - 1), line.to);
        return { from, to: line.to, severity: m.severity, message: m.message, source: "retrysafe" };
      });
    view.dispatch(setDiagnostics(view.state, diagnostics));
  }, [view, markers, value]);

  useEffect(() => {
    if (!view || !focusLine) return;
    const doc = view.state.doc;
    if (focusLine.line < 1 || focusLine.line > doc.lines) return;
    const line = doc.line(focusLine.line);
    view.dispatch({ selection: EditorSelection.range(line.from, line.to), effects: EditorView.scrollIntoView(line.from, { y: "center" }) });
    view.focus();
  }, [view, focusLine]);

  return (
    <CodeMirror
      value={value}
      height="100%"
      theme={dark ? "dark" : "light"}
      extensions={extensions}
      onChange={onChange}
      onCreateEditor={(v) => setView(v)}
      basicSetup={{ foldGutter: false, highlightActiveLine: true }}
      className="h-full"
    />
  );
}
