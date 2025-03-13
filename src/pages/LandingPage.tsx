
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthContext";
import { v4 as uuidv4 } from 'uuid';

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGetStarted = () => {
    if (user) {
      // Create a new research session and navigate to it
      const newSessionId = uuidv4();
      navigate(`/research/${newSessionId}`);
    } else {
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-gradient-to-b from-background to-background/95">
      <header className="py-4 px-6 flex items-center justify-between backdrop-blur-sm border-b border-border/40">
        <div className="flex items-center space-x-2">
          <a href="/" className="no-underline flex items-center">
            <img 
              src="/arcadia.png" 
              alt="Deep Research" 
              className="h-8 w-auto mr-2" 
            />
            <span className="text-lg font-medium">DeepResearch</span>
          </a>
        </div>
        <div className="flex items-center space-x-4">
          <Button 
            onClick={() => user ? navigate(`/research/${uuidv4()}`) : navigate("/auth")} 
            variant="outline"
            className="text-sm"
          >
            {user ? "Dashboard" : "Login"}
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="max-w-2xl mx-auto space-y-8 text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            AI-Powered<br/>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Deep Research</span>
          </h1>
          
          <p className="text-xl text-muted-foreground">
            Discover deeper insights, make better decisions
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button 
              size="lg" 
              onClick={handleGetStarted}
              className="px-8"
            >
              Get Started
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => window.open("https://twitter.com/cvetko_tim", "_blank")}
              className="px-8"
            >
              Follow on Twitter
            </Button>
          </div>
        </div>
        
        <div className="space-y-6 text-left max-w-2xl mx-auto mt-16">
          <p className="text-base">
            Deep research requires a precise approach.
          </p>
          
          <p className="text-base">
            I think to go from open ai's implementation to a phd-level research technology, it requires exactly 3 things:
          </p>
          
          <ul className="list-none space-y-3 text-base pl-4">
            <li>• identity-driven research behavior (rules for conducting research, i.e source prioritization + behavioral guidelines)</li>
            <li>• contextual data retrieval (finding applicable verifiable knowledge rather than just relevant information)</li>
            <li>• smart context graph builders (how an agent moves through states, i.e when to collect data, when to synthesize, etc.)</li>
          </ul>
          
          <p className="text-base">
            Information alone does not move the world. We have an abundance of information. It's really information networks that converge fast. If we can intelligently capture such nexuses, we can enable faster research.
          </p>
          
          <p className="text-base">
            This might be AGI then — an intelligence capable of both identifying optimal research objectives and self-optimizing to build the most effective context graphs to navigate. Humans think like graph traversal engines too, but we don't maximize our behavior against research objectives. An agent should converge to an optimal context graph faster. That's what we're trying to achieve with this project. 
          </p>
          
          <p className="text-base">
            We're working with a selected few to launch their personal deep researchers. If you want us to build your personalized deep research agent, <a href="mailto:tim@timcvetko.com" className="font-medium hover:underline">drop us a line.</a>
          </p>

          <p className="text-base">
            you can go ahead and try the raw version right now for <button onClick={handleGetStarted} className="text-blue-500 hover:underline font-medium bg-transparent border-none p-0 cursor-pointer">free</button>
          </p>
          
          <div className="pt-4">
            <p className="text-sm">
              you can reach me via <a href="https://x.com/cvetko_tim" className="font-medium hover:underline">twitter</a> or email at{" "}
              <span className="font-medium">tim@timcvetko.com</span>.
            </p>
            
            <p className="text-sm pt-1 text-gray-500">
              built by tim
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
