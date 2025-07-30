export const APPLICATION_QUERY_KEYS = {
  adminApplications: (params) => {
    return ["admin-applications", params];
  },
  applicationDetail: (appID: string) => ["admin-application", appID],
  userApplication: (userID?: string) =>
    userID ? ["application", userID] : ["application"],
};
