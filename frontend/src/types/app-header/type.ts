import * as React from "react";

export type HeaderVariant = "default" | "dark" | "gradient";

export type HeaderProps = {
  showTabs?: boolean;
  customTabs?: React.ReactNode;
  variant?: HeaderVariant;
  sticky?: boolean;
  showSearch?: boolean;
  notifications?: number;
};
