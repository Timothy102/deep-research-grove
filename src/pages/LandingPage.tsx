
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthContext";

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <header className="py-4 px-6 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <a href="/" className="no-underline flex items-center">
            <img 
              src="/arcadia.png" 
              alt="Deep Research" 
              className="h-8 w-auto mr-2" 
            />
            <span className="text-lg font-light">deep research</span>
          </a>
        </div>
        <div className="flex items-center space-x-4">
          <Button 
            onClick={() => navigate("/auth")} 
            variant="outline"
            className="text-sm"
          >
            {user ? "Start Now" : "Login"}
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto px-4 py-16">
        <div className="space-y-6 text-left">
          
          <p className="text-base font-light">
            deep research sucks.
          </p>
          
          <p className="text-base font-light">
            We believe moving from open ai's implementation to a phd-level research technology requires exactly 3 things:
          </p>
          
          <ul className="list-none space-y-3 text-base font-light pl-4">
            <li>• identity-driven research behavior (rules for conducting research, i.e source prioritization + behavioral guidelines)</li>
            <li>• contextual data retrieval (finding applicable verifiable knowledge rather than just relevant information)</li>
            <li>• smart context graph builders (how an agent moves through states, i.e when to collect data, when to synthesize, etc.)</li>
          </ul>
          
          <p className="text-base font-light">
            Information alone does not move the world. We have an abundance of information. It's really information networks that converge fast. If we can intelligently capture such nexuses, we can enable faster research.
          </p>
          
          <p className="text-base font-light">
            This might be AGI then — an intelligence capable of both identifying optimal research objectives and self-optimizing to build the most effective context graphs to navigate. That's what we're trying to achieve with this project. You can read the full article <a href="https://generativeai.pub/deep-research-sucks-a8e443abe610" className="text-blue-500 hover:underline font-light">here</a>.
          </p>
          
          <p className="text-base font-light">
            we're working with a selected few to launch their personal deep researchers. if you want us to build your personalized deep research agent, <a href="https://cal.com/timcvetko" className="text-blue-500 hover:underline font-light">book a call</a>
          </p>

          <p className="text-base font-light">
            you can go ahead and try the raw version right now for <a href="/auth" onClick={(e) => {e.preventDefault(); navigate("/auth");}} className="text-blue-500 hover:underline font-light">free</a>
          </p>
          
          <div className="pt-4">
            <p className="text-sm font-light">
              you can reach me via <a href="https://x.com/cvetko_tim" className="font-light">twitter</a> or email at{" "}
              <span className="font-light">tim@timcvetko.com</span>.
            </p>
            
            <p className="text-sm pt-1 text-gray-500 font-light">
              built by tim
            </p>
          </div>
          
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
