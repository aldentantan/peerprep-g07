import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { 
  BookOpen, 
  Search, 
  Grid3x3, 
  List, 
  Plus, 
  Edit, 
  Trash2, 
  Filter,
  Image as ImageIcon,
  Play,
  TrendingUp,
  Database,
  Shield,
  User
} from "lucide-react";
import { useState, useEffect } from "react";
import { getQuestions, deleteQuestion, type Question } from "@/app/services/questionService";

interface QuestionLibraryProps {
  onStartSession?: () => void;
  onNavigateToAddQuestion?: () => void;
  onNavigateToEditQuestion?: (question: Question) => void;
}

export function QuestionLibrary({ onStartSession, onNavigateToAddQuestion, onNavigateToEditQuestion }: QuestionLibraryProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [topicFilter, setTopicFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchQuestions = async () => {
    setIsLoading(true);
    setError("");
    try {
      const filters: { topics?: string[]; difficulty?: string } = {};
      if (topicFilter) {
        filters.topics = [topicFilter];
      }
      if (difficultyFilter) {
        filters.difficulty = difficultyFilter;
      }
      const data = await getQuestions(filters);
      setQuestions(data.questions);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load questions");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [topicFilter, difficultyFilter]);

  const handleDelete = async (id: number) => {
    try {
      await deleteQuestion(id);
      fetchQuestions();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to delete question");
    }
  };

  const filteredQuestions = searchQuery
    ? questions.filter(
        (q) =>
          q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          q.topics.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : questions;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy": return "bg-green-100 text-green-800 border-green-300";
      case "Medium": return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "Hard": return "bg-red-100 text-red-800 border-red-300";
      default: return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Header Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-4 text-white shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Question Library</h1>
              <p className="text-purple-100 text-sm">Admin Management Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-white/20 text-white border-white/30 px-3 py-1.5 backdrop-blur-sm">
              <User className="w-3 h-3 mr-1.5" />
              Admin Access
            </Badge>
            <Button className="bg-white text-purple-600 hover:bg-purple-50 h-10" onClick={onNavigateToAddQuestion}>
              <Plus className="mr-2 h-4 w-4" />
              Add New Question
            </Button>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="border-4 border-gray-300 rounded-lg p-5 bg-white">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <Label htmlFor="search" className="text-gray-700 mb-2 block">Search Questions</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                id="search"
                placeholder="Search by title or topic..."
                className="pl-10 border-2 border-gray-300"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Topic Filter */}
          <div className="w-full lg:w-48">
            <Label htmlFor="topic-filter" className="text-gray-700 mb-2 block">Topic</Label>
            <select 
              id="topic-filter"
              className="w-full h-10 px-3 border-2 border-gray-300 rounded-md bg-white"
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
            >
              <option value="">All Topics</option>
              <option>Arrays</option>
              <option>Trees</option>
              <option>Graphs</option>
              <option>Dynamic Programming</option>
              <option>Sorting</option>
            </select>
          </div>

          {/* Difficulty Filter */}
          <div className="w-full lg:w-48">
            <Label htmlFor="difficulty-filter" className="text-gray-700 mb-2 block">Difficulty</Label>
            <select 
              id="difficulty-filter"
              className="w-full h-10 px-3 border-2 border-gray-300 rounded-md bg-white"
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
            >
              <option value="">All Levels</option>
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>
          </div>

          {/* View Toggle */}
          <div className="w-full lg:w-auto">
            <Label className="text-gray-700 mb-2 block">View</Label>
            <div className="flex gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className={viewMode === "grid" ? "bg-blue-600" : "border-2 border-gray-300"}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
                className={viewMode === "list" ? "bg-blue-600" : "border-2 border-gray-300"}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Removed admin controls below search questions */}
      </div>

      {/* Questions Display */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading questions...</div>
      ) : error ? (
        <div className="text-center py-12 text-red-600">{error}</div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQuestions.map((question, idx) => (
            <div 
              key={question.questionId}
              className="border-4 border-gray-300 rounded-lg p-5 bg-white hover:border-blue-400 transition-colors cursor-pointer group"
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs font-mono border-gray-400 text-gray-600">
                        Q{String(idx + 1).padStart(3, '0')}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-gray-900">{question.title}</h3>
                  </div>
                  {question.imageUrls && question.imageUrls.length > 0 && (
                    <div className="flex-shrink-0 p-1 border-2 border-gray-300 rounded">
                      <ImageIcon className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  <Badge className={`border ${getDifficultyColor(question.difficulty)}`}>
                    {question.difficulty}
                  </Badge>
                  {question.topics.map((t) => (
                    <Badge key={t} variant="secondary" className="border border-gray-300">
                      {t}
                    </Badge>
                  ))}
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 line-clamp-2">{question.description}</p>

                {/* Leetcode Link */}
                {question.leetcodeLink && (
                  <div className="flex items-center gap-2 text-xs text-blue-600">
                    <a href={question.leetcodeLink} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      LeetCode Link
                    </a>
                  </div>
                )}

                {/* Admin Action Buttons */}
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex-1 border-2 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400"
                    onClick={() => onNavigateToEditQuestion && onNavigateToEditQuestion(question)}
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDelete(question.questionId)}
                    className="flex-1 border-2 border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredQuestions.map((question, idx) => (
            <div 
              key={question.questionId}
              className="border-4 border-gray-300 rounded-lg p-5 bg-white hover:border-blue-400 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                {/* Image Indicator */}
                <div className="w-16 h-16 border-2 border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 flex-shrink-0">
                  {question.imageUrls && question.imageUrls.length > 0 ? (
                    <ImageIcon className="h-8 w-8 text-gray-400" />
                  ) : (
                    <BookOpen className="h-8 w-8 text-gray-400" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs font-mono border-gray-400 text-gray-600">
                      Q{String(idx + 1).padStart(3, '0')}
                    </Badge>
                    <h3 className="font-semibold text-gray-900">{question.title}</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{question.description}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge className={`border text-xs ${getDifficultyColor(question.difficulty)}`}>
                      {question.difficulty}
                    </Badge>
                    {question.topics.map((t) => (
                      <Badge key={t} variant="secondary" className="border border-gray-300 text-xs">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Admin Action Buttons */}
                <div className="flex gap-2 flex-shrink-0">
                  <Button 
                    variant="outline"
                    size="sm"
                    className="border-2 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400"
                    onClick={() => onNavigateToEditQuestion && onNavigateToEditQuestion(question)}
                  >
                    <Edit className="mr-1 h-4 w-4" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(question.questionId)}
                    className="border-2 border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ...existing code... */}
    </div>
  );
}