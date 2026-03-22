import { Send, MessageSquare } from "lucide-react"

const mockMessages = [
    { id: "1", user: "Alex", time: "10:21", message: "Can you explain your approach for two pointers?" },
    { id: "2", user: "Sam", time: "10:22", message: "Sure — sort first, then move left/right based on sum." }
]

export default function Chatbox() {
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
                {mockMessages.map((msg) => (
                    <div key={msg.id} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                            <span style={{ fontWeight: 500, fontSize: "14px", color: "#111827" }}>{msg.user}</span>
                            <span style={{ fontSize: "12px", color: "#6b7280" }}>{msg.time}</span>
                        </div>
                        <div style={{ border: "2px solid #d1d5db", borderRadius: "8px", padding: "8px", backgroundColor: "#f9fafb" }}>
                            <p style={{ margin: 0, fontSize: "14px", color: "#374151" }}>{msg.message}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Message Input */}
            <div style={inputSectionStyle}>
                <div style={inputRowStyle}>
                    <textarea
                        placeholder="Type a message..."
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