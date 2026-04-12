import apiClient from './apiClient';

export interface AttemptHistoryEntry {
  attemptId: number;
  attemptNumber: number;
  userId: string;
  username: string;
  question: {
    id: number;
    title: string;
    description: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    topics: string[];
    imageUrls: string[];
    archived: boolean;
  };
  submittedCode: string;
  submittedAt: string;
}

export interface CreateAttemptHistoryEntryData {
  questionId: number;
  questionTitle: string;
  questionDescription: string;
  questionDifficulty: 'Easy' | 'Medium' | 'Hard';
  questionTopics: string[];
  questionImageUrls?: string[];
  questionUpdatedAt?: string;
  submittedCode: string;
}

export async function getMyAttemptHistory(questionId?: number): Promise<{ count: number; attempts: AttemptHistoryEntry[] }> {
  const response = await apiClient.get('/attempt-history/me', {
    params: questionId ? { questionId } : {},
  });
  return response.data;
}

export async function createAttemptHistoryEntry(data: CreateAttemptHistoryEntryData): Promise<{ message: string; attempt: AttemptHistoryEntry }> {
  const response = await apiClient.post('/attempt-history', data);
  return response.data;
}
