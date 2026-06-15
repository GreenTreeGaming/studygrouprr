"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { isEduEmail } from "@/lib/authRules";
import AlertModal from "@/components/AlertModal";

export default function AuthButton() {
  const [loggedIn, setLoggedIn] = useState(false);

  const [alertOpen, setAlertOpen] = useState(false);

  const [alertConfig, setAlertConfig] = useState({
    title: "",
    message: "",
    type: "info" as
        | "success"
        | "error"
        | "warning"
        | "info",
  });

  function showAlert(
      title: string,
      message: string,
      type:
          | "success"
          | "error"
          | "warning"
          | "info" = "info"
  ) {
    setAlertConfig({
      title,
      message,
      type,
    });

    setAlertOpen(true);
  }

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && !isEduEmail(user.email)) {
        showAlert(
            "University Email Required",
            "StudyGrouprr is currently only available to students with a .edu email address.",
            "warning"
        );

        setTimeout(async () => {
          await supabase.auth.signOut();
          setLoggedIn(false);
        }, 2000);
        return;
      }

      setLoggedIn(!!user);
    }

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
          const email = session?.user?.email;

          if (email && !isEduEmail(email)) {
            showAlert(
                "University Email Required",
                "StudyGrouprr is currently only available to students with a .edu email address.",
                "warning"
            );

            setTimeout(async () => {
              await supabase.auth.signOut();
              setLoggedIn(false);
            }, 2000);

            return;
          }

          setLoggedIn(!!session?.user);
        }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function signIn() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "http://localhost:3000",
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

        <AlertModal
            open={alertOpen}
            title={alertConfig.title}
            message={alertConfig.message}
            type={alertConfig.type}
            onClose={() => setAlertOpen(false)}
        />
      </>
  );
}