import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { useUserApplication } from "./use-user-application";
import { Application, APPLY_STATUS } from "@/schema";
import { applicationSchema } from "@/schema/application/edit-application.schema";
import { toInputFormat } from "@/lib/helpers/date.helper";

export type ApplicationFormValues = Pick<
  Application,
  "applicationData" | "representativeInfo" | "businessInfo"
>;

export function useApplicationEditForm(userID: string) {
  const [isFormInitialized, setIsFormInitialized] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const {
    applicationQuery: { data, isLoading, isFetched, refetch, isFetching },

    updateData,
    updateDocumentUrl,
    updateDocumentUrlInCache,
  } = useUserApplication(userID);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty, isSubmitting, errors, touchedFields, dirtyFields },
    control,
    clearErrors,
    getValues,
    watch,
    setValue,
  } = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      applicationData: {
        orgName: "",
        description: "",
        website: "",
        facebook: "",
        instagram: "",
        x: "",
      },
      representativeInfo: {
        fullName: "",
        idNumber: "",
        placeOfOrigin: "",
        dob: "",
        gender: "",
        idIssueDate: "",
        idIssuedBy: "",
        nationality: "",
        permanentAddress: "",
      },
      businessInfo: {
        taxCode: "",
        legalName: "",
        address: "",
        businessSectors: [],
        dateOfIssue: "",
        legalRepresentative: "",
        placeOfIssue: "",
        registeredCapital: "",
        typeOfBusiness: "",
      },
    },
    mode: "onChange",
  });

  useEffect(() => {
    const app = data?.data?.[0];
    if (app && !isFormInitialized) {
      const transformedData = {
        ...app,
        representativeInfo: {
          ...app.representativeInfo,
          dob: toInputFormat(app.representativeInfo.dob),
          idIssueDate: toInputFormat(app.representativeInfo.idIssueDate),
        },
        businessInfo: app.businessInfo
          ? {
              ...app.businessInfo,
              dateOfIssue: toInputFormat(app.businessInfo.dateOfIssue),
            }
          : undefined,
      };
      reset(transformedData);

      setCanEdit(
        [
          APPLY_STATUS.NONE,
          APPLY_STATUS.PENDING,
          APPLY_STATUS.PENDING_ADMIN,
          APPLY_STATUS.REJECTED,
        ].includes(app.status)
      );

      setIsFormInitialized(true);
    }
  }, [data, reset, isFormInitialized]);

  const application = data?.data?.[0];

  return {
    register,
    control,
    handleSubmit,
    reset,
    isDirty,
    isSubmitting,
    touchedFields,
    dirtyFields,
    errors,
    getValues,
    watch,
    setValue,
    clearErrors,

    isLoading,
    isFetching,
    isFetched,
    application,
    canEdit,
    currentApplication: data?.data,
    applicationID: application?.applicationID,
    moderation: application?.moderation,

    updateData,
    updateDocumentUrl,

    queryRefetch: refetch,
    updateDocumentUrlInCache,
  };
}
