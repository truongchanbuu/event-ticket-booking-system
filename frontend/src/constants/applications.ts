import {
  ApplicationFetchOptions,
  ApplicationQueryKey,
} from "@/types/application/application-type";

export const APPLICATION_QUERY_KEYS = {
  adminApplications: (
    params?: ApplicationFetchOptions
  ): ApplicationQueryKey => {
    return ["admin-applications", params];
  },
  applicationDetail: (appID: string) => ["admin-application", appID],
  userApplication: (userID?: string) =>
    userID ? ["application", userID] : ["application"],
};
