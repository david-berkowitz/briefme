"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";

export default function AuthHashHandler() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const run = async () => {
      if (typeof window === "undefined") return;
      if (!window.location.hash?.includes("access_token=")) return;

      const supabase = getSupabase();
      if (!supabase) return;

      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");

      if (!accessToken || !refreshToken) return;

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      if (error) return;

      // Clean auth tokens from the URL bar and move user into the app.
      window.history.replaceState({}, "", pathname || "/");
      if (pathname !== "/dashboard") {
        router.replace("/dashboard");
      }
    };

    void run();
  }, [pathname, router]);

  return null;
}
