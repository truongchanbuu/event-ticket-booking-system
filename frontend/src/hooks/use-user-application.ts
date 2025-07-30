import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  getLastApplication,
  updateMyApplication,
} from "@/lib/api/application/api";
import { APPLICATION_QUERY_KEYS } from "@/constants/applications";
import { Application, ApplicationReponse } from "@/schema";
import { useToast } from "./use-toast";

export function useUserApplication(userID?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = APPLICATION_QUERY_KEYS.userApplication(userID);

  const applicationQuery = useQuery<ApplicationReponse>({
    queryKey: queryKey,
    queryFn: getLastApplication,
    enabled: Boolean(userID),
    placeholderData: keepPreviousData,
  });

  const updateDocumentUrlInCache = ({
    fieldName,
    fileUrl,
  }: {
    fieldName: string;
    fileUrl: string;
  }) => {
    queryClient.setQueryData<ApplicationReponse | undefined>(
      queryKey,
      (oldData) => {
        const currentApplication = oldData?.data?.[0];
        if (!oldData || !currentApplication) {
          return oldData;
        }

        const newDocuments = currentApplication.documents.map((doc) => {
          if (doc.documentType === fieldName) {
            return {
              ...doc,
              fileUrl,
              updatedAt: new Date().toISOString(),
            };
          }
          return doc;
        });

        const updatedApplication: Application = {
          ...currentApplication,
          documents: newDocuments,
        };

        const newResponse: ApplicationReponse = {
          ...oldData,
          data: updatedApplication,
        };

        return newResponse;
      }
    );
  };

  const updateDocumentUrl = useMutation({
    mutationFn: ({
      appId,
      data,
    }: {
      appId: string;
      data: Partial<Application>;
    }) => updateMyApplication(appId, data),
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData =
        queryClient.getQueryData<ApplicationReponse>(queryKey);

      const updatedDoc = newData.data.documents?.[0]; // Giả sử bạn chỉ update 1 doc mỗi lần
      if (updatedDoc?.fileUrl && updatedDoc?.documentType) {
        updateDocumentUrlInCache({
          fieldName: updatedDoc.documentType,
          fileUrl: updatedDoc.fileUrl,
        });
      }

      return { previousData };
    },

    onError: (err, newData, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      toast({
        variant: "destructive",
        title: "Cannot update your application",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateData = useMutation({
    mutationFn: ({
      appId,
      data,
    }: {
      appId: string;
      data: Partial<Application>;
    }) => updateMyApplication(appId, data),
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData =
        queryClient.getQueryData<ApplicationReponse>(queryKey);

      return { previousData };
    },
    onError: (err, newData, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      toast({
        variant: "destructive",
        title: "Cannot update your application",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    applicationQuery,
    updateData,
    updateDocumentUrl,
    updateDocumentUrlInCache,
  };
}
