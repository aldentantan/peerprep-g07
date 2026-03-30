import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Code2, Users, LogOut, User, Radio } from "lucide-react";
import Chatbox from "./Chatbox";
import { useSearchParams, useNavigate } from "react-router-dom";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { useEffect, useMemo, useState } from "react";
import { MonacoBinding } from "y-monaco";
import Editor from "@monaco-editor/react";

const languageMap: Record<string, string> = {
  "javascript": "JavaScript",
  "python": "Python",
  "java": "Java",
  "cpp": "C++",
  "typescript": "TypeScript",
  "go": "Go",
  "ruby": "Ruby",
  "csharp": "C#",
};


type ChatMessage = {
  id: string;
  user: string;
  message: string;
  timestamp: number;
};

type RoomData = {
  question: string;
  questionId?: string;
  questionTitle?: string;
  questionDescription?: string;
  programmingLanguage: string;
  questionTopic: string;
  questionDifficulty: string;
  participantUserIds?: string[];
  chatLog: ChatMessage[];
};

type Participant = {
  id: string;
  name: string;
  status: string;
  isCurrentUser: boolean;
};

type JwtPayload = {
  id?: string;
  sub?: string;
  email?: string;
  username?: string;
};

export function CollaborationWorkspace() {
  // Build API/WS base URLs from env with sensible local defaults.
  const baseApiUrl = import.meta.env.VITE_API_URL || "/api";
  const apiBaseUrl = `${baseApiUrl.replace(/\/$/, "")}/collab`;
  const wsScheme = window.location.protocol === "https:" ? "wss" : "ws";
  const wsBaseUrl = import.meta.env.VITE_YJS_WS_URL || `${wsScheme}://${window.location.host}/ws/yjs`;
  const chatWsBaseUrl = import.meta.env.VITE_CHAT_WS_URL || `${wsScheme}://${window.location.host}/ws/chat`;

  // Screen state for room data loading and failure handling.
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Pull roomId from URL query string (?roomId=...).
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get("roomId");
  const navigate = useNavigate();

  // Decode the JWT payload once so identity fields can be reused.
  const tokenPayload = useMemo<JwtPayload | null>(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      return null;
    }

    try {
      const payloadSegment = token.split(".")[1];
      const normalized = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
      return JSON.parse(atob(padded)) as JwtPayload;
    } catch {
      return null;
    }
  }, []);

  // Prefer username from JWT, then local storage, then generated fallback.
  const username = useMemo(() => {
    if (tokenPayload?.username && tokenPayload.username.trim()) {
      localStorage.setItem("peerprep_username", tokenPayload.username);
      return tokenPayload.username;
    }

    const existingUser = localStorage.getItem("peerprep_username");
    if (existingUser) {
      return existingUser;
    }

    const generatedUser = `User-${Math.floor(Math.random() * 10000)}`;
    localStorage.setItem("peerprep_username", generatedUser);
    return generatedUser;
  }, [tokenPayload]);

  // Keep a set of identifiers to reliably detect "current user" in participant IDs.
  const currentUserIdentifiers = useMemo(() => {
    const identifiers = [
      tokenPayload?.id,
      tokenPayload?.sub,
      tokenPayload?.email,
      tokenPayload?.username,
      username,
    ]
      .map((value) => (value === undefined || value === null ? "" : `${value}`.trim()))
      .filter((value) => value !== "");

    return new Set(identifiers);
  }, [tokenPayload, username]);

  // Build the participant list from room data with de-duplication and self-labeling.
  const participants = useMemo<Participant[]>(() => {
    const roomParticipantIds = roomData?.participantUserIds || [];
    const participantList: Participant[] = [];
    const addedIds = new Set<string>();

    roomParticipantIds.forEach((participantId) => {
      if (!participantId || addedIds.has(participantId)) {
        return;
      }

      const isCurrentUser = currentUserIdentifiers.has(participantId);
      const fallbackName = isCurrentUser ? username : participantId;

      participantList.push({
        id: participantId,
        name: fallbackName,
        status: "in room",
        isCurrentUser,
      });
      addedIds.add(participantId);
    });

    if (!participantList.some((participant) => participant.isCurrentUser)) {
      participantList.unshift({
        id: username,
        name: username,
        status: "online",
        isCurrentUser: true,
      });
    }

    return participantList;
  }, [roomData, currentUserIdentifiers, username]);

  // Fetch room metadata and chat history from collaboration API whenever room changes.
  useEffect(() => {
    if (!roomId) {
      setIsLoading(false);
      setLoadError("Room ID is missing");
      return;
    }

    const fetchRoom = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const token = localStorage.getItem("token");
        const res = await fetch(`${apiBaseUrl}/room/${roomId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!res.ok) {
          throw new Error("Room not found");
        }

        const data = (await res.json()) as RoomData;
        setRoomData({
          question: data.question,
          questionId: data.questionId,
          questionTitle: data.questionTitle,
          questionDescription: data.questionDescription,
          programmingLanguage: data.programmingLanguage,
          questionTopic: data.questionTopic.charAt(0).toUpperCase() + data.questionTopic.slice(1).toLowerCase(),
          questionDifficulty: data.questionDifficulty.charAt(0).toUpperCase() + data.questionDifficulty.slice(1).toLowerCase(),
          participantUserIds: data.participantUserIds,
          chatLog: data.chatLog,
        });
      } catch (err) {
        console.error("Failed to fetch room:", err);
        setLoadError("Failed to load room data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoom();
  }, [roomId, apiBaseUrl]);

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

  // Leave room and clear local room marker used for quick re-entry.
  const handleLeaveRoom = () => {
    localStorage.removeItem("roomId");
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white px-8 py-6 rounded-xl shadow-md flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-700 font-semibold">Loading Page...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return <p>{loadError}</p>;
  }

  if (!roomData) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-4 text-white shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Collaboration Workspace</h1>
              <p className="text-purple-100 text-sm">Live coding session with your peer</p>
            </div>
          </div>
          <Button
            className="bg-red-500/80 text-white hover:bg-red-600 border-red-400/30"
            size="sm"
            onClick={handleLeaveRoom}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Leave Room
          </Button>
        </div>
      </div>

      <div className="border-4 border-gray-300 rounded-lg p-4 bg-white">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h2 className="text-xl font-semibold text-gray-900">{roomData.questionTitle}</h2>
              <Badge className="bg-green-100 text-green-800 border border-green-300">
                {roomData.questionDifficulty}
              </Badge>
              <Badge variant="secondary" className="border border-gray-300">
                {roomData.questionTopic}
              </Badge>
              <Badge variant="outline" className="border border-orange-300 bg-orange-50 text-orange-700">
                <Radio className="h-3 w-3 mr-1 animate-pulse" />
                Live Session
              </Badge>
            </div>
            <p className="text-sm text-gray-600">{roomData.questionDescription}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:items-stretch">
        <div className="border-4 border-gray-300 rounded-lg p-4 bg-white space-y-3 lg:col-span-1">
          <div className="flex items-center gap-2 text-gray-800 pb-2 border-b-2 border-gray-200">
            <Users className="h-5 w-5" />
            <h3 className="font-semibold">Participants</h3>
          </div>

          <div className="space-y-2">
            {participants.map((user) => (
              <div key={user.id} className="flex items-center gap-3 p-3 border-2 border-gray-300 rounded-lg bg-gray-50">
                <div className="w-10 h-10 border-2 border-gray-400 rounded-full flex items-center justify-center bg-white flex-shrink-0">
                  <User className="w-5 h-5 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-gray-900 truncate">
                      {user.name}
                      {user.isCurrentUser ? " (You)" : ""}
                    </p>
                    <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  </div>
                  <p className="text-xs text-gray-600">{user.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-4 border-gray-300 rounded-lg p-4 bg-white space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between pb-2 border-b-2 border-gray-200">
            <div className="flex items-center gap-2 text-gray-800">
              <Code2 className="h-5 w-5" />
              <h3 className="font-semibold">Code Editor</h3>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs border border-gray-300">{languageMap[roomData.programmingLanguage]}</Badge>
            </div>
          </div>

          <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50 font-mono text-sm min-h-[400px]">
            <div className="space-y-2 text-gray-700">
              <Editor
                key={roomId ?? "default-room"}
                height="400px"
                language={roomData.programmingLanguage}
                defaultValue=""
                theme="vs-dark"
                onMount={(editor: any) => handleEditorMount(editor)}
              />
            </div>
          </div>
        </div>

        <Chatbox
          roomId={roomId}
          wsBaseUrl={chatWsBaseUrl}
          username={username}
          initialMessages={roomData.chatLog || []}
        />
      </div>
    </div>
  );
}
