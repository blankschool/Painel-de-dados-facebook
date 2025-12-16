import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AccountProvider } from "@/contexts/AccountContext";
import { InstagramProvider } from "@/contexts/InstagramContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

// Pages
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";

// Dashboard Pages
import Overview from "./pages/Overview";
import Growth from "./pages/Growth";
import Performance from "./pages/Performance";
import Posts from "./pages/Posts";
import Stories from "./pages/Stories";
import Demographics from "./pages/Demographics";
import OnlineFollowers from "./pages/OnlineFollowers";
import Reels from "./pages/Reels";
import Profile from "./pages/Profile";
import ApiStatus from "./pages/ApiStatus";
import DeveloperMode from "./pages/DeveloperMode";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <AccountProvider>
          <InstagramProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                  <Route path="/" element={<Home />} />
                  <Route path="/overview" element={<Overview />} />
                  <Route path="/growth" element={<Growth />} />
                  <Route path="/performance" element={<Performance />} />
                  <Route path="/posts" element={<Posts />} />
                  <Route path="/stories" element={<Stories />} />
                  <Route path="/demographics" element={<Demographics />} />
                  <Route path="/online" element={<OnlineFollowers />} />
                  <Route path="/reels" element={<Reels />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/api-status" element={<ApiStatus />} />
                  <Route path="/developer" element={<DeveloperMode />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </InstagramProvider>
        </AccountProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;