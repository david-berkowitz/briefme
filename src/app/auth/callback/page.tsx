"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Signing you in...");

  useEffect(() => {
    const run = async () => {
      const supabase = getSupabase();
      if (!supabase) {
        setMessage("Missing auth config. Please return to /auth.");
        return;
      }

      const url = new URL(window.location.href);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const query = url.searchParams;

      const code = query.get("code");
      const tokenHash = query.get("token_hash");
      const type = query.get("type") as
        | "signup"
        | "recovery"
        | "invite"
        | "email"
        | "magiclink"
        | null;

      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
          if (error) throw error;
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          if (error) throw error;
        }

        const { data } = await supabase.auth.getSession();
        if (data.session) {
          router.replace("/dashboard");
          return;
        }

        setMessage("Login link was invalid or expired. Please request a new one.");
      } catch {
        setMessage("Login link was invalid or expired. Please request a new one.");
      }
    };

    void run();
  }, [router]);

  return (
    <main className="section">
      <div className="container">
        <div className="card max-w-xl">
          <p className="text-sm text-slate-600">{message}</p>
        </div>
      </div>
    </main>
  );
}
