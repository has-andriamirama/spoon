"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TablesRealtimeUpdater() {
  const router = useRouter();
  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), 30000);
    return () => window.clearInterval(timer);
  }, [router]);
  return null;
}
