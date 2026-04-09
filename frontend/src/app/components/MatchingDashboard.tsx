import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  Target,
  Users,
  UserX,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../app/components/ui/alert-dialog";
import { Badge } from "../../app/components/ui/badge";
import { Button } from "../../app/components/ui/button";
import { Label } from "../../app/components/ui/label";
import { getTopics } from "../services/questionService";
import { extractApiErrorMessage } from "../utils/apiError";
import { getProfileByUsername, UserProfile } from "../services/authService";

type MatchingState =
  | "idle"
  | "searching"
  | "matched"
  | "timeout"
  | "abandoned"
  | "pendingAcceptTimeoutNotice";

interface MatchInfo {
  roomId: string;
  users: [string, string];
  createdAt: number;
  topic: string;
  difficulty: string;
  language: string;
}

interface PendingMatchInfo {
  pendingMatchId: string;
  users: [string, string];
  createdAt: number;
  topic: string;
  difficulty: string;
  language: string;
}

interface MatchingDashboardProps {
  onMatchingStateChange?: (isSearching: boolean) => void;
}
  const MATCH_ACCEPT_TIMEOUT_SECONDS = 20;
const TOPIC_MAP: Record<string, string> = {
  "Algorithms": "algorithms",
  "Data Structures": "data-structures",
  "Dynamic Programming": "dynamic-programming",
  "Graphs": "graphs",
  "Trees": "trees",
  "Arrays": "arrays",
  "Strings": "strings",
  "System Design": "system-design",
  "Linked Lists": "linked-lists",
};

const normalizeTopicForMatching = (topic: string) =>
  TOPIC_MAP[topic] ||
  topic
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function MatchingDashboard({ onMatchingStateChange }: MatchingDashboardProps) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("Medium");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("JavaScript");
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(true);
  const [topicsError, setTopicsError] = useState("");
  const [matchingState, setMatchingState] = useState<MatchingState>("idle");
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [showWarning, setShowWarning] = useState(false);
  const [matchData, setMatchData] = useState<MatchInfo | null>(null);
  const [pendingMatchData, setPendingMatchData] = useState<PendingMatchInfo | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string>("");
  const [peerUserProfile, setPeerUserProfile] = useState<UserProfile | null>(null);
  const [hasAcceptedMatch, setHasAcceptedMatch] = useState(false);
  const [matchAcceptTimeRemaining, setMatchAcceptTimeRemaining] = useState(MATCH_ACCEPT_TIMEOUT_SECONDS);
  const [pendingAcceptTimeoutSeconds, setPendingAcceptTimeoutSeconds] = useState(5);
  const [pendingAcceptTimeoutReason, setPendingAcceptTimeoutReason] = useState("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const hasAcceptedMatchRef = useRef(false); // cannot use useState as websocket will capture the value on websocket creation. updates to the state will not be reflected by WS

  const resetToIdleAfterPendingTimeoutNotice = () => {
    setMatchingState("idle");
    setMatchData(null);
    setPendingMatchData(null);
    setHasAcceptedMatch(false);
    setPendingAcceptTimeoutSeconds(5);
    setPendingAcceptTimeoutReason("");
    setMatchAcceptTimeRemaining(MATCH_ACCEPT_TIMEOUT_SECONDS);
    setTimeRemaining(30);
    setShowWarning(false);
  };

  const difficulties = ["Easy", "Medium", "Hard"];
  const languages = [
    "JavaScript",
    "Python",
    "Java",
    "C++",
    "TypeScript",
    "Go",
    "Ruby",
    "C#",
  ];

  const languageMap: Record<string, string> = {
    "JavaScript": "javascript",
    "Python": "python",
    "Java": "java",
    "C++": "cpp",
    "TypeScript": "typescript",
    "Go": "go",
    "Ruby": "ruby",
    "C#": "csharp",
  };

  const handleStartMatching = () => {
    if (!selectedTopic) {
      setErrorMessage("Please select a topic before starting matching.");
      return;
    }

    // Close any stale WebSocket from a previous attempt
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setMatchingState("searching");
    setTimeRemaining(30);
    setShowWarning(false);
    setMatchData(null);
    setPendingMatchData(null);
    setHasAcceptedMatch(false);
    setErrorMessage("");
    setMatchAcceptTimeRemaining(MATCH_ACCEPT_TIMEOUT_SECONDS);
    setPendingAcceptTimeoutSeconds(5);
    setPendingAcceptTimeoutReason("");

    const token = localStorage.getItem("token");
    let username = "";
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        username = payload.username || payload.id || payload.sub || payload.email || "";
      } catch {
        // ignore malformed token
      }
    }

    if (!username) {
      setMatchingState("idle");
      setErrorMessage("You must be logged in to match.");
      return;
    }

    setCurrentUsername(username);

    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3004/api";
    // Derive WS URL from the API URL: http(s)://host:port/api -> ws(s)://host:port/ws/match
    const baseUrl = apiUrl.replace(/\/api\/?$/, "");
    const wsUrl = baseUrl.replace(/^http/, "ws") + `/ws/match?userId=${encodeURIComponent(username)}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: "enqueue",
        topic: normalizeTopicForMatching(selectedTopic),
        difficulty: selectedDifficulty.toLowerCase(),
        language: languageMap[selectedLanguage] || selectedLanguage.toLowerCase(),
      }));
    };

    ws.onmessage = (event) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      if (msg.type === "queued") {
        // Already showing "searching" state
      } else if (msg.type === "match_pending") {
        const pendingMatch = msg.pendingMatch as PendingMatchInfo;
        const remainingTime = Math.max(
          0,
          MATCH_ACCEPT_TIMEOUT_SECONDS - Math.floor((Date.now() - pendingMatch.createdAt) / 1000),
        );
        setMatchingState("matched");
        setPendingMatchData(pendingMatch);
        setHasAcceptedMatch(false);
        setMatchAcceptTimeRemaining(remainingTime);
      } else if (msg.type === "match_confirmed") {
        const confirmedMatch = msg.match as MatchInfo;
        setMatchData(confirmedMatch);
        setPendingMatchData(null);
        setHasAcceptedMatch(false);
        setMatchAcceptTimeRemaining(MATCH_ACCEPT_TIMEOUT_SECONDS);
        navigate(`/collaboration?roomId=${encodeURIComponent(confirmedMatch.roomId)}`);
      } else if (msg.type === "matched") {
        setMatchingState("matched");
        console.log("Match found:", msg.match);
        const confirmedMatch = msg.match as MatchInfo;
        setMatchData(confirmedMatch);
        setMatchAcceptTimeRemaining(MATCH_ACCEPT_TIMEOUT_SECONDS);
        navigate(`/collaboration?roomId=${encodeURIComponent(confirmedMatch.roomId)}`);
      } else if (msg.type === "timeout") {
        setMatchingState("timeout");
      } else if (msg.type === "pending_accept_timeout") {
        const timeoutReason = hasAcceptedMatchRef.current
          ? "The user you were matched with did not accept in time."
          : "You did not accept the match in time.";
        setPendingAcceptTimeoutReason(timeoutReason);
        setPendingAcceptTimeoutSeconds(5);
        setErrorMessage("");
        setMatchingState("pendingAcceptTimeoutNotice");
      } else if (msg.type === "match_abandoned") {
        setMatchingState("abandoned");
      } else if (msg.type === "error") {
        setErrorMessage(msg.message as string);
        setMatchingState("idle");
      }
    };

    ws.onerror = () => {
      setErrorMessage("Connection error. Please try again.");
      setMatchingState("idle");
    };

    ws.onclose = () => {
      wsRef.current = null;
    };
  };

  const handleCancelMatching = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "cancel" }));
      wsRef.current.close();
    }
    wsRef.current = null;
    setMatchingState("idle");
    setTimeRemaining(30);
    setShowWarning(false);
  };

  const handleRetry = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setMatchingState("idle");
    setTimeRemaining(30);
    setShowWarning(false);
    setMatchData(null);
    setPendingMatchData(null);
    setHasAcceptedMatch(false);
    setMatchAcceptTimeRemaining(MATCH_ACCEPT_TIMEOUT_SECONDS);
    setPendingAcceptTimeoutSeconds(5);
    setPendingAcceptTimeoutReason("");
    setErrorMessage("");
  };

  const confirmAbandon = () => {
    setShowAbandonConfirm(false);
    // Notify server that this user is abandoning the match
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "abandon" }));
      wsRef.current.close();
    }
    wsRef.current = null;
    setMatchingState("idle");
    setMatchData(null);
    setPendingMatchData(null);
    setHasAcceptedMatch(false);
    setMatchAcceptTimeRemaining(MATCH_ACCEPT_TIMEOUT_SECONDS);
    setPendingAcceptTimeoutSeconds(5);
    setPendingAcceptTimeoutReason("");
  };

  const navigate = useNavigate();


  // This is to check if users are in an exisiting room and they have close the tab, 
  // if yes then navigate to the collaboration page
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3004/api";

    const resolveExistingRoom = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${apiUrl.replace(/\/$/, "")}/collab/my-room`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { roomId?: string };
        if (data.roomId) {
          navigate(`/collaboration?roomId=${encodeURIComponent(data.roomId)}`);
        }
      } catch {
        // Ignore lookup failures and stay on the matching page.
      }
    };

    void resolveExistingRoom();
  }, [navigate]);

  useEffect(() => {
    let isCancelled = false;

    const fetchAvailableTopics = async () => {
      setIsLoadingTopics(true);
      setTopicsError("");

      try {
        const data = await getTopics();
        if (isCancelled) {
          return;
        }

        setAvailableTopics(data.topics);
        setSelectedTopic((currentTopic) => {
          if (currentTopic && data.topics.includes(currentTopic)) {
            return currentTopic;
          }

          return data.topics[0] ?? "";
        });

        if (data.topics.length === 0) {
          setTopicsError("No topics are currently available.");
        }
      } catch (err: unknown) {
        if (isCancelled) {
          return;
        }

        setAvailableTopics([]);
        setSelectedTopic("");
        setTopicsError(extractApiErrorMessage(err, "Failed to load topics"));
      } finally {
        if (!isCancelled) {
          setIsLoadingTopics(false);
        }
      }
    };

    fetchAvailableTopics();

    return () => {
      isCancelled = true;
    };
  }, []);

  // This is to navigate to collaboration page after matching
  const navigateToCollaboration = () => {
    if (pendingMatchData) {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        setErrorMessage("Matching connection is closed. Please retry.");
        setMatchingState("idle");
        setPendingMatchData(null);
        setHasAcceptedMatch(false);
        setMatchAcceptTimeRemaining(MATCH_ACCEPT_TIMEOUT_SECONDS);
        return;
      }

      if (hasAcceptedMatch) {
        return;
      }

      wsRef.current.send(JSON.stringify({
        type: "accept_match",
        pendingMatchId: pendingMatchData.pendingMatchId,
      }));
      setHasAcceptedMatch(true);
      hasAcceptedMatchRef.current = true;
      return;
    }

    const targetRoomId = matchData?.roomId;
    if (!targetRoomId) return;

    navigate(`/collaboration?roomId=${encodeURIComponent(targetRoomId)}`);
  }

  const matchedUsers = pendingMatchData?.users ?? matchData?.users ?? null;
  const matchedPeerId = matchedUsers
    ? matchedUsers.find((username) => username !== currentUsername) ?? matchedUsers[0]
    : "";
  const matchedDifficulty = pendingMatchData?.difficulty;
  const matchedTopic = pendingMatchData?.topic.replace(/-/g, " ");
  const matchedLanguage = pendingMatchData?.language;

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  // Client-side countdown timer for display
  useEffect(() => {
    hasAcceptedMatchRef.current = hasAcceptedMatch;
  }, [hasAcceptedMatch]);

  useEffect(() => {
    if (matchingState !== "searching") return;
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === 11) setShowWarning(true);
        if (prev <= 1) {
          clearInterval(timer);
          // Safety net: trigger timeout locally if server message hasn't arrived
          setMatchingState("timeout");
          if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [matchingState]);

  useEffect(() => {
    if (matchingState !== "matched" || !pendingMatchData) return;

    const updateRemainingTime = () => {
      const remainingTime = Math.max(
        0,
        MATCH_ACCEPT_TIMEOUT_SECONDS - Math.floor((Date.now() - pendingMatchData.createdAt) / 1000),
      );
      setMatchAcceptTimeRemaining(remainingTime);
    };

    updateRemainingTime();
    const timer = window.setInterval(updateRemainingTime, 1000);

    return () => window.clearInterval(timer);
  }, [matchingState, pendingMatchData]);

  useEffect(() => {
    if (matchingState !== "pendingAcceptTimeoutNotice") return;

    const timeoutId = window.setTimeout(() => {
      if (pendingAcceptTimeoutSeconds <= 1) {
        resetToIdleAfterPendingTimeoutNotice();
        return;
      }
      setPendingAcceptTimeoutSeconds((previousSeconds) => previousSeconds - 1);
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [matchingState, pendingAcceptTimeoutSeconds]);

  // Notify parent when matching state changes
  useEffect(() => {
    onMatchingStateChange?.(matchingState === "searching");
  }, [matchingState, onMatchingStateChange]);

  useEffect(() => {
    if (matchedPeerId) {
      getProfileByUsername(matchedPeerId).then(setPeerUserProfile);
    } else {
      setPeerUserProfile(null);
    }
  }, [matchedPeerId]);

  useEffect(() => {
    if (matchingState === "idle") {
      setShowWarning(false);
    }
  }, [matchingState]);

  return (
    <div className="space-y-6">
      <div className="max-w-4xl mx-auto">
      {/* Matching Header Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-4 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Find a Match</h1>
            <p className="text-purple-100 text-sm">Get paired with a peer to practice coding together</p>
          </div>
        </div>
      </div>
      </div>

      <div className="max-w-4xl mx-auto">

        {/* Selection Panel - Only show when idle */}
        {matchingState === "idle" && (
          <div className="border-4 border-gray-300 rounded-lg p-8 bg-white space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                Select Your Preferences
              </h2>
              <p className="text-gray-600">
                Choose a difficulty level, topic and language to get matched with another user
              </p>
            </div>

            {/* Difficulty Selection */}
            <div className="space-y-3">
              <Label className="text-gray-700 text-base">
                Difficulty Level
              </Label>
              <div className="grid grid-cols-3 gap-3">
                {difficulties.map((difficulty) => (
                  <button
                    key={difficulty}
                    onClick={() => setSelectedDifficulty(difficulty)}
                    className={`p-4 border-3 rounded-lg font-medium transition-all ${
                      selectedDifficulty === difficulty
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-lg">{difficulty}</div>
                      {difficulty === "Easy" && (
                        <div className="text-xs mt-1 opacity-70">Beginner friendly</div>
                      )}
                      {difficulty === "Medium" && (
                        <div className="text-xs mt-1 opacity-70">Moderate challenge</div>
                      )}
                      {difficulty === "Hard" && (
                        <div className="text-xs mt-1 opacity-70">Advanced problems</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Topic Selection */}
            <div className="space-y-3">
              <Label className="text-gray-700 text-base">
                Topic
              </Label>
              {isLoadingTopics ? (
                <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
                  Loading available topics...
                </div>
              ) : availableTopics.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {availableTopics.map((topic) => (
                    <button
                      key={topic}
                      onClick={() => setSelectedTopic(topic)}
                      className={`p-3 border-3 rounded-lg font-medium text-sm transition-all relative ${
                        selectedTopic === topic
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                      }`}
                    >
                      {selectedTopic === topic && (
                        <div className="absolute top-1 right-1 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-3 h-3 text-white" />
                        </div>
                      )}
                      {topic}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {topicsError || "No topics available for matching right now."}
                </div>
              )}
            </div>

            {/* Language Selection */}
            <div className="space-y-3">
              <Label className="text-gray-700 text-base">
                Preferred Language
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {languages.map((language) => (
                  <button
                    key={language}
                    onClick={() => setSelectedLanguage(language)}
                    className={`p-3 border-3 rounded-lg font-medium text-sm transition-all relative ${
                      selectedLanguage === language
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                    }`}
                  >
                    {selectedLanguage === language && (
                      <div className="absolute top-1 right-1 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-3 h-3 text-white" />
                      </div>
                    )}
                    {language}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Preferences Summary */}
            <div className="p-4 bg-gray-50 border-2 border-gray-200 rounded-lg">
              <div className="text-sm text-gray-600 mb-2">Your Selection:</div>
              <div className="flex gap-3 flex-wrap">
                <Badge className="bg-blue-600 text-white px-3 py-1">
                  {selectedDifficulty}
                </Badge>
                <Badge className="bg-purple-600 text-white px-3 py-1">
                  {selectedTopic || "No topic available"}
                </Badge>
                <Badge className="bg-green-600 text-white px-3 py-1">
                  {selectedLanguage}
                </Badge>
              </div>
            </div>

            {/* Start Matching Button */}
            <Button
              onClick={handleStartMatching}
              disabled={isLoadingTopics || availableTopics.length === 0 || !selectedTopic}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base"
            >
              <Users className="mr-2 h-5 w-5" />
              {isLoadingTopics ? "Loading Topics..." : "Start Matching"}
            </Button>

            {/* Warning/Error Message */}
            {(errorMessage || topicsError) && (
              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg mt-4">
                <div className="flex items-start gap-2 text-sm text-red-800">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    {errorMessage || topicsError}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Searching State */}
        {matchingState === "searching" && (
          <div className="border-4 border-blue-300 rounded-lg p-8 bg-white space-y-6">
            {/* Timer Badge - Top Right */}
            <div className="flex justify-end -mt-4 -mr-4 mb-2">
              <div className="bg-blue-600 text-white px-4 py-2 rounded-bl-lg rounded-tr-lg flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className="font-semibold">{timeRemaining}s remaining</span>
              </div>
            </div>

            <div className="text-center space-y-6">
              <div className="w-24 h-24 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-gray-800">
                  Finding Your Match...
                </h2>

                <p className="text-gray-600">
                  Searching for another user with the same preferences
                </p>
              </div>

              {/* Current Selection */}
              <div className="inline-flex gap-3 flex-wrap justify-center">
                <Badge className="bg-blue-600 text-white px-4 py-2 text-base">
                  {selectedDifficulty}
                </Badge>
                <Badge className="bg-purple-600 text-white px-4 py-2 text-base">
                  {selectedTopic}
                </Badge>
                <Badge className="bg-green-600 text-white px-4 py-2 text-base">
                  {selectedLanguage}
                </Badge>
              </div>

              {/* Progress Indicator */}
              <div className="pt-4">
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                  <span>Looking for available users...</span>
                </div>
              </div>

              {/* Users in Queue Info */}
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <div className="flex items-center justify-center gap-3">
                  <Users className="w-5 h-5 text-blue-600" />
                  <div className="text-left">
                    <div className="text-sm text-blue-600 font-medium">
                      Waiting for another user...
                    </div>
                    <div className="text-xs text-blue-500">
                      You'll be matched when someone joins with the same preferences
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 15 Second Warning Banner */}
            {showWarning && (
              <div className="p-4 bg-orange-50 border-2 border-orange-300 rounded-lg animate-pulse">
                <div className="flex items-start gap-3 text-sm text-orange-900">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-orange-600" />
                  <div className="text-left">
                    <p className="font-semibold mb-1">⚠️ Queue Timeout Warning</p>
                    <p>You will be removed from the matching queue in <span className="font-bold">{timeRemaining} seconds</span> if no match is found.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Cancel Button */}
            <Button
              onClick={handleCancelMatching}
              variant="outline"
              className="w-full border-2 border-gray-300 h-11"
            >
              Cancel Matching
            </Button>
          </div>
        )}

        {/* Matched State */}
        {matchingState === "matched" && (
          <div className="border-4 border-green-300 rounded-lg p-8 bg-white space-y-6">
            <div className="flex justify-end -mt-4 -mr-4 mb-2">
              <div className="bg-orange-500 text-white px-4 py-2 rounded-bl-lg rounded-tr-lg flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className="font-semibold">Both users have to accept in {matchAcceptTimeRemaining}s</span>
              </div>
            </div>

            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>

              <h2 className="text-2xl font-semibold text-gray-800">
                Match Found!
              </h2>

              <p className="text-gray-600">
                You've been matched with another user
              </p>

              {/* Matched User Info */}
              <div className="p-6 bg-green-50 border-2 border-green-200 rounded-lg">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className="w-16 h-16 border-3 border-gray-400 rounded-full flex items-center justify-center bg-gray-100">
                    {peerUserProfile?.profile_image_url ? (
                      <img
                        src={peerUserProfile.profile_image_url}
                        alt="Profile"
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <Users className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-gray-900 text-lg">
                      {peerUserProfile?.username || matchedPeerId || "Matched User"}
                    </div>
                    <div className="text-sm text-gray-600">Online now</div>
                  </div>
                </div>

                <div className="flex gap-3 flex-wrap justify-center">
                  <Badge className="bg-blue-600 text-white px-3 py-1 capitalize">
                    {matchedDifficulty}
                  </Badge>
                  <Badge className="bg-purple-600 text-white px-3 py-1 capitalize">
                    {matchedTopic}
                  </Badge>
                  <Badge className="bg-green-600 text-white px-3 py-1 capitalize">
                    {matchedLanguage}
                  </Badge>
                </div>
              </div>

              {/* Success Message */}
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <div className="flex items-start gap-2 text-sm text-blue-800">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    {hasAcceptedMatch
                      ? "Acceptance sent. Waiting for your peer to accept before navigation."
                      : "Both users must click accept before automatic navigation to the collaborative workspace."}
                    <br />
                    This match will expire if both users do not accept in time.
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={navigateToCollaboration}
                disabled={hasAcceptedMatch}
                className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-base disabled:bg-green-300"
              >
                <CheckCircle className="mr-2 h-5 w-5" />
                {hasAcceptedMatch ? "Waiting for Peer Acceptance..." : "Accept Match"}
              </Button>
            </div>
          </div>
        )}

        {/* Abandoned State - partner left */}
        {matchingState === "abandoned" && (
          <div className="border-4 border-orange-300 rounded-lg p-8 bg-white space-y-6">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto bg-orange-100 rounded-full flex items-center justify-center">
                <UserX className="w-10 h-10 text-orange-600" />
              </div>

              <h2 className="text-2xl font-semibold text-gray-800">
                Match Abandoned
              </h2>

              <p className="text-gray-600">
                Your match partner has left and is looking for a new match.
              </p>

              <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
                <div className="flex items-start gap-2 text-sm text-orange-800">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    You can try matching again with the same or different preferences.
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={handleRetry}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base"
            >
              Find a New Match
            </Button>
          </div>
        )}

        {/* Pending Accept Timeout Notice */}
        {matchingState === "pendingAcceptTimeoutNotice" && (
          <div className="border-4 border-orange-300 rounded-lg p-8 bg-white space-y-6">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto bg-orange-100 rounded-full flex items-center justify-center">
                <Clock className="w-10 h-10 text-orange-600" />
              </div>

              <h2 className="text-2xl font-semibold text-gray-800">
                Match Acceptance Timed Out
              </h2>

              <p className="text-gray-600">
                {pendingAcceptTimeoutReason}
              </p>

              <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
                <div className="text-sm text-orange-800">
                  Redirecting to match criteria selection in <span className="font-bold">{pendingAcceptTimeoutSeconds}s</span>
                </div>
              </div>
            </div>

            <Button
              onClick={resetToIdleAfterPendingTimeoutNotice}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base"
            >
              Return Now
            </Button>
          </div>
        )}

        {/* Timeout State */}
        {matchingState === "timeout" && (
          <div className="border-4 border-red-300 rounded-lg p-8 bg-white space-y-6">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>

              <h2 className="text-2xl font-semibold text-gray-800">
                Matching Timeout
              </h2>

              <p className="text-gray-600">
                No match found within the time limit
              </p>

              {/* Timeout Info */}
              <div className="p-6 bg-red-50 border-2 border-red-200 rounded-lg">
                <div className="text-sm text-red-800 mb-3">
                  We couldn't find another user with these preferences:
                </div>
                <div className="flex gap-3 flex-wrap justify-center">
                  <Badge className="bg-blue-600 text-white px-3 py-1">
                    {selectedDifficulty}
                  </Badge>
                  <Badge className="bg-purple-600 text-white px-3 py-1">
                    {selectedTopic}
                  </Badge>
                  <Badge className="bg-green-600 text-white px-3 py-1">
                    {selectedLanguage}
                  </Badge>
                </div>
              </div>

              {/* Suggestions */}
              <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2 text-sm text-yellow-800">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    <div className="font-semibold mb-1">Suggestions:</div>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Try a different difficulty level</li>
                      <li>Select a more popular topic</li>
                      <li>Try again during peak hours</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Retry Button */}
            <Button
              onClick={handleRetry}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base"
            >
              Try Again
            </Button>
          </div>
        )}
      </div>

      {/* Abandon Match Confirmation Dialog */}
      <AlertDialog open={showAbandonConfirm} onOpenChange={setShowAbandonConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Abandon this match?</AlertDialogTitle>
            <AlertDialogDescription>
              Your partner will be notified that you have left. Are you sure you want to find a different match?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-black">Stay</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAbandon}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Leave &amp; Find New Match
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
