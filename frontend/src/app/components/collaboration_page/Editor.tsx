import { MonacoBinding } from "y-monaco";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import Editor from "@monaco-editor/react";
import { forwardRef, useImperativeHandle, useRef } from "react";

interface EditorProps {
    roomId: string;
    programmingLanguage: string;
}

export interface UIEditorHandle {
    getValue: () => string;
}

const UIEditor = forwardRef<UIEditorHandle, EditorProps>(function UIEditor(
    { roomId, programmingLanguage },
    ref,
) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const monacoEditorRef = useRef<any>(null);

    const wsScheme = window.location.protocol === "https:" ? "wss" : "ws";
    const wsBaseUrl = import.meta.env.VITE_YJS_WS_URL || `${wsScheme}://${window.location.host}/ws/yjs`;

    useImperativeHandle(ref, () => ({
        getValue: () => monacoEditorRef.current?.getValue?.() ?? "",
    }), []);

    // Attach Yjs + Monaco collaborative binding when editor is mounted.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleEditorMount = (editor: any) => {
        if (!roomId) {
            return;
        }

        monacoEditorRef.current = editor;

        const ydoc = new Y.Doc();
        const provider = new WebsocketProvider(wsBaseUrl, roomId, ydoc);
        const yText = ydoc.getText("monaco");
        const binding = new MonacoBinding(yText, editor.getModel(), new Set([editor]));

        editor.onDidDispose(() => {
            monacoEditorRef.current = null;
            binding.destroy();
            provider.destroy();
            ydoc.destroy();
        });
    };

    return (
        <Editor
            key={roomId}
            height="400px"
            language={programmingLanguage}
            defaultValue=""
            theme="vs-dark"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onMount={(editor: any) => handleEditorMount(editor)}
        />
    );
});

export default UIEditor;