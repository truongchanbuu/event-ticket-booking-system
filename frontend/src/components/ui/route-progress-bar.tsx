// components/RouteProgressBar.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

interface Props {
  height?: number;
  color?: string;
  gradient?: boolean;
}

export function RouteProgressBar({
  height = 4,
  color = "#6E28F5", // Màu tím mặc định của bạn
  gradient = true,
}: Props) {
  const [progress, setProgress] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Dùng useEffect để kết thúc khi route thay đổi
  useEffect(() => {
    // Đặt progress thành 100 để chạy animation "finish"
    setProgress(100);
  }, [pathname, searchParams]);

  // Bắt sự kiện click để bắt đầu
  useEffect(() => {
    const handleAnchorClick = (event: MouseEvent) => {
      const targetUrl = (event.currentTarget as HTMLAnchorElement).href;
      const currentUrl = window.location.href;

      // Bỏ qua nếu URL giống hệt nhau hoặc là hash link
      if (targetUrl === currentUrl || targetUrl.startsWith(currentUrl + "#")) {
        return;
      }

      // Bắt đầu thanh loading
      setProgress(0);
      setIsActive(true);
    };

    const handleMutation: MutationCallback = () => {
      const anchors = document.querySelectorAll("a");
      anchors.forEach((a) => a.addEventListener("click", handleAnchorClick));
    };

    const mutationObserver = new MutationObserver(handleMutation);
    mutationObserver.observe(document, { childList: true, subtree: true });

    // Cleanup
    return () => {
      mutationObserver.disconnect();
    };
  }, []);

  // Timer để ẩn thanh loading sau khi kết thúc
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (progress === 100) {
      timer = setTimeout(() => {
        setIsActive(false);
        // Reset progress sau khi đã ẩn đi
        setTimeout(() => setProgress(0), 300);
      }, 500); // Thời gian chờ phải lớn hơn transition/animation
    }
    return () => clearTimeout(timer);
  }, [progress]);

  if (!isActive) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999]"
      style={{ height }}
    >
      <div
        className={`h-full w-full origin-left transition-transform duration-500 ease-out`}
        style={{
          transform: `scaleX(${progress / 100})`,
          background: gradient
            ? "linear-gradient(to right, #6E28F5, #8B5CF6, #6E28F5)"
            : color,
        }}
      />
    </div>
  );
}
