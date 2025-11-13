import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useAuthStore } from "./stores/authStore";

// Pages
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage";
import TrainerDashboard from "./pages/dashboards/TrainerDashboard";
import LabTechnicianDashboard from "./pages/dashboards/LabTechnicianDashboard";
import PolicyMakerDashboard from "./pages/dashboards/PolicyMakerDashboard";
import ProfilePage from "./pages/ProfilePage";
import ChatbotPage from "./pages/ChatbotPage";
import HelpSupportPage from "./pages/HelpSupportPage";
import SLDPage from "./pages/SLDPage";
import ReportGenerationPage from "./pages/ReportGenerationPage";

// Layout
import DashboardLayout from "./components/layout/DashboardLayout";
import ProtectedRoute from "./components/auth/ProtectedRoute";

function App() {
  const { checkAuth, isLoading, isCheckingAuth } = useAuthStore();

  useEffect(() => {
    // Check auth only once on mount
    checkAuth();
  }, []); // Empty dependency array - checkAuth is stable

  // Show loading only on initial check
  if (isLoading && !isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />

        {/* Protected Routes */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardRouter />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/chatbot" element={<ChatbotPage />} />
          <Route path="/help" element={<HelpSupportPage />} />
          <Route path="/sld" element={<SLDPage />} />
          <Route path="/reports" element={<ReportGenerationPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

function DashboardRouter() {
  const { user } = useAuthStore();

  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case "TRAINER":
      return <TrainerDashboard />;
    case "LAB_MANAGER":
      return <LabTechnicianDashboard />;
    case "POLICY_MAKER":
      return <PolicyMakerDashboard />;
    default:
      return <Navigate to="/login" replace />;
  }
}

export default App;