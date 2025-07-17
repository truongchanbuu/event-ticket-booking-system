"use client";
import { useEffect, useTransition } from "react";
import NProgress from "nprogress";
import "nprogress/nprogress.css";

NProgress.configure({ showSpinner: false });

export default function GlobalLoading() {
  // useTransition trả về [isPending]
  const [isPending] = useTransition();

  useEffect(() => {
    if (isPending) {
      NProgress.start();
    } else {
      NProgress.done();
    }
  }, [isPending]);

  return null;
}
