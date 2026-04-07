import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function MatchingPage() {
    const matchWsUrl = import.meta.env.VITE_MATCH_WS_URL || "ws://localhost:8080"

    const navigate = useNavigate()
    const [isFindingMatch, setIsFindingMatch] = useState(false)
    const [ws, setWs] = useState<WebSocket | null>(null)
    const [text, setText] = useState("")

    // Creates a new WebSocket connection when the page loads
    useEffect(() => {
        const storedRoomId = localStorage.getItem("roomId")

        // Automatically reconnect user if user refreshes the page or disconnects without leaving the page
        if (storedRoomId) {
            navigate(`/codingspace?roomId=${storedRoomId}`)
            return
        }

        // When opening the matching page, immediately creates a client websocket 
        // meant for matchingmaking service
        const socket = new WebSocket(matchWsUrl);

        socket.onopen = () => console.log("WebSocket connected"); 
        socket.onmessage = (event) => {
            const data = JSON.parse(event.data)
            if (data.type === "match_found") {
                console.log("Match found, room ID: ", data.roomId)
                console.log("Matched with another user!")
                localStorage.setItem("roomId", data.roomId)
                navigate(`/codingspace?roomId=${data.roomId}`)
            }
        }
        setWs(socket)

        return () => socket.close()

    }, [navigate, matchWsUrl])

    const handleFindMatch = () => {
        if (!ws || !text) {
            console.log("WebSocket not connected or text is empty")
            return
        }

        // Cancel matchmaking still not working well
        if (isFindingMatch) {
            console.log("Cancelling match search")
            setIsFindingMatch(!isFindingMatch)
            return
        } else {
            // start matachmaking
            console.log("Finding match with text: ", text)
            ws.send(JSON.stringify({ type: "find_match", text }))
            setIsFindingMatch(!isFindingMatch)
        }
    }

    return (
        <>
            <div>
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder='enter the room code'
                />
                <button onClick={() => handleFindMatch()}>
                    {isFindingMatch ? "Finding Match..." : "Find Match"}
                </button>
            </div>
        </>
    )
}
