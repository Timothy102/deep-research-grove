
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ResearchForm } from "@/components/research/ResearchForm";
import ResearchResults, { ResearchResult } from "@/components/research/ResearchResults";
import { ProgressIndicator } from "@/components/research/ProgressIndicator";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LogOut } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const ResearchPage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [progressStage, setProgressStage] = useState("Initializing");
  const [progressEvents, setProgressEvents] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const handleSubmit = async (query: string, userModel: string, useCase: string) => {
    if (!query.trim()) return;

    setIsLoading(true);
    setResult(null);
    setProgressStage("Starting research");
    setProgressEvents([]);

    try {
      // Create a stream request to the backend
      const response = await fetch("https://api.example.com/stream_research", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          user_model: userModel || "General user",
          use_case: useCase || "General research",
          model: "claude-3.5-sonnet", // Default model
        }),
      });

      // Since we want to simulate the streaming functionality for now
      setTimeout(() => {
        setProgressStage("Analyzing query");
        setProgressEvents(prev => [...prev, "Breaking down research question"]);
      }, 1500);

      setTimeout(() => {
        setProgressStage("Searching for information");
        setProgressEvents(prev => [...prev, "Gathering initial data sources"]);
      }, 3000);

      setTimeout(() => {
        setProgressStage("Processing findings");
        setProgressEvents(prev => [...prev, "Analyzing search results"]);
      }, 5000);

      setTimeout(() => {
        setProgressStage("Synthesizing results");
        setProgressEvents(prev => [...prev, "Consolidating information"]);
      }, 7000);

      // After 8 seconds, show a mock result
      setTimeout(() => {
        setIsLoading(false);
        setResult({
          query,
          answer: "This is a simulated research result for your query. In an actual implementation, this would contain real research findings based on the query, user model, and use case you specified.\n\nThe research agent would have:\n\n1. Broken down your query into manageable components\n2. Searched for relevant information from reliable sources\n3. Analyzed the gathered data\n4. Synthesized the findings into a comprehensive answer\n\nThe actual implementation would connect to your backend streaming endpoint and display real-time updates as the research progresses.",
          sources: [
            "https://example.com/research-source-1",
            "https://example.com/research-source-2",
            "https://example.com/research-source-3"
          ],
          reasoning_path: [
            "Understand the primary research query",
            "Identify key components that need investigation",
            "Gather preliminary information from authoritative sources",
            "Analyze findings for gaps and additional research needs",
            "Synthesize complete answer based on all gathered information"
          ],
          confidence: 0.85
        });
        
        toast({
          title: "Research complete",
          description: "Your research results are ready to view",
        });
      }, 8000);

      // For actual implementation, you would process the SSE stream like this:
      /*
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = decoder.decode(value);
        const events = text.split("\n\n")
          .filter(line => line.startsWith("data: "))
          .map(line => JSON.parse(line.substring(6)));
        
        for (const event of events) {
          if (event.event === "progress") {
            setProgressStage(event.data.stage);
            setProgressEvents(prev => [...prev, event.data.message]);
          } else if (event.event === "complete") {
            setResult(event.data);
            setIsLoading(false);
          }
        }
      }
      */

    } catch (error) {
      console.error("Research error:", error);
      setIsLoading(false);
      toast({
        title: "Research failed",
        description: "An error occurred during research. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="py-4 px-6 md:px-8 border-b">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600"></div>
            <span className="font-display font-semibold text-lg md:text-xl">DeepResearch</span>
          </div>
          
          <div className="flex items-center space-x-4">
            {user && (
              <div className="flex items-center">
                <span className="text-sm hidden md:inline mr-4">
                  {user.email}
                </span>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut size={18} className="mr-2" />
                  <span className="hidden md:inline">Sign Out</span>
                </Button>
              </div>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 py-8 px-6 md:px-8">
        <div className="max-w-6xl mx-auto space-y-10">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold">Research Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Enter your research query and get comprehensive results with reliable sources
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-7 gap-8">
            <div className="lg:col-span-3 space-y-6">
              <div className="p-6 rounded-xl neo-morphism bg-background">
                <h2 className="text-xl font-semibold mb-4">New Research</h2>
                <ResearchForm onSubmit={handleSubmit} isLoading={isLoading} />
              </div>
              
              {isLoading && (
                <div className="animate-fade-in">
                  <ProgressIndicator 
                    isLoading={isLoading} 
                    currentStage={progressStage}
                    events={progressEvents}
                  />
                </div>
              )}
            </div>

            <div className="lg:col-span-4">
              <div className="p-6 rounded-xl neo-morphism bg-background h-full">
                <ResearchResults result={result} />
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-6 px-6 border-t mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Deep Research. Built by Tim.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ResearchPage;
