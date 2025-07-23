// /app/test-profile/page.tsx
"use client";

// Import trực tiếp component trang profile của bạn
import UserProfilePage from "@/app/profile/page"; // <-- Sửa lại đường dẫn này cho đúng với file UserProfilePage của bạn

export default function TestProfilePage() {
  console.log("Rendering the test page. This should only appear once on load.");

  return (
    <div>
      <h1
        style={{
          textAlign: "center",
          padding: "20px",
          backgroundColor: "lightcoral",
        }}
      >
        THIS IS THE ISOLATION TEST PAGE
      </h1>
      {/* 
        Chúng ta render UserProfilePage trực tiếp,
        KHÔNG có ProtectedRoute hay bất kỳ layout phức tạp nào.
      */}
      <UserProfilePage />
    </div>
  );
}
