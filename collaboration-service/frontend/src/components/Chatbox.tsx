import { Send, MessageSquare } from "lucide-react"
import { useEffect, useState } from "react"

type ChatMessage = {
    id: string
    user: string
    message: string
    timestamp: number
}

type ChatboxProps = {
    roomId: string | null
    wsBaseUrl: string
    username: string
    initialMessages: ChatMessage[]
}

export default function Chatbox({ roomId, wsBaseUrl, initialMessages, username }: ChatboxProps) {
    const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
    const [draft, setDraft] = useState("")
    const [socket, setSocket] = useState<WebSocket | null>(null)

    useEffect(() => {
        setMessages(initialMessages)
    }, [initialMessages])

    useEffect(() => {
        if (!roomId) {
            return
        }

        const ws = new WebSocket(`${wsBaseUrl}/${roomId}`)
        setSocket(ws)

        ws.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data)
                if (payload.type === "chat_message" && payload.payload) {
                    setMessages((prev) => [...prev, payload.payload as ChatMessage])
                }
            } catch (err) {
                console.error("Failed to parse chat message:", err)
            }
        }

        ws.onerror = (err) => {
            console.error("Chat websocket error:", err)
        }

        return () => {
            ws.close()
            setSocket(null)
        }
    }, [roomId, wsBaseUrl])

    const handleSend = () => {
        const trimmed = draft.trim()
        if (!trimmed || !socket || socket.readyState !== WebSocket.OPEN) {
            return
        }

        socket.send(
            JSON.stringify({
                type: "chat_message",
                user: username,
                message: trimmed
            })
        )

        setDraft("")
    }

    const formatTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        })
    }

    const containerStyle = {
        display: "flex",
        flexDirection: "column" as const,
        gap: "16px"
    }

    const headerStyle = {
        display: "flex",
        flexDirection: "row" as const,
        gap: "8px",
        color: "#1f2937",
        paddingBottom: "8px",
        borderBottom: "2px solid #e5e7eb",
        alignItems: "center"
    }

    const messagesStyle = {
        display: "flex",
        flexDirection: "column" as const,
        gap: "12px",
        minHeight: "400px",
        maxHeight: "500px",
        overflowY: "auto" as const
    }

    const inputSectionStyle = {
        paddingTop: "12px",
        borderTop: "2px solid #e5e7eb"
    }

    const inputRowStyle = {
        display: "flex",
        gap: "8px"
    }

    return (
        <div style={containerStyle}>
            {/* Chat / Comments Panel */}
            <div style={headerStyle}>
                <MessageSquare size={20} />
                <h3 style={{ fontWeight: 600, margin: 0 }}>Chat</h3>
            </div>

            {/* Messages */}
            <div style={messagesStyle}>
                {messages.map((msg) => {
                    const isCurrentUser = msg.user === username
                    const alignment = isCurrentUser ? "flex-end" : "flex-start"
                    const textAlign = isCurrentUser ? "right" : "left"

                    return (
                        <div
                            key={msg.id}
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "4px",
                                alignItems: alignment
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "baseline", gap: "8px", justifyContent: alignment }}>
                                <span style={{ fontWeight: 500, fontSize: "14px", color: "#111827" }}>{msg.user}</span>
                                <span style={{ fontSize: "12px", color: "#6b7280" }}>{formatTime(msg.timestamp)}</span>
                            </div>
                            <div style={{ border: "2px solid #d1d5db", borderRadius: "8px", padding: "8px", backgroundColor: "#f9fafb", maxWidth: "80%" }}>
                                <p style={{ margin: 0, fontSize: "14px", color: "#374151", textAlign }}>{msg.message}</p>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Message Input */}
            <div style={inputSectionStyle}>
                <div style={inputRowStyle}>
                    <textarea
                        placeholder="Type a message..."
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault()
                                handleSend()
                            }
                        }}
                        style={{
                            minHeight: "60px",
                            border: "2px solid #d1d5db",
                            resize: "none",
                            width: "100%",
                            borderRadius: "8px",
                            padding: "8px"
                        }}
                    />
                    <button
                        type="button"
                        onClick={handleSend}
                        style={{
                            backgroundColor: "#2563eb",
                            color: "white",
                            alignSelf: "flex-end",
                            padding: "8px 12px",
                            borderRadius: "6px",
                            border: "none",
                            cursor: "pointer"
                        }}
                    >
                        <Send size={16} />
                    </button>
                </div>
            </div>
        </div>
    )
}