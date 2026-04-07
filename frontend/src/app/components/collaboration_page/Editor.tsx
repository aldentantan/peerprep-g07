import { MonacoBinding } from "y-monaco";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import Editor from "@monaco-editor/react";

interface EditorProps {
    roomId: string;
    programmingLanguage: string;
}

export default function UIEditor({ roomId, programmingLanguage }: EditorProps) {

    const wsScheme = window.location.protocol === "https:" ? "wss" : "ws";
    const wsBaseUrl = import.meta.env.VITE_YJS_WS_URL || `${wsScheme}://${window.location.host}/ws/yjs`;

    // Attach Yjs + Monaco collaborative binding when editor is mounted.
    const handleEditorMount = (editor: any) => {
        if (!roomId) {
            return;
        }

        const ydoc = new Y.Doc();
        const provider = new WebsocketProvider(wsBaseUrl, roomId, ydoc);
        const yText = ydoc.getText("monaco");
        const binding = new MonacoBinding(yText, editor.getModel(), new Set([editor]));

        editor.onDidDispose(() => {
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
            onMount={(editor: any) => handleEditorMount(editor)}
        />
    )
}