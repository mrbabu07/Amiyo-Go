import { useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import useAuth from "../hooks/useAuth";

export default function TawkToChat() {
  const { theme } = useTheme();
  const { user } = useAuth();

  useEffect(() => {
    // Wait for Tawk.to to load
    const checkTawk = setInterval(() => {
      if (
        window.Tawk_API &&
        typeof window.Tawk_API.setAttributes === "function"
      ) {
        clearInterval(checkTawk);

        // Set user info if logged in
        if (user) {
          try {
            window.Tawk_API.setAttributes(
              {
                name: user.displayName || user.email,
                email: user.email,
                hash: user.uid,
              },
              function (error) {
                if (error) {
                  console.error("Tawk.to error:", error);
                }
              },
            );
          } catch (error) {
            console.error("Failed to set Tawk attributes:", error);
          }
        }

        // Customize widget based on theme
        if (theme === "dark") {
          // You can customize the widget appearance here
          // Note: Some customizations require Tawk.to dashboard settings
        }
      }
    }, 100);

    // Cleanup
    return () => {
      clearInterval(checkTawk);
    };
  }, [user, theme]);

  // This component doesn't render anything
  // The Tawk.to widget is injected by the script
  return null;
}
