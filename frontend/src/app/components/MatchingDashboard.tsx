import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Label } from "@/app/components/ui/label";
import { Checkbox } from "@/app/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Target,
  AlertTriangle,
  UserX,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";

type MatchingState = "idle" | "searching" | "matched" | "timeout" | "abandoned";

interface MatchInfo {
  matchId: string;
  users: [string, string];
  createdAt: number;
  topic: string;
  difficulty: string;
  language: string;
}

interface MatchingDashboardProps {
  onNavigateToCollaboration: () => void;
  onMatchingStateChange?: (isSearching: boolean) => void;
}

export function MatchingDashboard({ onNavigateToCollaboration, onMatchingStateChange }: MatchingDashboardProps) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("Medium");
  const [selectedTopic, setSelectedTopic] = useState<string>("Algorithms");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("JavaScript");
  const [matchingState, setMatchingState] = useState<MatchingState>("idle");
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [showWarning, setShowWarning] = useState(false);
  const [matchData, setMatchData] = useState<MatchInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const difficulties = ["Easy", "Medium", "Hard"];
  const topics = [
    "Algorithms",
    "Data Structures",
    "Dynamic Programming",
    "Graphs",
    "Trees",
    "Arrays",
    "Strings",
    "System Design",
    "Linked Lists",
  ];
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

  // Map display names to backend enum values
  const topicMap: Record<string, string> = {
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
    // Close any stale WebSocket from a previous attempt
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setMatchingState("searching");
    setTimeRemaining(30);
    setShowWarning(false);
    setErrorMessage("");

    const token = localStorage.getItem("token");
    let userId = "";
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        userId = payload.id || payload.sub || payload.email || "";
      } catch {
        // ignore malformed token
      }
    }

    if (!userId) {
      setMatchingState("idle");
      setErrorMessage("You must be logged in to match.");
      return;
    }

    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3004/api";
    // Derive WS URL from the API URL: http(s)://host:port/api -> ws(s)://host:port/ws/match
    const baseUrl = apiUrl.replace(/\/api\/?$/, "");
    const wsUrl = baseUrl.replace(/^http/, "ws") + `/ws/match?userId=${encodeURIComponent(userId)}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: "enqueue",
        topic: topicMap[selectedTopic] || selectedTopic.toLowerCase(),
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
      } else if (msg.type === "matched") {
        setMatchingState("matched");
        setMatchData(msg.match as MatchInfo);
      } else if (msg.type === "timeout") {
        setMatchingState("timeout");
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
    setErrorMessage("");
  };

  const handleFindAnotherMatch = () => {
    setShowAbandonConfirm(true);
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
  };

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  // Client-side countdown timer for display
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

  // Notify parent when matching state changes
  useEffect(() => {
    onMatchingStateChange?.(matchingState === "searching");
  }, [matchingState, onMatchingStateChange]);

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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {topics.map((topic) => (
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
                  {selectedTopic}
                </Badge>
                <Badge className="bg-green-600 text-white px-3 py-1">
                  {selectedLanguage}
                </Badge>
              </div>
            </div>

            {/* Start Matching Button */}
            <Button 
              onClick={handleStartMatching}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base"
            >
              <Users className="mr-2 h-5 w-5" />
              Start Matching
            </Button>

            {/* Warning/Error Message */}
            {errorMessage && (
              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg mt-4">
                <div className="flex items-start gap-2 text-sm text-red-800">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    {errorMessage}
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

              {/* Progress Indicator */}
              <div className="pt-4">
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                  <span>Looking for available users...</span>
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
                    <Users className="w-8 h-8 text-gray-400" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-gray-900 text-lg">
                      Anonymous User #2847
                    </div>
                    <div className="text-sm text-gray-600">Online now</div>
                  </div>
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

              {/* Success Message */}
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <div className="flex items-start gap-2 text-sm text-blue-800">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    You will now be redirected to a collaborative workspace with an appropriate question
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button 
                onClick={onNavigateToCollaboration}
                className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-base"
              >
                <CheckCircle className="mr-2 h-5 w-5" />
                Continue to Workspace
              </Button>
              <Button 
                onClick={handleFindAnotherMatch}
                variant="outline"
                className="w-full border-2 border-gray-300 h-11"
              >
                Find Another Match
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