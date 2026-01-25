import { useState, useEffect, useRef } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation, useNavigate, Navigate } from "react-router-dom";
import axios from "axios";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

// Pages
import LoginPage from "@/pages/LoginPage";
import Dashboard from "@/pages/Dashboard";
import SchedulesPage from "@/pages/SchedulesPage";
import MembersPage from "@/pages/MembersPage";
import ApprovalsPage from "@/pages/ApprovalsPage";
import LinksPage from "@/pages/LinksPage";
import SettingsPage from "@/pages/SettingsPage";
import SidebarLayout from "@/components/SidebarLayout";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH

// Auth Callback Component
const AuthCallback = () => {
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processSession = async () => {
      const hash = window.location.hash;
      const sessionId = new URLSearchParams(hash.substring(1)).get("session_id");

      if (!sessionId) {
        navigate("/login");
        return;
      }

      try {
        const response = await axios.post(
          `${API}/auth/session`,
          { session_id: sessionId },
          { withCredentials: true }
        );

        if (response.data) {
          toast.success("Login realizado com sucesso!");
          navigate("/dashboard", { state: { user: response.data } });
        }
      } catch (error) {
        console.error("Auth error:", error);
        toast.error("Erro ao fazer login");
        navigate("/login");
      }
    };

    processSession();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Autenticando...</p>
      </div>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [user, setUser] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Skip if user data passed from AuthCallback
    if (location.state?.user) {
      setUser(location.state.user);
      setIsAuthenticated(true);
      return;
    }

    const checkAuth = async () => {
      try {
        const response = await axios.get(`${API}/auth/me`, {
          withCredentials: true
        });
        if (response.data) {
          setUser(response.data);
          setIsAuthenticated(true);
        }
      } catch (error) {
        setIsAuthenticated(false);
        navigate("/login");
      }
    };

    checkAuth();
  }, [location, navigate]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return <SidebarLayout user={user}>{children}</SidebarLayout>;
};

// App Router Component
function AppRouter() {
  const location = useLocation();

  // Check URL fragment for session_id (synchronous check)
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/schedules"
        element={
          <ProtectedRoute>
            <SchedulesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/members"
        element={
          <ProtectedRoute>
            <MembersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/approvals"
        element={
          <ProtectedRoute>
            <ApprovalsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/links"
        element={
          <ProtectedRoute>
            <LinksPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
      <Toaster richColors position="top-right" />
    </div>
  );
}

export default App;
