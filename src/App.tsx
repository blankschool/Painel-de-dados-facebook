import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { FiltersProvider } from "@/contexts/FiltersContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ThemeProvider } from "next-themes";

// Pages
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Connect from "./pages/Connect";
import AuthCallback from "./pages/AuthCallback";

// Dashboard Pages
import Overview from "./pages/Overview";
import Performance from "./pages/Performance";
import Posts from "./pages/Posts";
import Stories from "./pages/Stories";
import Demographics from "./pages/Demographics";
import OnlineFollowers from "./pages/OnlineFollowers";
import Reels from "./pages/Reels";
import Profile from "./pages/Profile";
import AdvancedAnalysis from "./pages/AdvancedAnalysis";
import Followers from "./pages/Followers";
import Content from "./pages/Content";
import Time from "./pages/Time";
import MediaDetail from "./pages/MediaDetail";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <TooltipProvider>
        <AuthProvider>
          <FiltersProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Public routes */}
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/callback" element={<AuthCallback />} />

                {/* Protected routes - requires login */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/connect" element={<Connect />} />
                </Route>

                {/* Protected routes - requires login AND connected account */}
                <Route element={<ProtectedRoute requiresConnection />}>
                  <Route element={<DashboardLayout />}>
                    <Route path="/" element={<Overview />} />
                    <Route path="/overview" element={<Overview />} />
                    <Route path="/followers" element={<Followers />} />
                    <Route path="/content" element={<Content />} />
                    <Route path="/time" element={<Time />} />
                    <Route path="/media/:mediaId" element={<MediaDetail />} />
                    <Route path="/performance" element={<Performance />} />
                    <Route path="/posts" element={<Posts />} />
                    <Route path="/advanced" element={<AdvancedAnalysis />} />
                    <Route path="/stories" element={<Stories />} />
                    <Route path="/demographics" element={<Demographics />} />
                    <Route path="/online" element={<OnlineFollowers />} />
                    <Route path="/reels" element={<Reels />} />
                    <Route path="/profile" element={<Profile />} />
                  </Route>
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </FiltersProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
