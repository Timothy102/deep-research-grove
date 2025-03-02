
import { useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SignInForm, SignUpForm } from "@/components/auth/AuthForms";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthContext";

const LandingPage = () => {
  const [authTab, setAuthTab] = useState("signin");
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGetStarted = () => {
    if (user) {
      navigate("/research");
    } else {
      const element = document.getElementById("auth-section");
      element?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <header className="py-6 px-8 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600"></div>
          <span className="font-display font-semibold text-xl">DeepResearch</span>
        </div>
        <div className="flex items-center space-x-4">
          {user ? (
            <Button onClick={() => navigate("/research")} variant="ghost">
              Go to Dashboard
            </Button>
          ) : null}
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1">
        <section className="py-24 px-6 max-w-5xl mx-auto text-center">
          <div className="space-y-6 animate-fade-in">
            <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight text-gradient">
              Vertical Deep Research
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              An advanced research agent that conducts thorough analysis through iterative search,
              delivering comprehensive and reliable information synthesis.
            </p>
            <div className="pt-6">
              <Button size="lg" onClick={handleGetStarted} className="h-12 px-8 text-base rounded-full transition-all duration-300 hover:scale-105">
                Get Started
              </Button>
            </div>
          </div>

          <div className="mt-24 p-8 neo-morphism rounded-2xl bg-background">
            <div className="flex flex-col md:flex-row gap-8 md:gap-12 text-left">
              <div className="flex-1">
                <div className="h-12 w-12 flex items-center justify-center rounded-full bg-primary/10 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Intelligent Research</h3>
                <p className="text-muted-foreground">
                  Handles complex research queries by breaking them down into manageable components for thorough exploration.
                </p>
              </div>
              <div className="flex-1">
                <div className="h-12 w-12 flex items-center justify-center rounded-full bg-primary/10 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h1"/><path d="M17 3h1a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1"/><path d="M3 8h3"/><path d="M18 8h3"/><path d="M8 13v3"/><path d="M12 13v8"/><path d="M16 13v3"/><path d="M4 19h1a3 3 0 0 0 3-3v-1"/><path d="M19 19h1a3 3 0 0 0 3-3v-1"/></svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Interactive Results</h3>
                <p className="text-muted-foreground">
                  Watch as research unfolds with real-time updates, giving you insight into the research process and findings.
                </p>
              </div>
              <div className="flex-1">
                <div className="h-12 w-12 flex items-center justify-center rounded-full bg-primary/10 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Reliable Sources</h3>
                <p className="text-muted-foreground">
                  Every finding is backed by trackable sources, ensuring transparency and credibility in the research results.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="auth-section" className="py-24 px-6 bg-secondary/50">
          <div className="max-w-md mx-auto text-center">
            <h2 className="font-display text-3xl font-bold mb-8">
              {user ? "Welcome Back!" : "Create an Account"}
            </h2>
            
            {user ? (
              <div className="space-y-6">
                <p className="text-muted-foreground">You're already signed in.</p>
                <Button 
                  size="lg" 
                  onClick={() => navigate("/research")} 
                  className="h-12 px-8 text-base"
                >
                  Go to Research Dashboard
                </Button>
              </div>
            ) : (
              <Tabs defaultValue="signin" value={authTab} onValueChange={setAuthTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Create Account</TabsTrigger>
                </TabsList>
                <TabsContent value="signin">
                  <SignInForm />
                </TabsContent>
                <TabsContent value="signup">
                  <SignUpForm />
                </TabsContent>
              </Tabs>
            )}
          </div>
        </section>
      </main>

      <footer className="py-10 px-6 border-t">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Deep Research. Built by Tim.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
