import { useSearchParams } from "react-router-dom";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { useEffect, useState, useMemo } from "react";
import { MonacoBinding } from "y-monaco"
import Editor from "@monaco-editor/react"
import { useNavigate } from 'react-router-dom'
import Chatbox from "./Chatbox";

type ChatMessage = {
    id: string
    user: string
    message: string
    timestamp: number
}

export default function CodingSpace() {
    const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000"
    const wsBaseUrl = import.meta.env.VITE_YJS_WS_URL || "ws://localhost:8081/yjs"
    const chatWsBaseUrl = import.meta.env.VITE_CHAT_WS_URL || "ws://localhost:8081/chat"

    // Need to fetch question and programming language from backend instead of using props
    const [roomData, setRoomData] = useState<{
        question: string,
        programmingLanguage: string,
        chatLog: ChatMessage[]
    } | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)

    // Get roomID from URL
    const [searchParams] = useSearchParams();
    const roomId = searchParams.get("roomId")
    const navigate = useNavigate()

    // Run this only on initial rendering so that the username doesnt change on every render
    const username = useMemo(() => {
        const existingUser = localStorage.getItem("peerprep_username")
        if (existingUser) {
            return existingUser
        }

        const generatedUser = `User-${Math.floor(Math.random() * 10000)}`
        localStorage.setItem("peerprep_username", generatedUser)
        return generatedUser
    }, [])

    useEffect(() => {
        if (!roomId) {
            setIsLoading(false)
            setLoadError("Room ID is missing")
            return
        }

        // API call for getting question and programming language
        const fetchRoom = async () => {
            try {
                setIsLoading(true)
                setLoadError(null)
                const res = await fetch(`${apiBaseUrl}/room/${roomId}`)

                if (!res.ok) {
                    throw new Error("Room not found")
                }

                const data = await res.json()
                setRoomData(data)

            } catch (err) {
                console.error("Failed to fetch room:", err)
                setLoadError("Failed to load room data")
            } finally {
                setIsLoading(false)
            }
        }

        fetchRoom()
    }, [roomId, apiBaseUrl])

    const handleEditorMount = (editor: Editor) => {
        if (!roomId) return

        // 1. Create Yjs doc
        const ydoc = new Y.Doc()

        // 2. Connect to Yjs server
        const provider = new WebsocketProvider(
            wsBaseUrl,
            roomId,
            ydoc
        )

        // 3. Create shared text
        const yText = ydoc.getText("monaco")

        // 4. Bind Monaco editor to Yjs
        const binding = new MonacoBinding(
            yText,
            editor.getModel(),
            new Set([editor])
        )

        // 5. Cleanup when component unmounts
        editor.onDidDispose(() => {
            binding.destroy()
            provider.destroy()
            ydoc.destroy()
        })
    }

    const handleLeaveRoom = () => {
        localStorage.removeItem("roomId")
        navigate(`/`)
    }

    return (
        <>
            {isLoading ? (
                <div className="min-h-screen flex items-center justify-center bg-gray-100">
                    <div className="bg-white px-8 py-6 rounded-xl shadow-md flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-gray-700 font-semibold">Loading Page...</p>
                    </div>
                </div>
            ) : loadError ? (
                <p>{loadError}</p>
            ) : roomData ? (
                <>
                    <div style={{ minHeight: "100vh", width: "100%", padding: "24px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px", alignItems: "start" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                <h5>Question: {roomData.question}</h5>

                                <p>Language: {roomData.programmingLanguage}</p>

                                <Editor
                                    key={roomId}
                                    height="300px"
                                    language={roomData.programmingLanguage}
                                    defaultValue=""
                                    theme="vs-dark"
                                    onMount={(editor) => handleEditorMount(editor)}
                                />
                                <button
                                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded position-left mt-10"
                                    onClick={() => handleLeaveRoom()}
                                >
                                    Leave Room
                                </button>
                            </div>

                            <div>
                                <Chatbox
                                    roomId={roomId}
                                    wsBaseUrl={chatWsBaseUrl}
                                    username={username}
                                    initialMessages={roomData.chatLog || []}
                                />
                            </div>
                        </div>
                    </div>
                </>
            ) : null}
        </>
    )
}
