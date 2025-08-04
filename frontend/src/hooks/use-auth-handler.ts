import { useState } from "react";
import { AuthError } from "@/services/auth.service";
import { useToast } from "./use-toast";

interface LoadingMessages {
  LOADING: string;
  SUB_LOADING: string;
  FAILED: string;
  SUCCESS: string;
}

export const useAuthHandler = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [loadingSubMessage, setLoadingSubMessage] = useState("");
  const { toast } = useToast();

  const executeAuthAction = async <T>(
    actionPromise: () => Promise<T>,
    messages: LoadingMessages
  ): Promise<T | null> => {
    setError(null);
    setIsLoading(true);
    setLoadingMessage(messages.LOADING);
    setLoadingSubMessage(messages.SUB_LOADING);

    try {
      const result = await actionPromise();
      toast({
        title: "Success",
        description: messages.SUCCESS,
        variant: "default",
      });
      return result;
    } catch (err: any) {
      const authError = err as AuthError;
      setError(authError.message || messages.FAILED);
      toast({
        title: "Failed",
        description: authError.message || messages.FAILED,
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    loadingMessage,
    loadingSubMessage,
    executeAuthAction,
    setError,
  };
};
