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

export interface CreateQuestionData {
  title: string;
  description: string;
  constraints?: string;
  testCases: { input: string; output: string }[];
  leetcodeLink?: string;
  difficulty: string;
  topics: string[];
  imageUrls?: string[];
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

export async function createQuestion(data: CreateQuestionData) {
  const response = await apiClient.post('/questions', data);
  return response.data;
}

export async function updateQuestion(id: number, data: Partial<CreateQuestionData>) {
  const response = await apiClient.put(`/questions/${id}`, data);
  return response.data;
}

export async function deleteQuestion(id: number) {
  const response = await apiClient.delete(`/questions/${id}`);
  return response.data;
}