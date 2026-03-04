import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Badge } from "@/app/components/ui/badge";
import { Textarea } from "@/app/components/ui/textarea";
import { 
  ArrowLeft, 
  Save, 
  X, 
  Upload, 
  Image as ImageIcon,
  Shield,
  Plus,
  Trash2
} from "lucide-react";
import { useState } from "react";

interface AddQuestionScreenProps {
  onBack: () => void;
  onSave?: () => void;
}

export function AddQuestionScreen({ onBack, onSave }: AddQuestionScreenProps) {
  const [questionId, setQuestionId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [topic, setTopic] = useState("Arrays");
  const [imageUploaded, setImageUploaded] = useState(false);
  const [testCases, setTestCases] = useState([
    { input: "", expectedOutput: "" }
  ]);

  const difficulties = ["Easy", "Medium", "Hard"];
  const topics = [
    "Arrays",
    "Strings",
    "Linked Lists",
    "Trees",
    "Graphs",
    "Dynamic Programming",
    "Sorting",
    "Searching",
    "Hash Tables",
    "Stacks & Queues",
    "Recursion",
    "Greedy Algorithms",
    "System Design",
  ];

  const handleAddTestCase = () => {
    setTestCases([...testCases, { input: "", expectedOutput: "" }]);
  };

  const handleRemoveTestCase = (index: number) => {
    const updated = testCases.filter((_, i) => i !== index);
    setTestCases(updated);
  };

  const handleTestCaseChange = (index: number, field: 'input' | 'expectedOutput', value: string) => {
    const updated = [...testCases];
    updated[index][field] = value;
    setTestCases(updated);
  };

  const handleSave = () => {
    // Here you would typically save to backend
    if (onSave) {
      onSave();
    }
    onBack();
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case "Easy": return "bg-green-100 text-green-800 border-green-300";
      case "Medium": return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "Hard": return "bg-red-100 text-red-800 border-red-300";
      default: return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-6 text-white shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <Plus className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Add New Question</h1>
              <p className="text-purple-100 text-sm mt-1">Create a new coding challenge for the library</p>
            </div>
          </div>
          <Button 
            onClick={onBack}
            className="bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm border-white/30"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Library
          </Button>
        </div>
      </div>

      {/* Main Form */}
      <div className="border-4 border-gray-300 rounded-lg p-6 bg-white">
        <div className="space-y-6">
          {/* Basic Information Section */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-600" />
              Basic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Question ID */}
              <div className="space-y-2">
                <Label htmlFor="questionId" className="text-gray-700 font-medium">
                  Question ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="questionId"
                  placeholder="e.g., Q007"
                  value={questionId}
                  onChange={(e) => setQuestionId(e.target.value)}
                  className="h-11 border-2 border-gray-300 font-mono"
                />
                <p className="text-xs text-gray-500">Unique identifier for the question</p>
              </div>

              {/* Title */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title" className="text-gray-700 font-medium">
                  Question Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="e.g., Binary Search Implementation"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-11 border-2 border-gray-300"
                />
              </div>

              {/* Description */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description" className="text-gray-700 font-medium">
                  Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Provide a clear description of the problem..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-24 border-2 border-gray-300 resize-none"
                  rows={4}
                />
              </div>

              {/* Difficulty */}
              <div className="space-y-2">
                <Label htmlFor="difficulty" className="text-gray-700 font-medium">
                  Difficulty Level <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2">
                  {difficulties.map((diff) => (
                    <Button
                      key={diff}
                      type="button"
                      variant={difficulty === diff ? "default" : "outline"}
                      onClick={() => setDifficulty(diff)}
                      className={
                        difficulty === diff
                          ? `${getDifficultyColor(diff)} border-2`
                          : "border-2 border-gray-300"
                      }
                    >
                      {diff}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Topic */}
              <div className="space-y-2">
                <Label htmlFor="topic" className="text-gray-700 font-medium">
                  Topic <span className="text-red-500">*</span>
                </Label>
                <select
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full h-11 px-3 border-2 border-gray-300 rounded-md bg-white"
                >
                  {topics.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Image Upload Section */}
          <div className="pt-6 border-t-2 border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-purple-600" />
              Question Image <span className="text-red-500">*</span>
            </h2>
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Upload a diagram or visual representation for this question
              </p>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                {imageUploaded ? (
                  <div className="space-y-3">
                    <div className="w-20 h-20 mx-auto bg-green-100 rounded-lg flex items-center justify-center">
                      <ImageIcon className="w-10 h-10 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">question-image.png</p>
                      <p className="text-xs text-gray-500">256 KB</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setImageUploaded(false)}
                      className="border-2 border-gray-300"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-16 h-16 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                      <Upload className="w-8 h-8 text-gray-400" />
                    </div>
                    <div>
                      <Button
                        variant="outline"
                        onClick={() => setImageUploaded(true)}
                        className="border-2 border-gray-300"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Image
                      </Button>
                      <p className="text-xs text-gray-500 mt-2">PNG, JPG or SVG (max 5MB)</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Test Cases Section */}
          <div className="pt-6 border-t-2 border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-600" />
                Test Cases
              </h2>
              <Button
                onClick={handleAddTestCase}
                variant="outline"
                size="sm"
                className="border-2 border-gray-300"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Test Case
              </Button>
            </div>

            <div className="space-y-4">
              {testCases.map((testCase, index) => (
                <div
                  key={index}
                  className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="secondary" className="border border-gray-400">
                      Test Case {index + 1}
                    </Badge>
                    {testCases.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveTestCase(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-700 text-sm">Input</Label>
                      <Textarea
                        placeholder="e.g., [1, 2, 3, 4, 5]"
                        value={testCase.input}
                        onChange={(e) =>
                          handleTestCaseChange(index, "input", e.target.value)
                        }
                        className="border-2 border-gray-300 font-mono text-sm resize-none"
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-700 text-sm">Expected Output</Label>
                      <Textarea
                        placeholder="e.g., [1, 4, 9, 16, 25]"
                        value={testCase.expectedOutput}
                        onChange={(e) =>
                          handleTestCaseChange(index, "expectedOutput", e.target.value)
                        }
                        className="border-2 border-gray-300 font-mono text-sm resize-none"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="border-2 border-gray-300 px-6"
        >
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6"
        >
          <Save className="mr-2 h-4 w-4" />
          Save Question
        </Button>
      </div>

      {/* Admin Info Note */}
      <div className="p-4 border-2 border-dashed border-purple-300 rounded-lg bg-purple-50 text-center">
        <div className="text-sm text-purple-800">
          <p className="font-semibold mb-1 flex items-center justify-center gap-2">
            <Shield className="w-4 h-4" />
            Admin Question Creation
          </p>
          <p>Fill in all required fields (*) to create a new coding question. The question will be visible to all users once saved.</p>
        </div>
      </div>
    </div>
  );
}
