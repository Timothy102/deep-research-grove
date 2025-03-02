
import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SignInForm, SignUpForm } from "@/components/auth/AuthForms";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthContext";
import { Loader2 } from "lucide-react";

const LandingPage = () => {
  const [authTab, setAuthTab] = useState("signin");
  const navigate = useNavigate();
  const { user, loading, signInWithGoogle } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/research");
    }
  }, [user, navigate]);

  const handleGetStarted = () => {
    if (user) {
      navigate("/research");
    } else {
      const element = document.getElementById("auth-section");
      element?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Google sign in error:", error);
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
            
            {loading ? (
              <div className="flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : user ? (
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
              <div className="space-y-8">
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
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  className="w-full h-11" 
                  onClick={handleGoogleSignIn}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" className="mr-2">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    <path d="M1 1h22v22H1z" fill="none"/>
                  </svg>
                  Google
                </Button>
              </div>
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
