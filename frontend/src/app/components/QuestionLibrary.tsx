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
import { useState } from "react";

interface QuestionLibraryProps {
  onStartSession?: () => void;
  onNavigateToAddQuestion?: () => void;
}

export function QuestionLibrary({ onStartSession, onNavigateToAddQuestion }: QuestionLibraryProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const mockQuestions = [
    {
      id: "Q001",
      title: "Two Sum",
      difficulty: "Easy",
      topic: "Arrays",
      popularity: 95,
      hasImage: true,
      description: "Given an array of integers, return indices of two numbers that add up to target."
    },
    {
      id: "Q002",
      title: "Binary Tree Traversal",
      difficulty: "Medium",
      topic: "Trees",
      popularity: 88,
      hasImage: true,
      description: "Implement inorder, preorder, and postorder traversal of a binary tree."
    },
    {
      id: "Q003",
      title: "Dynamic Programming - Knapsack",
      difficulty: "Hard",
      topic: "Dynamic Programming",
      popularity: 76,
      hasImage: true,
      description: "Solve the 0/1 knapsack problem using dynamic programming approach."
    },
    {
      id: "Q004",
      title: "Linked List Cycle",
      difficulty: "Medium",
      topic: "Linked Lists",
      popularity: 92,
      hasImage: true,
      description: "Detect if a linked list has a cycle using Floyd's algorithm."
    },
    {
      id: "Q005",
      title: "Merge Sort Implementation",
      difficulty: "Medium",
      topic: "Sorting",
      popularity: 85,
      hasImage: true,
      description: "Implement merge sort algorithm with O(n log n) time complexity."
    },
    {
      id: "Q006",
      title: "Graph BFS/DFS",
      difficulty: "Hard",
      topic: "Graphs",
      popularity: 81,
      hasImage: true,
      description: "Implement breadth-first and depth-first search for graph traversal."
    },
  ];

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
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-6 text-white shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Question Library</h1>
              <p className="text-purple-100 text-sm mt-1">Admin Management Portal</p>
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
              />
            </div>
          </div>

          {/* Topic Filter */}
          <div className="w-full lg:w-48">
            <Label htmlFor="topic-filter" className="text-gray-700 mb-2 block">Topic</Label>
            <select 
              id="topic-filter"
              className="w-full h-10 px-3 border-2 border-gray-300 rounded-md bg-white"
            >
              <option>All Topics</option>
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
            >
              <option>All Levels</option>
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

        {/* Admin Controls */}
        <div className="flex gap-2 mt-4 pt-4 border-t-2 border-gray-200">
          <Badge variant="secondary" className="text-xs">Admin Controls:</Badge>
          <Button variant="outline" size="sm" className="border-2 border-gray-300">
            <Plus className="mr-1 h-3 w-3" />
            Add Question
          </Button>
          <Button variant="outline" size="sm" className="border-2 border-gray-300">
            <Edit className="mr-1 h-3 w-3" />
            Update
          </Button>
          <Button variant="outline" size="sm" className="border-2 border-gray-300">
            <Trash2 className="mr-1 h-3 w-3" />
            Remove
          </Button>
        </div>
      </div>

      {/* Questions Display */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockQuestions.map((question) => (
            <div 
              key={question.id}
              className="border-4 border-gray-300 rounded-lg p-5 bg-white hover:border-blue-400 transition-colors cursor-pointer group"
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs font-mono border-gray-400 text-gray-600">
                        {question.id}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-gray-900">{question.title}</h3>
                  </div>
                  {question.hasImage && (
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
                  <Badge variant="secondary" className="border border-gray-300">
                    {question.topic}
                  </Badge>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 line-clamp-2">{question.description}</p>

                {/* Popularity */}
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <TrendingUp className="h-3 w-3" />
                  <span>Popularity: {question.popularity}%</span>
                </div>

                {/* Admin Action Buttons */}
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex-1 border-2 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400"
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
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
          {mockQuestions.map((question) => (
            <div 
              key={question.id}
              className="border-4 border-gray-300 rounded-lg p-5 bg-white hover:border-blue-400 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                {/* Image Indicator */}
                <div className="w-16 h-16 border-2 border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 flex-shrink-0">
                  {question.hasImage ? (
                    <ImageIcon className="h-8 w-8 text-gray-400" />
                  ) : (
                    <BookOpen className="h-8 w-8 text-gray-400" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs font-mono border-gray-400 text-gray-600">
                      {question.id}
                    </Badge>
                    <h3 className="font-semibold text-gray-900">{question.title}</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{question.description}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge className={`border text-xs ${getDifficultyColor(question.difficulty)}`}>
                      {question.difficulty}
                    </Badge>
                    <Badge variant="secondary" className="border border-gray-300 text-xs">
                      {question.topic}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {question.popularity}%
                    </Badge>
                  </div>
                </div>

                {/* Admin Action Buttons */}
                <div className="flex gap-2 flex-shrink-0">
                  <Button 
                    variant="outline"
                    size="sm"
                    className="border-2 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400"
                  >
                    <Edit className="mr-1 h-4 w-4" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
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

      {/* Admin Info Note */}
      <div className="p-4 border-2 border-dashed border-purple-300 rounded-lg bg-purple-50 text-center">
        <div className="text-sm text-purple-800">
          <p className="font-semibold mb-1 flex items-center justify-center gap-2">
            <Shield className="w-4 h-4" />
            Admin Management View
          </p>
          <p>This page is accessible only to administrators. Add, edit, or remove coding questions from the library.</p>
        </div>
      </div>
    </div>
  );
}