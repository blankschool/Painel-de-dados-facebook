import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { InstagramProvider } from "@/contexts/InstagramContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Posts from "./pages/Posts";
import Stories from "./pages/Stories";
import Optimization from "./pages/Optimization";
import Profile from "./pages/Profile";
import Mentions from "./pages/Mentions";
import Benchmarks from "./pages/Benchmarks";
import NotFound from "./pages/NotFound";
import AuthCallback from "./pages/AuthCallback";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <InstagramProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                <Route path="/" element={<Navigate to="/profile" replace />} />
                <Route path="/posts" element={<Posts />} />
                <Route path="/stories" element={<Stories />} />
                <Route path="/optimization" element={<Optimization />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/mentions" element={<Mentions />} />
                <Route path="/benchmarks" element={<Benchmarks />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </InstagramProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
