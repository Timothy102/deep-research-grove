
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./components/auth/AuthContext";
import { ThemeProvider } from "./components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { Toaster as UIToaster } from "@/components/ui/toaster";

import Index from "./pages/Index";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import ResearchPage from "./pages/ResearchPage";
import ProfilePage from "./pages/ProfilePage";
import UserModelsPage from "./pages/UserModelsPage";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/home" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/research" element={<ResearchPage />} />
            <Route path="/research/:sessionId" element={<ResearchPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/models" element={<UserModelsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
        <Toaster position="top-center" />
        <UIToaster />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
