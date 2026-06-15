"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthButton() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setLoggedIn(!!user);
    }

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          setLoggedIn(!!session?.user);
        }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function signIn() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error(error);
    }

    window.location.reload();
  }

  return (
      <>
        {loggedIn ? (
            <button
                onClick={signOut}
                className="rounded-lg bg-red-500 px-4 py-2 text-white"
            >
              Logout
            </button>
        ) : (
            <button
                onClick={signIn}
                className="rounded-lg bg-black px-4 py-2 text-white"
            >
              Sign In With Google
            </button>
        )}
      </>
  );
}