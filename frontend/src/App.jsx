import { Routes, Route, Navigate } from "react-router-dom";
import { useApp } from "./context/AppContext";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Dashboard from "./pages/Dashboard";
import Feed from "./pages/Feed";
import CompetitorDetail from "./pages/CompetitorDetail";
import Settings from "./pages/Settings";
import OnboardingFlow from "./components/OnboardingFlow";

export default function App() {
  const { onboarded, setOnboarded } = useApp();

  if (onboarded === null) {
    return (
      <div className="loading-state" style={{ height: "100vh" }}>
        <span className="spinner" /> Loading…
      </div>
    );
  }

  if (!onboarded) {
    return <OnboardingFlow onComplete={() => setOnboarded(true)} />;
  }

  return (
    <div className="layout">
      <Sidebar />
      <div className="main">
        <Topbar />
        <Routes>
          <Route path="/"            element={<Dashboard />} />
          <Route path="/feed"        element={<Feed />} />
          <Route path="/competitor/:id" element={<CompetitorDetail />} />
          <Route path="/settings"    element={<Settings />} />
          <Route path="*"            element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}
