import axios from "axios";

type ApiErrorResponse = {
  error?: string;
  message?: string;
};

export const extractApiErrorMessage = (err: unknown, fallbackMessage: string): string => {
  if (axios.isAxiosError<ApiErrorResponse>(err)) {
    return err.response?.data?.message || err.response?.data?.error || fallbackMessage;
  }

  if (err instanceof Error && err.message) {
    return err.message;
  }

  return fallbackMessage;
};
