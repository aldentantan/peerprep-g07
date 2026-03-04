import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Label } from "@/app/components/ui/label";
import { Checkbox } from "@/app/components/ui/checkbox";
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Target,
  AlertTriangle,
} from "lucide-react";
import { useState, useEffect } from "react";

type MatchingState = "idle" | "searching" | "matched" | "timeout";

interface MatchingDashboardProps {
  onNavigateToCollaboration: () => void;
}

export function MatchingDashboard({ onNavigateToCollaboration }: MatchingDashboardProps) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("Medium");
  const [selectedTopics, setSelectedTopics] = useState<string[]>(["Algorithms"]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("JavaScript");
  const [matchingState, setMatchingState] = useState<MatchingState>("idle");
  const [timeRemaining, setTimeRemaining] = useState(120);
  const [matchAttempts, setMatchAttempts] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [usersInQueue, setUsersInQueue] = useState(0);

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

  const handleStartMatching = () => {
    setMatchingState("searching");
    setTimeRemaining(120);
    setShowWarning(false);
    // Set initial random queue count
    setUsersInQueue(Math.floor(Math.random() * 8) + 3); // Random between 3-10
    
    // Simulate matching process
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        // Show warning at 15 seconds remaining
        if (prev === 15) {
          setShowWarning(true);
        }
        
        if (prev <= 1) {
          clearInterval(timer);
          // Alternate between match and timeout based on attempt number
          // Even attempts (0, 2, 4...) = matched, Odd attempts (1, 3, 5...) = timeout
          const isMatched = matchAttempts % 2 === 0;
          setMatchingState(isMatched ? "matched" : "timeout");
          setMatchAttempts(prev => prev + 1);
          setShowWarning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Simulate queue count fluctuation
    const queueTimer = setInterval(() => {
      setUsersInQueue(prev => {
        const change = Math.random() > 0.5 ? 1 : -1;
        const newCount = prev + change;
        return Math.max(1, Math.min(15, newCount)); // Keep between 1-15
      });
    }, 3000); // Update every 3 seconds

    // Clean up queue timer when matching ends
    setTimeout(() => clearInterval(queueTimer), 120000);
  };

  const handleCancelMatching = () => {
    setMatchingState("idle");
    setTimeRemaining(120);
    setShowWarning(false);
  };

  const handleRetry = () => {
    setMatchingState("idle");
    setTimeRemaining(120);
    setShowWarning(false);
  };

  const toggleTopic = (topic: string) => {
    if (selectedTopics.includes(topic)) {
      setSelectedTopics(selectedTopics.filter(t => t !== topic));
    } else {
      setSelectedTopics([...selectedTopics, topic]);
    }
  };

  useEffect(() => {
    // Reset warning when state changes
    if (matchingState === "idle") {
      setShowWarning(false);
    }
  }, [matchingState]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Find a Match</h1>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Matching Criteria Info Banner */}
        <div className="mb-4 p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
          <div className="flex items-start gap-2 text-sm text-purple-800">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Matching Algorithm:</p>
              <p className="text-xs">Priority: Topic (highest) → Difficulty. The system matches users with identical topic preferences first.</p>
            </div>
          </div>
        </div>

        {/* Selection Panel - Only show when idle */}
        {matchingState === "idle" && (
          <div className="border-4 border-gray-300 rounded-lg p-8 bg-white space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                Select Your Preferences
              </h2>
              <p className="text-gray-600">
                Choose a difficulty level and topic to get matched with another user
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
                Topics (Select Multiple)
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {topics.map((topic) => (
                  <button
                    key={topic}
                    onClick={() => toggleTopic(topic)}
                    className={`p-3 border-3 rounded-lg font-medium text-sm transition-all relative ${
                      selectedTopics.includes(topic)
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                    }`}
                  >
                    {selectedTopics.includes(topic) && (
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
                {selectedTopics.map(topic => (
                  <Badge key={topic} className="bg-purple-600 text-white px-3 py-1">
                    {topic}
                  </Badge>
                ))}
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

            {/* Warning Message */}
            {showWarning && (
              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg mt-4">
                <div className="flex items-start gap-2 text-sm text-red-800">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    Please select at least one topic to proceed with matching.
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
                {selectedTopics.map(topic => (
                  <Badge key={topic} className="bg-purple-600 text-white px-4 py-2 text-base">
                    {topic}
                  </Badge>
                ))}
                <Badge className="bg-green-600 text-white px-4 py-2 text-base">
                  {selectedLanguage}
                </Badge>
              </div>

              {/* Users in Queue Counter */}
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <div className="flex items-center justify-center gap-3">
                  <Users className="w-5 h-5 text-blue-600" />
                  <div className="text-left">
                    <div className="text-sm text-blue-600 font-medium">
                      <span className="text-2xl font-bold">{usersInQueue}</span> {usersInQueue === 1 ? 'user' : 'users'} in queue
                    </div>
                    <div className="text-xs text-blue-500">
                      Currently searching for a match
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
                  {selectedTopics.map(topic => (
                    <Badge key={topic} className="bg-purple-600 text-white px-3 py-1">
                      {topic}
                    </Badge>
                  ))}
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
                onClick={handleRetry}
                variant="outline"
                className="w-full border-2 border-gray-300 h-11"
              >
                Find Another Match
              </Button>
            </div>
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
                  {selectedTopics.map(topic => (
                    <Badge key={topic} className="bg-purple-600 text-white px-3 py-1">
                      {topic}
                    </Badge>
                  ))}
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
    </div>
  );
}