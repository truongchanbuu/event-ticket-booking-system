import { QUERY_KEYS } from "@/constants/payment";
import {
  createPaymentMethod,
  deletePaymentMethod,
  getPaymentMethods,
  PaymentMethodResponse,
  PaymentMethodsResponse,
  updatePaymentMethod,
} from "@/lib/api/payment/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "./use-toast";
import {
  CreatePaymentMethodInput,
  PaymentMethod,
  UpdatePaymentMethodInput,
} from "@/schema";
import { APIResponse } from "@/schema/api";

type UpdatePaymentArgs = {
  paymentMethodID: string;
  paymentMethodData: UpdatePaymentMethodInput;
};

type MethodsMutationContext = {
  previousMethods: PaymentMethod[] | undefined;
};

export const usePaymentMethods = () => {
  const queryClient = useQueryClient();

  const queryKey = QUERY_KEYS.paymentMethods;

  const {
    data: methods = [],
    isLoading,
    isError,
    error,
  } = useQuery<PaymentMethodsResponse, Error, PaymentMethod[]>({
    queryKey: queryKey,
    queryFn: getPaymentMethods,
    staleTime: 1000 * 60 * 5,
    select: (response) => response.data,
  });

  const { mutate: createMethod, isPending: isCreating } = useMutation<
    PaymentMethodResponse,
    Error,
    CreatePaymentMethodInput
  >({
    mutationFn: createPaymentMethod,
    onSuccess: () => {
      toast({ variant: "success", title: "Create successfully." });
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to create payment method.",
        description: error.message || "Please try again later.",
      });
    },
  });

  const { mutate: updateMethod, isPending: isUpdating } = useMutation<
    PaymentMethodResponse,
    Error,
    UpdatePaymentArgs
  >({
    mutationFn: ({ paymentMethodID, paymentMethodData }) =>
      updatePaymentMethod(paymentMethodID, paymentMethodData),

    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey });
      const previousMethods =
        queryClient.getQueryData<PaymentMethod[]>(queryKey);

      queryClient.setQueryData(queryKey, (oldData: PaymentMethod[] = []) =>
        oldData.map((method) =>
          method.paymentMethodID === newData.paymentMethodID
            ? { ...method, ...newData.paymentMethodData }
            : method
        )
      );
      return { previousMethods };
    },

    onSuccess: (data, variables) => {
      toast({
        variant: "success",
        title: "Update successfully.",
        description: `Payment method ${variables.paymentMethodID} has been updated.`,
      });
    },

    onError: (err, newData, context: MethodsMutationContext) => {
      queryClient.setQueryData(queryKey, context?.previousMethods);
      toast({
        variant: "destructive",
        title: "Failed to update.",
        description: err.message || "Your changes have been rolled back.",
      });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const { mutate: deleteMethod, isPending: isDeleting } = useMutation<
    APIResponse<null>,
    Error,
    string
  >({
    mutationFn: deletePaymentMethod,
    onMutate: async (paymentMethodID) => {
      await queryClient.cancelQueries({ queryKey });
      const previousMethods =
        queryClient.getQueryData<PaymentMethod[]>(queryKey);

      queryClient.setQueryData(queryKey, (oldData: PaymentMethod[] = []) =>
        oldData.filter((method) => method.paymentMethodID !== paymentMethodID)
      );
      return { previousMethods };
    },

    onSuccess: (data, paymentMethodID) => {
      toast({
        variant: "success",
        title: "Delete successfully.",
        description: `Payment method ${paymentMethodID} has been removed.`,
      });
    },

    onError: (err, paymentMethodID, context: MethodsMutationContext) => {
      queryClient.setQueryData(queryKey, context?.previousMethods);
      toast({
        variant: "destructive",
        title: "Failed to delete.",
        description: err.message || "The item has been restored.",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    methods,
    isLoading,
    isError,
    error,
    createMethod,
    isCreating,
    updateMethod,
    isUpdating,
    deleteMethod,
    isDeleting,
  };
};
