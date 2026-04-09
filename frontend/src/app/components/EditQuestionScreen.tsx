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
  Edit,
  Plus,
  Trash2
} from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  getQuestionRequestErrorMessage,
  getTopics,
  updateQuestion,
  type Question,
} from "@/app/services/questionService";

interface EditQuestionScreenProps {
  question: Question;
  onBack: () => void;
  onSave?: () => void;
}

const MAX_QUESTION_IMAGES = 5;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const formatImageSize = (sizeInBytes: number) => `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;

const getOversizedImagesMessage = (images: File[]) => {
  const imageNames = images.map((image) => `${image.name} (${formatImageSize(image.size)})`).join(", ");

  return images.length === 1
    ? `${imageNames} exceeds the 5 MB image limit.`
    : `${imageNames} exceed the 5 MB image limit.`;
};

export function EditQuestionScreen({ question, onBack, onSave }: EditQuestionScreenProps) {
  const [title, setTitle] = useState(question.title);
  const [description, setDescription] = useState(question.description);
  const [difficulty, setDifficulty] = useState(question.difficulty);
  const [selectedTopics, setSelectedTopics] = useState<string[]>(() =>
    question.topics.length > 0 ? [...question.topics] : []
  );
  const [availableTopics, setAvailableTopics] = useState<string[]>(() => [...question.topics]);
  const [topicsError, setTopicsError] = useState("");
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [leetcodeLink, setLeetcodeLink] = useState(question.leetcodeLink || "");
  const [existingImageUrls, setExistingImageUrls] = useState(question.imageUrls || []);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imageError, setImageError] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [testCases, setTestCases] = useState(
    question.testCases && question.testCases.length > 0
      ? question.testCases.map((tc) => ({ input: tc.input, expectedOutput: tc.output }))
      : [{ input: "", expectedOutput: "" }]
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const difficulties = ["Easy", "Medium", "Hard"];
  const selectableTopics = Array.from(new Set([...availableTopics, ...selectedTopics]));
  const totalImageCount = existingImageUrls.length + selectedImages.length;
  const canAddMoreImages = totalImageCount < MAX_QUESTION_IMAGES;

  useEffect(() => {
    let isMounted = true;

    const loadTopics = async () => {
      setIsLoadingTopics(true);
      setTopicsError("");

      try {
        const data = await getTopics();
        if (isMounted) {
          setAvailableTopics(data.topics);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setTopicsError(err.response?.data?.error || "Failed to load topics");
        }
      } finally {
        if (isMounted) {
          setIsLoadingTopics(false);
        }
      }
    };

    loadTopics();

    return () => {
      isMounted = false;
    };
  }, []);

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

  const handleTopicToggle = (topic: string) => {
    setSelectedTopics((currentTopics) =>
      currentTopics.includes(topic)
        ? currentTopics.filter((currentTopic) => currentTopic !== topic)
        : [...currentTopics, topic]
    );
  };

  const handleImageSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    const remainingSlots = MAX_QUESTION_IMAGES - existingImageUrls.length - selectedImages.length;
    if (remainingSlots <= 0) {
      setImageError(`You can keep or upload up to ${MAX_QUESTION_IMAGES} images per question.`);
      event.target.value = "";
      return;
    }

    const oversizedImages = files.filter((file) => file.size > MAX_IMAGE_SIZE_BYTES);
    const validImages = files.filter((file) => file.size <= MAX_IMAGE_SIZE_BYTES);

    if (validImages.length === 0) {
      setImageError(getOversizedImagesMessage(oversizedImages));
      event.target.value = "";
      return;
    }

    const filesToAdd = validImages.slice(0, remainingSlots);
    const errors = [
      oversizedImages.length > 0 ? getOversizedImagesMessage(oversizedImages) : "",
      validImages.length > remainingSlots
        ? `Only ${remainingSlots} more image${remainingSlots === 1 ? "" : "s"} can be added.`
        : "",
    ].filter(Boolean);

    setSelectedImages((currentImages) => [...currentImages, ...filesToAdd]);
    setImageError(errors.join(" "));
    event.target.value = "";
  };

  const removeExistingImage = (index: number) => {
    setExistingImageUrls((currentUrls) => currentUrls.filter((_, imageIndex) => imageIndex !== index));
    setImageError("");
  };

  const removeSelectedImage = (index: number) => {
    setSelectedImages((currentImages) => currentImages.filter((_, imageIndex) => imageIndex !== index));
    setImageError("");
  };

  const handleSave = async () => {
    setError("");
    if (!title || !description) {
      setError("Title and description are required");
      return;
    }
    if (!leetcodeLink.trim()) {
      setError("LeetCode link is required.");
      return;
    }
    if (selectedTopics.length === 0) {
      setError("Select at least one topic");
      return;
    }
    if (totalImageCount > MAX_QUESTION_IMAGES) {
      setError(`Keep or upload up to ${MAX_QUESTION_IMAGES} images per question`);
      setImageError(`Remove ${totalImageCount - MAX_QUESTION_IMAGES} image${totalImageCount - MAX_QUESTION_IMAGES === 1 ? "" : "s"} before saving.`);
      return;
    }
    setIsLoading(true);
    try {
      await updateQuestion(question.questionId, {
        title,
        description,
        difficulty,
        topics: selectedTopics,
        testCases: testCases.map((tc) => ({ input: tc.input, output: tc.expectedOutput })),
        leetcodeLink: leetcodeLink.trim(),
        existingImageUrls,
        imageFiles: selectedImages.length > 0 ? selectedImages : undefined,
      });
      if (onSave) onSave();
      onBack();
    } catch (err: unknown) {
      setError(getQuestionRequestErrorMessage(err, "Failed to update question"));
    } finally {
      setIsLoading(false);
    }
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
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg p-6 text-white shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <Edit className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Edit Question</h1>
              <p className="text-purple-100 text-sm mt-1">Update an existing coding challenge</p>
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
                  className="min-h-24 h-28 border-2 border-gray-300 bg-gray-50 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none"
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

              {/* Topics */}
              <div className="space-y-2 md:col-span-2">
                <Label className="text-gray-700 font-medium">
                  Topics <span className="text-red-500">*</span>
                </Label>
                {isLoadingTopics && (
                  <p className="text-sm text-gray-500">Loading topics...</p>
                )}
                {topicsError && (
                  <p className="text-sm text-red-600">{topicsError}</p>
                )}
                {selectableTopics.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {selectableTopics.map((topicOption) => {
                      const isSelected = selectedTopics.includes(topicOption);

                      return (
                        <label
                          key={topicOption}
                          className={
                            isSelected
                              ? "flex cursor-pointer items-center gap-2 rounded-md border-2 border-purple-500 bg-purple-50 px-3 py-2 text-sm font-medium text-purple-800"
                              : "flex cursor-pointer items-center gap-2 rounded-md border-2 border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700"
                          }
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleTopicToggle(topicOption)}
                            className="h-4 w-4 accent-purple-600"
                          />
                          <span className="break-words">{topicOption}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  !isLoadingTopics && (
                    <p className="text-sm text-gray-500">No topics available.</p>
                  )
                )}
              </div>

              {/* LeetCode Link */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="leetcodeLink" className="text-gray-700 font-medium">
                  LeetCode Link <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="leetcodeLink"
                  placeholder="https://leetcode.com/problems/..."
                  value={leetcodeLink}
                  onChange={(e) => setLeetcodeLink(e.target.value)}
                  className="h-11 border-2 border-gray-300"
                />
              </div>
            </div>
          </div>

          {/* Image Upload Section */}
          <div className="pt-6 border-t-2 border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-purple-600" />
              Question Images (Optional)
            </h2>
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Keep existing images or add more visual references for this question
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                multiple
                className="hidden"
                onChange={handleImageSelection}
              />
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <div className="space-y-4">
                  <div className="space-y-3">
                    {totalImageCount === 0 && (
                      <div className="w-16 h-16 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                        <Upload className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!canAddMoreImages}
                        className="border-2 border-gray-300"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {totalImageCount > 0 ? "Add Images" : "Upload Images"}
                      </Button>
                      <p className="text-xs text-gray-500 mt-2">
                        PNG, JPG, GIF or WEBP (max 5MB each). {totalImageCount}/{MAX_QUESTION_IMAGES} kept or selected.
                      </p>
                    </div>
                  </div>

                  {imageError && (
                    <p className="text-sm text-red-600">{imageError}</p>
                  )}

                  {totalImageCount > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
                      {existingImageUrls.map((imageUrl, index) => (
                        <div
                          key={`${imageUrl}-${index}`}
                          className="flex items-center justify-between gap-3 rounded-md border-2 border-gray-200 bg-white p-3"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <img
                              src={imageUrl}
                              alt={`Saved question image ${index + 1}`}
                              className="h-10 w-10 shrink-0 rounded-md bg-gray-100 object-cover"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900">Saved image {index + 1}</p>
                              <p className="truncate text-xs text-gray-500">{imageUrl}</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeExistingImage(index)}
                            className="shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}

                      {selectedImages.map((image, index) => (
                        <div
                          key={`${image.name}-${image.lastModified}-${index}`}
                          className="flex items-center justify-between gap-3 rounded-md border-2 border-gray-200 bg-white p-3"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-green-100">
                              <ImageIcon className="h-5 w-5 text-green-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-gray-900">{image.name}</p>
                              <p className="text-xs text-gray-500">
                                New image - {Math.max(1, Math.round(image.size / 1024))} KB
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSelectedImage(index)}
                            className="shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}
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
          disabled={isLoading}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6"
        >
          <Save className="mr-2 h-4 w-4" />
          {isLoading ? "Saving..." : "Update Question"}
        </Button>
      </div>
    </div>
  );
}
