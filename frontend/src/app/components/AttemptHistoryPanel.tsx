import { Badge } from "@/app/components/ui/badge";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { ChevronRight, History, NotebookPen } from "lucide-react";
import { useEffect, useState } from "react";
import type { AttemptHistoryEntry } from "@/app/services/attemptHistoryService";

type AttemptHistoryPanelProps = {
  attempts: AttemptHistoryEntry[];
  attemptsLoading: boolean;
  title: string;
  emptyMessage: string;
};

const formatTimestamp = (timestamp: string) => {
  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return timestamp;
  }
};

export function AttemptHistoryPanel({
  attempts,
  attemptsLoading,
  title,
  emptyMessage,
}: AttemptHistoryPanelProps) {
  const [selectedAttemptId, setSelectedAttemptId] = useState<number | null>(null);

  useEffect(() => {
    if (attempts.length === 0) {
      setSelectedAttemptId(null);
      return;
    }

    setSelectedAttemptId((previousSelectedAttemptId) => {
      if (
        previousSelectedAttemptId !== null
        && attempts.some((attempt) => attempt.attemptId === previousSelectedAttemptId)
      ) {
        return previousSelectedAttemptId;
      }

      return attempts[0].attemptId;
    });
  }, [attempts]);

  const selectedAttempt = attempts.find((attempt) => attempt.attemptId === selectedAttemptId) || null;

  return (
    <div className="border-4 border-gray-300 rounded-lg p-4 bg-white space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-gray-800">
          <History className="h-5 w-5" />
          <h3 className="font-semibold">{title}</h3>
        </div>
        <Badge variant="outline" className="border border-gray-300">
          {attempts.length} recorded
        </Badge>
      </div>

      {attemptsLoading ? (
        <div className="text-sm text-gray-500">Loading your attempts...</div>
      ) : attempts.length === 0 ? (
        <div className="text-sm text-gray-500">{emptyMessage}</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:items-start">
          <ScrollArea className="h-[22rem] lg:h-[34rem] lg:col-span-2 pr-3">
            <div className="space-y-2">
              {attempts.map((attempt) => {
                const isSelected = attempt.attemptId === selectedAttemptId;

                return (
                  <button
                    key={attempt.attemptId}
                    type="button"
                    onClick={() => setSelectedAttemptId(attempt.attemptId)}
                    className={`w-full text-left border-2 rounded-lg p-4 transition-all ${
                      isSelected
                        ? "border-blue-400 bg-blue-50"
                        : "border-gray-300 bg-gray-50 hover:border-gray-400"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-2">
                      <div className="font-medium text-sm text-gray-900 truncate">
                        {attempt.question.title}
                      </div>
                      <div className="text-xs text-gray-600">
                        {formatTimestamp(attempt.submittedAt)}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="secondary" className="border border-blue-300 bg-blue-50 text-blue-700">
                          Attempt #{attempt.attemptNumber}
                        </Badge>
                        <Badge className="bg-green-100 text-green-800 border border-green-300">
                          {attempt.question.difficulty}
                        </Badge>
                          {attempt.question.archived && (
                            <Badge
                              variant="outline"
                              className="border border-orange-300 bg-orange-50 text-orange-700"
                            >
                              Archived
                            </Badge>
                          )}
                        </div>
                      </div>
                      <ChevronRight
                        className={`h-4 w-4 mt-1 flex-shrink-0 transition-transform ${
                          isSelected ? "translate-x-1 text-blue-600" : "text-gray-400"
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>

          <div className="lg:col-span-3 border-2 border-gray-300 rounded-lg bg-gray-50">
            <ScrollArea className="h-[26rem] lg:h-[34rem]">
              <div className="p-4 space-y-4">
                {selectedAttempt ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="space-y-1 min-w-0">
                          <h4 className="text-lg font-semibold text-gray-900">
                            {selectedAttempt.question.title}
                          </h4>
                          <div className="text-xs text-gray-600">
                            Attempt #{selectedAttempt.attemptNumber} saved on {formatTimestamp(selectedAttempt.submittedAt)}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Badge variant="secondary" className="border border-blue-300 bg-blue-50 text-blue-700">
                            Attempt #{selectedAttempt.attemptNumber}
                          </Badge>
                          <Badge className="bg-green-100 text-green-800 border border-green-300">
                            {selectedAttempt.question.difficulty}
                          </Badge>
                          {selectedAttempt.question.archived && (
                            <Badge
                              variant="outline"
                              className="border border-orange-300 bg-orange-50 text-orange-700"
                            >
                              Archived
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        {selectedAttempt.question.topics.map((topic) => (
                          <Badge
                            key={`${selectedAttempt.attemptId}-${topic}`}
                            variant="secondary"
                            className="border border-gray-300"
                          >
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="border-2 border-gray-300 rounded-lg bg-white p-4 space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                        Question Description
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {selectedAttempt.question.description}
                      </p>
                    </div>

                    <div className="border-2 border-gray-300 rounded-lg bg-white p-4 space-y-2">
                      <div className="flex items-center gap-2 text-gray-700">
                        <NotebookPen className="h-4 w-4" />
                        <div className="text-xs font-semibold uppercase tracking-wide">
                          Submitted Code
                        </div>
                      </div>
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words font-mono">
                        {selectedAttempt.submittedCode || "// No code submitted"}
                      </pre>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-gray-500">
                    Select an attempt to view its question details and submitted code.
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
}
