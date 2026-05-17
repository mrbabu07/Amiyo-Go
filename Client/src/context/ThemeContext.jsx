import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "light";
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) return savedTheme;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });
  const [manualTheme, setManualTheme] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("theme") !== null;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    if (manualTheme) localStorage.setItem("theme", theme);
  }, [manualTheme, theme]);

  useEffect(() => {
    if (typeof window === "undefined" || manualTheme) {
      return undefined;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handlePreferenceChange = (event) => {
      setTheme(event.matches ? "dark" : "light");
    };

    media.addEventListener("change", handlePreferenceChange);
    return () => media.removeEventListener("change", handlePreferenceChange);
  }, [manualTheme]);

  const toggleTheme = () => {
    setManualTheme(true);
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
