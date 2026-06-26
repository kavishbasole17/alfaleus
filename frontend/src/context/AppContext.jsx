import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { api } from "../api";

const Ctx = createContext(null);

export function AppProvider({ children }) {
  const [competitors, setCompetitors] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [onboarded,   setOnboarded]   = useState(null);
  const [llmStatus,   setLlmStatus]   = useState(null);
  const [theme,       setThemeState]  = useState(
    () => localStorage.getItem("alfaleus_theme") || "dark"
  );

  const toggleTheme = useCallback(() => {
    setThemeState(t => {
      const next = t === "dark" ? "light" : "dark";
      localStorage.setItem("alfaleus_theme", next);
      document.documentElement.setAttribute("data-theme", next);
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, []);

  const refreshCompetitors = useCallback(async () => {
    try { setCompetitors(await api.listCompetitors()); } catch {}
  }, []);

  const refreshUnread = useCallback(async () => {
    try { const { count } = await api.unreadCount(); setUnreadCount(count); } catch {}
  }, []);

  const checkOnboarding = useCallback(async () => {
    try { const { complete } = await api.onboardingStatus(); setOnboarded(complete); }
    catch { setOnboarded(true); }
  }, []);

  const checkLlm = useCallback(async () => {
    try { const h = await api.health(); setLlmStatus(h.llm); } catch {}
  }, []);

  useEffect(() => {
    checkOnboarding();
    refreshCompetitors();
    refreshUnread();
    checkLlm();
    const iv = setInterval(refreshUnread, 30_000);
    return () => clearInterval(iv);
  }, []);

  return (
    <Ctx.Provider value={{
      competitors, setCompetitors, refreshCompetitors,
      unreadCount, setUnreadCount, refreshUnread,
      onboarded, setOnboarded,
      llmStatus,
      theme, toggleTheme,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useApp = () => useContext(Ctx);
