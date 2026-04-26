"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy /connect (invite links) — friend connections use User ID search in Friends. */
export default function ConnectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/friends");
  }, [router]);
  return (
    <div className="flex min-h-[40vh] w-full items-center justify-center p-6 text-slate-600">
      Taking you to Friends…
    </div>
  );
}
