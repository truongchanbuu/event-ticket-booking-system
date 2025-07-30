import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { useUserApplication } from "./use-user-application";
import { Application, APPLY_STATUS } from "@/schema";
import { applicationSchema } from "@/schema/application/edit-application.schema";

export type ApplicationFormValues = Pick<
  Application,
  "applicationData" | "representativeInfo" | "businessInfo"
>;

export function useApplicationEditForm(userID?: string) {
  const [canEdit, setCanEdit] = useState(false);
  const {
    applicationQuery: { data, isLoading, isFetched, isFetching },
    setEditting,
  } = useUserApplication(userID);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty, isSubmitting, errors },
    control,
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

  // Load data from backend once fetched
  useEffect(() => {
    const app = data?.data?.[0];
    if (app) {
      reset({
        applicationData: app.applicationData,
        representativeInfo: app.representativeInfo,
        businessInfo: app.businessInfo,
      });

      setCanEdit(
        [
          APPLY_STATUS.NONE,
          APPLY_STATUS.PENDING,
          APPLY_STATUS.PENDING_ADMIN,
          APPLY_STATUS.REJECTED,
        ].includes(app.status)
      );
    }
  }, [data, reset]);

  const application = data?.data?.[0];

  return {
    register,
    control,
    handleSubmit,
    reset,
    isDirty,
    isSubmitting,
    errors,
    getValues,
    watch,
    setValue,
    isLoading,
    isFetched,
    application,
    canEdit,
    applicationID: application?.applicationID,
    moderation: application?.moderation,
    setEditting,
  };
}
