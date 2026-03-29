import apiClient from './apiClient';

export interface Question {
  questionId: number;
  title: string;
  description: string;
  constraints: string | null;
  testCases: { input: string; output: string }[];
  leetcodeLink: string | null;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topics: string[];
  imageUrls: string[];
  createdAt: string;
  updatedAt: string;
}

export interface QuestionFilters {
  topics?: string[];
  difficulty?: string;
}

export interface TopicsResponse {
  count: number;
  topics: string[];
}

export interface CreateQuestionData {
  title: string;
  description: string;
  constraints?: string;
  testCases: { input: string; output: string }[];
  leetcodeLink?: string;
  difficulty: string;
  topics: string[];
  imageFiles?: File[];
  existingImageUrls?: string[];
}

function buildQuestionFormData(data: Partial<CreateQuestionData>) {
  const formData = new FormData();

  if (data.title !== undefined) formData.append('title', data.title);
  if (data.description !== undefined) formData.append('description', data.description);
  if (data.constraints !== undefined) formData.append('constraints', data.constraints);
  if (data.leetcodeLink !== undefined) formData.append('leetcodeLink', data.leetcodeLink);
  if (data.difficulty !== undefined) formData.append('difficulty', data.difficulty);
  if (data.topics !== undefined) formData.append('topics', JSON.stringify(data.topics));
  if (data.testCases !== undefined) formData.append('testCases', JSON.stringify(data.testCases));
  if (data.existingImageUrls !== undefined) {
    formData.append('existingImageUrls', JSON.stringify(data.existingImageUrls));
  }

  data.imageFiles?.forEach((file) => {
    formData.append('images', file);
  });

  return formData;
}

export async function getQuestions(filters?: QuestionFilters): Promise<{ count: number; questions: Question[] }> {
  const params: Record<string, string> = {};
  if (filters?.topics && filters.topics.length > 0) {
    params.topics = filters.topics.join(',');
  }
  if (filters?.difficulty) {
    params.difficulty = filters.difficulty;
  }
  const response = await apiClient.get('/questions', { params });
  return response.data;
}

export async function getQuestionById(id: number): Promise<{ question: Question }> {
  const response = await apiClient.get(`/questions/${id}`);
  return response.data;
}

export async function getTopics(): Promise<TopicsResponse> {
  const response = await apiClient.get('/questions/topics');
  return response.data;
}

export async function createQuestion(data: CreateQuestionData) {
  const response = await apiClient.post('/questions', buildQuestionFormData(data));
  return response.data;
}

export async function updateQuestion(id: number, data: Partial<CreateQuestionData>) {
  const response = await apiClient.put(`/questions/${id}`, buildQuestionFormData(data));
  return response.data;
}

export async function deleteQuestion(id: number) {
  const response = await apiClient.delete(`/questions/${id}`);
  return response.data;
}
