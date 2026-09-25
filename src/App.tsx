import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Onboarding from "./pages/Onboarding";
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Connections from "./pages/Connections";
import Messages from "./pages/Messages";
import Favorites from "./pages/Favorites";
import Experiences from "./pages/Experiences";
import Journeys from "./pages/Journeys";

const queryClient = new QueryClient();
const isDemoMode = import.meta.env.VITE_DEMO_MODE === "true";

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (isDemoMode) return <>{children}</>;
  if (loading) return <div className="min-h-screen bg-background" />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const RequireOnboarding = ({ children }: { children: React.ReactNode }) => {
  if (isDemoMode) return <>{children}</>;
  const onboarded = localStorage.getItem("globethrotters_onboarded");
  if (!onboarded) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => (
  <RequireAuth><RequireOnboarding>{children}</RequireOnboarding></RequireAuth>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
            {/* Discovery is public; personal and social areas require an account. */}
            <Route path="/" element={<Index />} />
            <Route path="/places" element={<ProtectedRoute><Experiences /></ProtectedRoute>} />
            <Route path="/visited" element={<Navigate to="/places" replace />} />
            <Route path="/wishlist" element={<Navigate to="/places" replace />} />
            <Route path="/experiences" element={<Navigate to="/places" replace />} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/user/:userId" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
            <Route path="/connections" element={<ProtectedRoute><Connections /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/messages/:conversationId" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
            <Route path="/journeys" element={<ProtectedRoute><Journeys /></ProtectedRoute>} />
            {/* Legacy redirects */}
            <Route path="/lists" element={<Navigate to="/places" replace />} />
            <Route path="/discover" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
