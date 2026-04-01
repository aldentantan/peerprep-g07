import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Code2, Users, LogOut, User, Radio, Play, Loader2, Terminal, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import Chatbox, { type ChatboxHandle } from "./Chatbox";
import { useSearchParams, useNavigate } from "react-router-dom";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { MonacoBinding } from "y-monaco";
import Editor from "@monaco-editor/react";
import { toast } from "sonner";

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
  programmingLanguage: string;
  questionTopic: string;
  questionDifficulty: string;
  participantUserIds?: string[];
  testCases?: TestCase[];
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
  const executeApiUrl = `${(import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "")}/execute`;
  const wsScheme = window.location.protocol === "https:" ? "wss" : "ws";
  const wsBaseUrl = import.meta.env.VITE_YJS_WS_URL || `${wsScheme}://${window.location.host}/ws/yjs`;
  const chatWsBaseUrl = import.meta.env.VITE_CHAT_WS_URL || `${wsScheme}://${window.location.host}/ws/chat`;

  // Screen state for room data loading and failure handling.
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Code execution state
  const [isRunning, setIsRunning] = useState(false);
  const [executionResult, setExecutionResult] = useState<{ stdout: string; stderr: string; exitCode: number } | null>(null);
  const [testCaseResults, setTestCaseResults] = useState<TestCaseResult[]>([]);
  const [activeTab, setActiveTab] = useState<"console" | "testcases">("console");
  const [showOutput, setShowOutput] = useState(false);
  const editorRef = useRef<any>(null);

  // Pull roomId from URL query string (?roomId=...).
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get("roomId");
  const navigate = useNavigate();
  const chatboxRef = useRef<ChatboxHandle | null>(null);

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
          testCases: data.testCases || [],
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

  const handleUserLeft = (departingUser: string) => {
    if (departingUser !== username) {
      toast.info(`${departingUser} has left the room.`);
    }

    setRoomData((prev) => {
      if (!prev?.participantUserIds) {
        return prev;
      }

      return {
        ...prev,
        participantUserIds: prev.participantUserIds.filter((participantId) => participantId !== departingUser),
      };
    });
  };

  // Attach Yjs + Monaco collaborative binding when editor is mounted.
  const handleEditorMount = (editor: any) => {
    editorRef.current = editor;
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

  // Leave room and clear local room marker used for quick re-entry.
  const handleLeaveRoom = () => {
    chatboxRef.current?.sendUserLeft(username);

    window.setTimeout(() => {
      chatboxRef.current?.closeSocket();
      localStorage.removeItem("roomId");
      navigate("/");
    }, 60);
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
            <Editor
              key={roomId ?? "default-room"}
              height="400px"
              language={roomData.programmingLanguage}
              defaultValue=""
              theme="vs-dark"
              onMount={(editor: any) => handleEditorMount(editor)}
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

        <Chatbox
          ref={chatboxRef}
          roomId={roomId}
          wsBaseUrl={chatWsBaseUrl}
          username={username}
          initialMessages={roomData.chatLog || []}
          onUserLeft={handleUserLeft}
        />
      </div>
    </div>
  );
}
