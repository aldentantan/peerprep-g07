// AI Assistance Disclosure:
// Tool: Github Copilot, date: 2026‑04‑07
// Scope: Generated initial implementation of CollaborationWorkspace to frontend and backend; 
// Add functionality of user awareness when joining and leaving the page;       
// Author review: I validated correctness through user testing, edited for style and consistency, and added comments for clarity. 
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Code2, Users, LogOut, User, Radio, History, Play, Loader2, Terminal, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/app/components/ui/alert-dialog";
import Chatbox, { type ChatboxHandle } from "./Chatbox";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import UIEditor from "./Editor";
import type {UIEditorHandle } from "./Editor";
import { toast } from "sonner";
import {
  createAttemptHistoryEntry,
  getMyAttemptHistory,
  type AttemptHistoryEntry,
} from "@/app/services/attemptHistoryService";
import { getQuestionById } from "@/app/services/questionService";
import { AttemptHistoryPanel } from "@/app/components/AttemptHistoryPanel";
import { toTitleCase } from "@/app/utils/titleCase";
import { getProfileByUsername, UserProfile } from "@/app/services/authService";

const languageMap: Record<string, string> = {
  javascript: "JavaScript",
  python: "Python",
  java: "Java",
  cpp: "C++",
  typescript: "TypeScript",
  go: "Go",
  ruby: "Ruby",
  csharp: "C#",
};

type TestCase = {
  input: string;
  output: string;
};

type TestCaseResult = {
  testCase: TestCase;
  passed: boolean;
  actual: string;
  error?: string;
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
  questionTopics?: string[];
  programmingLanguage: string;
  questionTopic: string;
  questionDifficulty: string;
  participantUsernames: string[];
  testCases?: TestCase[];
  imageUrls?: string[];
  chatLog: ChatMessage[];
};

type Participant = {
  id: string;
  name: string;
  isCurrentUser: boolean;
  profileImageUrl?: string;
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
  const executeApiUrl = `${(import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "")}/execute`;
  const wsScheme = window.location.protocol === "https:" ? "wss" : "ws";
  const chatWsBaseUrl = import.meta.env.VITE_CHAT_WS_URL || `${wsScheme}://${window.location.host}/ws/chat`;

  // Screen state for room data loading and failure handling.
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<AttemptHistoryEntry[]>([]);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [isSubmittingAttempt, setIsSubmittingAttempt] = useState(false);
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);
  const [participantsProfiles, setParticipantsProfiles] = useState<Record<string, UserProfile>>({});

  // Code execution state
  const [isRunning, setIsRunning] = useState(false);
  const [executionResult, setExecutionResult] = useState<{ stdout: string; stderr: string; exitCode: number } | null>(null);
  const [testCaseResults, setTestCaseResults] = useState<TestCaseResult[]>([]);
  const [activeTab, setActiveTab] = useState<"console" | "testcases">("console");
  const [showOutput, setShowOutput] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<UIEditorHandle | null>(null);

  // Pull roomId from URL query string (?roomId=...).
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get("roomId");
  const navigate = useNavigate();
  const chatboxRef = useRef<ChatboxHandle | null>(null);

  // Decode JWT once at mount time so we can consistently identify "who am I"
  // across all participant list transforms.
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

  // Preferred display identity for this client.
  // 1) Use token username when available.
  // 2) Fallback to generated value so the UI still has a stable self label.
  const username = useMemo(() => {
    if (tokenPayload?.username && tokenPayload.username.trim()) {
      return tokenPayload.username;
    }

    const generatedUser = `User-${Math.floor(Math.random() * 10000)}`;
    return generatedUser;
  }, [tokenPayload]);

  // Any value that can represent the current user in room participant entries.
  // This allows the UI to still mark "(You)" even when room data mixes formats
  // (for example, username in one event and userId/email in another).
  // AI-generated (edited by Lim Yun Jie Ernest)
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

  // Build a render-ready participant model from raw room data.
  // Flow:
  // - Read room participant values from `roomData.participantUserIds`
  // - Deduplicate repeated values
  // - Mark which entry belongs to current user
  // - Ensure current user always appears at least once in the list
  // AI-generated (edited by Lim Yun Jie Ernest)
  const participants = useMemo<Participant[]>(() => {
    const roomParticipantUsernames = roomData?.participantUsernames || [];
    const participantList: Participant[] = [];
    const addedIds = new Set<string>();

    roomParticipantUsernames.forEach((participantName) => {
      // Skip empty values and duplicates so each participant row is unique.
      if (!participantName || addedIds.has(participantName)) {
        return;
      }

      const isCurrentUser = currentUserIdentifiers.has(participantName);
      const fallbackName = isCurrentUser ? username : participantName;
      const profileImageUrl = participantsProfiles[participantName]?.profile_image_url;
      participantList.push({
        id: participantName,
        name: fallbackName,
        isCurrentUser,
        profileImageUrl,
      });
      addedIds.add(participantName);
    });

    // Safety net: if backend payload omitted self, inject self row so the
    // participant panel always reflects local presence.
    if (!participantList.some((participant) => participant.isCurrentUser)) {
      participantList.unshift({
        id: username,
        name: username,
        isCurrentUser: true,
        profileImageUrl: participantsProfiles[username]?.profile_image_url,

      });
    }

    return participantList;
  }, [roomData, currentUserIdentifiers, username, participantsProfiles]);

  const displayTopics = useMemo(() => {
    if (!roomData) {
      return [];
    }

    if (roomData.questionTopics && roomData.questionTopics.length > 0) {
      return roomData.questionTopics.map(toTitleCase);
    }

    return roomData.questionTopic ? [toTitleCase(roomData.questionTopic)] : [];
  }, [roomData]);

  const peerName = useMemo(() => {
    const peer = participants.find((p) => !p.isCurrentUser);
    return peer?.name ?? "your peer";
  }, [participants]);

  //AI-generated (edited by Lim Yun Jie Ernest)
  const descriptionParagraphs = useMemo(() => {
    const description = roomData?.questionDescription?.trim() || "";
    if (!description) {
      return [];
    }

    return description
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
  }, [roomData?.questionDescription]);

  // Fetch room metadata and chat history from collaboration API whenever room changes.
  useEffect(() => {
    if (!roomId) {
      setIsLoading(false);
      setLoadError("Room ID is missing");
      return;
    }

    // Check if user is valid to enter collaboration rooom or not
    const validateUserInRoom = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${apiBaseUrl}/my-room`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          navigate("/");
          return false;
        }

        const data = (await response.json()) as { roomId?: string };
        if (!data.roomId || data.roomId !== roomId) {
          navigate("/");
          return false;
        }

        return true;
      } catch {
        navigate("/");
        return false;
      }
    };

    const fetchRoom = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const token = localStorage.getItem("token");
        const res = await fetch(`${apiBaseUrl}/room/${roomId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        console.log("Fetch room response:", res);

        const data = (await res.json()) as RoomData;

        // return to matching page if room is not found
        if (!res.ok) {
          console.log("Room not present: ", data);
          navigate("/");
          return;
        }

        // Room payload is the baseline source of participants for initial render.
        // Subsequent join/leave websocket events update this list incrementally.
        setRoomData({
          question: data.question,
          questionId: data.questionId,
          questionTitle: data.questionTitle,
          questionDescription: data.questionDescription,
          questionTopics: data.questionTopics || [],
          programmingLanguage: data.programmingLanguage,
          questionTopic: toTitleCase(data.questionTopic),
          questionDifficulty: toTitleCase(data.questionDifficulty),
          participantUsernames: data.participantUsernames || [],
          testCases: data.testCases || [],
          imageUrls: data.imageUrls || [],
          chatLog: data.chatLog,
        });
      } catch (err) {
        console.error("Failed to fetch room:", err);
        setLoadError("Failed to load room data");
      } finally {
        setIsLoading(false);
      }
    };

    validateUserInRoom().then((isValidUserInRoom) => {
      if (!isValidUserInRoom) {
        return;
      }
      fetchRoom();
    });
  }, [roomId, apiBaseUrl]);

  useEffect(() => {
    const numericQuestionId = roomData?.questionId ? Number.parseInt(roomData.questionId, 10) : Number.NaN;
    if (!Number.isInteger(numericQuestionId)) {
      setAttempts([]);
      return;
    }

    const fetchAttempts = async () => {
      try {
        setAttemptsLoading(true);
        const response = await getMyAttemptHistory(numericQuestionId);
        setAttempts(response.attempts);
      } catch (err) {
        console.error("Failed to fetch question attempts:", err);
        toast.error("Could not load your attempt history for this question.");
      } finally {
        setAttemptsLoading(false);
      }
    };

    fetchAttempts();
  }, [roomData?.questionId]);

  // AI-generated (edited by Lim Yun Jie Ernest)
  const handleUserLeft = useCallback((departingUser: string) => {
    // Only toast for peers; suppress noisy self-leave notification.
    if (departingUser !== username) {
      toast.info(`${departingUser} has left the room.`);
    }

    setRoomData((prev) => {
      if (!prev?.participantUsernames) {
        return prev;
      }

      // Remove the departing user from local participant list snapshot.
      return {
        ...prev,
        participantUsernames: prev.participantUsernames.filter((username) => username !== departingUser),
      };
    });
  }, [username]);

  // AI-generated (edited by Lim Yun Jie Ernest)
  const handleUserJoined = useCallback((joinedUser: string) => {
    // Show toast only when another user joins, not for self
    if (joinedUser !== username) {
      toast.info(`${joinedUser} has joined the room.`);
    }

    setRoomData((prev) => {
      if (!prev?.participantUsernames) {
        return prev;
      }

      // Add to participants only if not already present to avoid duplicated rows.
      if (!prev.participantUsernames.includes(joinedUser)) {
        return {
          ...prev,
          participantUsernames: [...prev.participantUsernames, joinedUser],
        };
      }

      return prev;
    });
  }, [username]);

  // Best-effort presence update on unload.
  // This helps peers remove this user from their participant panel quickly
  // without waiting for manual refresh.
  // AI-generated (edited by Lim Yun Jie Ernest)
  useEffect(() => {
    const handleBeforeUnload = () => {
      chatboxRef.current?.sendUserLeft(username);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [username]);

  const handleSubmitAttempt = async () => {
    if (!roomData?.questionId) {
      toast.error("This room does not have a valid question ID yet.");
      return;
    }

    const numericQuestionId = Number.parseInt(roomData.questionId, 10);
    if (!Number.isInteger(numericQuestionId)) {
      toast.error("This question cannot be recorded yet.");
      return;
    }

    const submittedCode = editorRef.current?.getValue?.() ?? "";
    if (submittedCode.trim() === "") {
      toast.error("You cannot save an empty attempt.");
      return;
    }

    setIsSubmittingAttempt(true);

    try {
      const { question } = await getQuestionById(numericQuestionId);
      const response = await createAttemptHistoryEntry({
        questionId: numericQuestionId,
        questionTitle: question.title,
        questionDescription: question.description,
        questionDifficulty: question.difficulty,
        questionTopics: question.topics,
        questionImageUrls: question.imageUrls,
        questionUpdatedAt: question.updatedAt,
        submittedCode,
      });

      setAttempts((previousAttempts) => [response.attempt, ...previousAttempts]);
      toast.success(`Attempt recorded for ${username}.`);
    } catch (err) {
      console.error("Failed to submit attempt:", err);
      toast.error("Could not record your attempt. Please try again.");
    } finally {
      setIsSubmittingAttempt(false);
    }
  };

  useEffect(() => {
    // AI-generated (edited by Xiang Yu)
    if (roomData) {
      const fetchParticipantProfiles = async () => {
        const profiles: Record<string, UserProfile> = {};
        // Fetch profiles for all participants in parallel
        await Promise.all((roomData.participantUsernames?.map(async (participantName) => {
          try {
            const profile = await getProfileByUsername(participantName);
            profiles[participantName] = profile;
          } catch (error) {
            console.error(`Failed to fetch profile for user: ${participantName}`, error);
          }
        }) || []));

        setParticipantsProfiles(profiles);
      };

      fetchParticipantProfiles();
    }
  }, [roomData]);


  // Execute code via the code-execution service.
  const executeCode = useCallback(async (code: string, language: string, stdin?: string) => {
    const token = localStorage.getItem("token");
    const res = await fetch(executeApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ language, code, stdin }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { stdout: "", stderr: data.error || "Execution failed", exitCode: -1 };
    }
    return data as { stdout: string; stderr: string; exitCode: number };
  }, [executeApiUrl]);

  // Run code without test cases (free run).
  const handleRunCode = useCallback(async () => {
    const code = editorRef.current?.getValue();
    if (!code || !roomData?.programmingLanguage) {
      toast.error("No code to run");
      return;
    }

    setIsRunning(true);
    setExecutionResult(null);
    setTestCaseResults([]);
    setActiveTab("console");
    setShowOutput(true);

    try {
      const result = await executeCode(code, roomData.programmingLanguage);
      setExecutionResult(result);
    } catch {
      setExecutionResult({ stdout: "", stderr: "Failed to connect to execution service", exitCode: -1 });
    } finally {
      setIsRunning(false);
    }
  }, [executeCode, roomData?.programmingLanguage]);

  // Run code against all test cases. The test cases should be provided by the root admin
  const handleRunTests = useCallback(async () => {
    const code = editorRef.current?.getValue();
    if (!code || !roomData?.programmingLanguage) {
      toast.error("No code to run");
      return;
    }
    const testCases = roomData.testCases || [];
    if (testCases.length === 0) {
      toast.error("No test cases available for this question");
      return;
    }

    setIsRunning(true);
    setExecutionResult(null);
    setTestCaseResults([]);
    setActiveTab("testcases");
    setShowOutput(true);

    const results: TestCaseResult[] = [];

    for (const tc of testCases) {
      try {
        const result = await executeCode(code, roomData.programmingLanguage, tc.input);
        const actualOutput = result.stdout.replace(/\r?\n$/, "");
        const expectedOutput = tc.output.replace(/\r?\n$/, "");
        const passed = result.exitCode === 0 && actualOutput === expectedOutput;
        results.push({
          testCase: tc,
          passed,
          actual: result.stdout || result.stderr,
          error: result.stderr || undefined,
        });
      } catch {
        results.push({
          testCase: tc,
          passed: false,
          actual: "",
          error: "Failed to connect to execution service",
        });
      }
    }

    setTestCaseResults(results);
    setIsRunning(false);

    const passedCount = results.filter((r) => r.passed).length;
    if (passedCount === results.length) {
      toast.success(`All ${results.length} test cases passed!`);
    } else {
      toast.error(`${passedCount}/${results.length} test cases passed`);
    }
  }, [executeCode, roomData?.programmingLanguage, roomData?.testCases]);

  // Leave room explicitly: notify peers and request backend mapping cleanup.
  // AI-generated (edited by Lim Yun Jie Ernest)
  const handleLeaveRoom = useCallback(async () => {
    chatboxRef.current?.sendUserLeft(username);

    try {
      if (roomId) {
        const token = localStorage.getItem("token");
        await fetch(`${apiBaseUrl}/room/${encodeURIComponent(roomId)}/leave`, {
          method: "DELETE",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
      }
    } catch (error) {
      console.error("Failed to delete user-room mapping on leave:", error);
    } finally {
      chatboxRef.current?.closeSocket();
      navigate("/");
    }
  }, [apiBaseUrl, navigate, roomId, username]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-green-100 text-green-800 border-green-300";
      case "Medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "Hard":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
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
              <p className="text-purple-100 text-sm">Live coding session with {peerName}</p>
            </div>
          </div>
          {/* AI-generated (edited by Lim Yun Jie Ernest) */}
          <AlertDialog open={isLeaveConfirmOpen} onOpenChange={setIsLeaveConfirmOpen}>
            <Button
              className="bg-red-500/80 text-white hover:bg-red-600 border-red-400/30"
              size="sm"
              onClick={() => setIsLeaveConfirmOpen(true)}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Leave Room
            </Button>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Leave this room?</AlertDialogTitle>
                <AlertDialogDescription>
                  You will be removed from the collaboration room and sent back to the dashboard. Your current session state will be cleared.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 text-white hover:bg-red-700"
                  onClick={handleLeaveRoom}
                >
                  Leave Room
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="border-4 border-gray-300 rounded-lg p-4 bg-white">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h2 className="text-xl font-semibold text-gray-900">{roomData.questionTitle}</h2>
              <Badge className={getDifficultyColor(roomData.questionDifficulty)}>
                {roomData.questionDifficulty}
              </Badge>
              {displayTopics.map((topic) => (
                <Badge key={topic} variant="secondary" className="border border-gray-300">
                  {topic}
                </Badge>
              ))}
              <Badge variant="outline" className="border border-orange-300 bg-orange-50 text-orange-700">
                <Radio className="h-3 w-3 mr-1 animate-pulse" />
                Live Session
              </Badge>
            </div>
            {/* AI-generated (edited by Lim Yun Jie Ernest) */}
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mt-2 space-y-1 text-sm leading-5 text-slate-700">
                {descriptionParagraphs.length > 0 ? (
                  descriptionParagraphs.map((paragraph, index) => (
                    <p key={index} className="whitespace-pre-line">
                      {paragraph}
                    </p>
                  ))
                ) : (
                  <p>No description provided for this question.</p>
                )}
              </div>
            </div>
            {roomData.imageUrls && roomData.imageUrls.length > 0 && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {roomData.imageUrls.map((imageUrl, index) => (
                    <div key={index} className="rounded-lg border border-gray-300 bg-white p-2">
                      <img
                        src={imageUrl}
                        alt={`Question image ${index + 1}`}
                        className="mx-auto h-auto max-h-40 w-auto max-w-full rounded-md object-contain"
                        onError={(e) => {
                          console.error('Failed to load image:', imageUrl);
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
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
            {/* Render-ready list produced by `participants` useMemo above. */}
            {participants.map((user) => (
              <div key={user.id} className="flex items-center gap-3 p-3 border-2 border-gray-300 rounded-lg bg-gray-50">
                <div className="w-10 h-10 border-2 border-gray-400 rounded-full flex items-center justify-center bg-white flex-shrink-0">
                  {user.profileImageUrl ? (
                    <img
                      src={user.profileImageUrl}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-gray-900 truncate">
                      {user.name}
                      {user.isCurrentUser ? " (You)" : ""}
                    </p>
                    <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50 space-y-3">
            <div className="flex items-center gap-2 text-gray-800">
              <History className="h-4 w-4" />
              <h3 className="font-semibold">My Submission</h3>
            </div>
            <p className="text-xs text-gray-600">
              This saves the code currently in the shared editor with the current question snapshot and submission time.
            </p>

            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleSubmitAttempt}
              disabled={isSubmittingAttempt}
            >
              {isSubmittingAttempt ? "Saving Attempt..." : "Save My Attempt"}
            </Button>
          </div>
        </div>

        <div className="border-4 border-gray-300 rounded-lg p-4 bg-white space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between pb-2 border-b-2 border-gray-200">
            <div className="flex items-center gap-2 text-gray-800">
              <Code2 className="h-5 w-5" />
              <h3 className="font-semibold">Code Editor</h3>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs border border-gray-300">
                {languageMap[roomData.programmingLanguage] || roomData.programmingLanguage}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                className="border-green-400 text-green-700 hover:bg-green-50"
                onClick={handleRunCode}
                disabled={isRunning}
              >
                {isRunning ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Play className="mr-1 h-3 w-3" />}
                Run
              </Button>
              {(roomData.testCases?.length ?? 0) > 0 && (
                <Button
                  size="sm"
                  className="bg-blue-600 text-white hover:bg-blue-700"
                  onClick={handleRunTests}
                  disabled={isRunning}
                >
                  {isRunning ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CheckCircle2 className="mr-1 h-3 w-3" />}
                  Run Tests ({roomData.testCases?.length})
                </Button>
              )}
            </div>
          </div>

          <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-50">
            <UIEditor
              ref={editorRef}
              roomId={roomId || ""}
              programmingLanguage={roomData.programmingLanguage}
            />
          </div>

          {/* Output Panel */}
          <div className="border-2 border-gray-300 rounded-lg bg-gray-900 text-gray-100 overflow-hidden">
            <div
              className="flex items-center justify-between px-3 py-2 bg-gray-800 cursor-pointer select-none"
              onClick={() => setShowOutput((v) => !v)}
            >
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-300">Output</span>
                {executionResult && (
                  <Badge
                    variant="secondary"
                    className={`text-xs ${executionResult.exitCode === 0 ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}
                  >
                    Exit: {executionResult.exitCode}
                  </Badge>
                )}
                {testCaseResults.length > 0 && (
                  <Badge variant="secondary" className="text-xs bg-gray-700 text-gray-300">
                    {testCaseResults.filter((r) => r.passed).length}/{testCaseResults.length} passed
                  </Badge>
                )}
              </div>
              {showOutput ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronUp className="h-4 w-4 text-gray-400" />}
            </div>

            {showOutput && (
              <div className="max-h-[300px] overflow-auto">
                {/* Tabs */}
                <div className="flex border-b border-gray-700 px-3">
                  <button
                    className={`px-3 py-1.5 text-xs font-medium ${activeTab === "console" ? "text-white border-b-2 border-blue-400" : "text-gray-500 hover:text-gray-300"}`}
                    onClick={() => setActiveTab("console")}
                  >
                    Console
                  </button>
                  {(roomData.testCases?.length ?? 0) > 0 && (
                    <button
                      className={`px-3 py-1.5 text-xs font-medium ${activeTab === "testcases" ? "text-white border-b-2 border-blue-400" : "text-gray-500 hover:text-gray-300"}`}
                      onClick={() => setActiveTab("testcases")}
                    >
                      Test Cases
                    </button>
                  )}
                </div>

                <div className="p-3">
                  {activeTab === "console" && (
                    <>
                      {isRunning && (
                        <div className="flex items-center gap-2 text-gray-400 text-sm">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Running...
                        </div>
                      )}
                      {!isRunning && !executionResult && testCaseResults.length === 0 && (
                        <p className="text-gray-500 text-sm">Click "Run" to execute your code, or "Run Tests" to check against test cases.</p>
                      )}
                      {executionResult && (
                        <div className="space-y-2">
                          {executionResult.stdout && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">stdout:</p>
                              <pre className="text-sm font-mono whitespace-pre-wrap text-green-300">{executionResult.stdout}</pre>
                            </div>
                          )}
                          {executionResult.stderr && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">stderr:</p>
                              <pre className="text-sm font-mono whitespace-pre-wrap text-red-400">{executionResult.stderr}</pre>
                            </div>
                          )}
                          {!executionResult.stdout && !executionResult.stderr && (
                            <p className="text-gray-500 text-sm italic">No output</p>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {activeTab === "testcases" && (
                    <div className="space-y-3">
                      {isRunning && (
                        <div className="flex items-center gap-2 text-gray-400 text-sm">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Running test cases...
                        </div>
                      )}
                      {!isRunning && testCaseResults.length === 0 && (
                        <div className="space-y-2">
                          {roomData.testCases?.map((tc, i) => (
                            <div key={i} className="border border-gray-700 rounded p-2">
                              <p className="text-xs text-gray-400 mb-1">Test Case {i + 1}</p>
                              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                                <div>
                                  <span className="text-gray-500">Input: </span>
                                  <span className="text-gray-300">{tc.input}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Expected: </span>
                                  <span className="text-gray-300">{tc.output}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {testCaseResults.map((result, i) => (
                        <div
                          key={i}
                          className={`border rounded p-2 ${result.passed ? "border-green-700 bg-green-950/30" : "border-red-700 bg-red-950/30"}`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {result.passed ? (
                              <CheckCircle2 className="h-4 w-4 text-green-400" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-400" />
                            )}
                            <span className={`text-xs font-medium ${result.passed ? "text-green-300" : "text-red-300"}`}>
                              Test Case {i + 1}: {result.passed ? "Passed" : "Failed"}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 gap-1 text-xs font-mono">
                            <div>
                              <span className="text-gray-500">Input: </span>
                              <span className="text-gray-300">{result.testCase.input}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Expected: </span>
                              <span className="text-gray-300">{result.testCase.output}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Actual: </span>
                              <span className={result.passed ? "text-green-300" : "text-red-300"}>
                                {result.actual || "(no output)"}
                              </span>
                            </div>
                            {result.error && (
                              <div>
                                <span className="text-gray-500">Error: </span>
                                <span className="text-red-400">{result.error}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* AI-generated (edited by Lim Yun Jie Ernest) */}
        <Chatbox
          ref={chatboxRef}
          roomId={roomId}
          wsBaseUrl={chatWsBaseUrl}
          username={username}
          initialMessages={roomData.chatLog || []}
          onUserLeft={handleUserLeft}
          onUserJoined={handleUserJoined}
        />
      </div>

      <AttemptHistoryPanel
        attempts={attempts}
        attemptsLoading={attemptsLoading}
        title="My Attempt History"
        emptyMessage="No attempts recorded for this question yet. Save one from this workspace to start your history."
      />
    </div>
  );
}
