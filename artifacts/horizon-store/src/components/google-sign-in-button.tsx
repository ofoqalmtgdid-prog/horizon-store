import { useEffect, useRef } from "react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            locale?: string;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              theme?: string;
              size?: string;
              width?: number;
              text?: string;
              locale?: string;
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

interface GoogleSignInButtonProps {
  onCredential: (credential: string) => void;
  label?: string;
}

export function GoogleSignInButton({ onCredential, label = "تسجيل الدخول بـ Google" }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  callbackRef.current = onCredential;

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const initialize = () => {
      if (!window.google || !containerRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          callbackRef.current(response.credential);
        },
        locale: "ar",
      });
      window.google.accounts.id.renderButton(containerRef.current, {
        theme: "outline",
        size: "large",
        width: containerRef.current.offsetWidth || 360,
        text: "continue_with",
        locale: "ar",
      });
    };

    if (window.google) {
      initialize();
      return;
    }

    const interval = setInterval(() => {
      if (window.google) {
        clearInterval(interval);
        initialize();
      }
    }, 100);
    return () => clearInterval(interval);
  }, []); // run once only — callback is accessed via ref

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) return null;

  return (
    <div className="w-full flex justify-center">
      <div ref={containerRef} className="w-full" />
    </div>
  );
}
