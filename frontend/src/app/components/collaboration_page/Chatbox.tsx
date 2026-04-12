import { Send, MessageSquare } from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";

type ChatMessage = {
    id: string;
    user: string;
    message: string;
    timestamp: number;
};

type ChatboxProps = {
    roomId: string | null;
    wsBaseUrl: string;
    username: string;
    initialMessages: ChatMessage[];
    onUserLeft?: (username: string) => void;
    onUserJoined?: (username: string) => void;
};

export type ChatboxHandle = {
    sendUserLeft: (username: string) => void;
    closeSocket: () => void;
};

const Chatbox = forwardRef<ChatboxHandle, ChatboxProps>(function Chatbox(
    { roomId, wsBaseUrl, initialMessages, username, onUserLeft, onUserJoined }: ChatboxProps,
    ref,
) {
    const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
    const [draft, setDraft] = useState("");
    const socketRef = useRef<WebSocket | null>(null);

    useImperativeHandle(ref, () => ({
        sendUserLeft: (departingUsername: string) => {
            const socket = socketRef.current;
            if (!socket || socket.readyState !== WebSocket.OPEN) {
                return;
            }

            socket.send(
                JSON.stringify({
                    type: "user_left",
                    user: departingUsername,
                }),
            );
        },
        closeSocket: () => {
            const socket = socketRef.current;
            if (socket && socket.readyState !== WebSocket.CLOSED) {
                socket.close();
            }
            socketRef.current = null;
        },
    }), []);

    useEffect(() => {
        setMessages(initialMessages);
    }, [initialMessages]);

    useEffect(() => {
        if (!roomId) {
            return;
        }

        const ws = new WebSocket(`${wsBaseUrl}/${roomId}`);
        socketRef.current = ws;

        ws.onopen = () => {
            // Send user_joined event when first connecting
            ws.send(
                JSON.stringify({
                    type: "user_joined",
                    user: username,
                }),
            );
        };

        ws.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data);
                if (payload.type === "chat_message" && payload.payload) {
                    setMessages((prev) => [...prev, payload.payload as ChatMessage]);
                } else if (payload.type === "user_left" && payload.payload?.user) {
                    onUserLeft?.(`${payload.payload.user}`);
                } else if (payload.type === "user_joined" && payload.payload?.user) {
                    onUserJoined?.(`${payload.payload.user}`);
                }
            } catch (err) {
                console.error("Failed to parse chat message:", err);
            }
        };

        ws.onerror = (err) => {
            console.error("Chat websocket error:", err);
        };

        ws.onclose = () => {
            if (socketRef.current === ws) {
                socketRef.current = null;
            }
        };

        return () => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
            if (socketRef.current === ws) {
                socketRef.current = null;
            }
        };
    }, [roomId, wsBaseUrl, username, onUserLeft, onUserJoined]);

    const handleSend = () => {
        const trimmed = draft.trim();
        const socket = socketRef.current;
        if (!trimmed || !socket || socket.readyState !== WebSocket.OPEN) {
            return;
        }

        socket.send(
            JSON.stringify({
                type: "chat_message",
                user: username,
                message: trimmed,
            }),
        );

        setDraft("");
    };

    const formatTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <div className="border-4 border-gray-300 rounded-lg p-4 bg-white space-y-3 lg:col-span-1 h-[550px] overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 text-gray-800 pb-2 border-b-2 border-gray-200">
                <MessageSquare className="h-5 w-5" />
                <h3 className="font-semibold">Chat</h3>
            </div>

            <div className="space-y-3 flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1">
                {messages.map((msg) => {
                    const isOwnMessage = msg.user === username;

                    return (
                        <div
                            key={msg.id}
                            className={`space-y-1 flex flex-col ${isOwnMessage ? "items-end" : "items-start"}`}
                        >
                            <div className={`flex items-baseline gap-2 ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                                <span className="font-medium text-sm text-gray-900">{msg.user}</span>
                                <span className="text-xs text-gray-500">{formatTime(msg.timestamp)}</span>
                            </div>
                            <div
                                className={`border-2 rounded-lg p-2 max-w-[85%] ${
                                    isOwnMessage ? "border-blue-200 bg-blue-50" : "border-gray-300 bg-gray-50"
                                }`}
                            >
                                <p
                                    className={`text-sm whitespace-pre-wrap break-words ${
                                        isOwnMessage ? "text-right text-gray-800" : "text-left text-gray-700"
                                    }`}
                                >
                                    {msg.message}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="pt-3 border-t-2 border-gray-200">
                <div className="flex gap-2">
                    <Textarea
                        placeholder="Type a message..."
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        className="min-h-[60px] border-2 border-gray-300 resize-none"
                    />
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white self-end" onClick={handleSend}>
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
});

Chatbox.displayName = "Chatbox";

export default Chatbox;