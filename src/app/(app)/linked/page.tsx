"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LinkedRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/friends?tab=friends");
  }, [router]);
  return (
    <div className="flex min-h-[40vh] w-full items-center justify-center p-6 text-slate-600">
      Redirecting…
    </div>
  );
}
