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
          <a href="/" className="no-underline">
            <span className="text-lg font-medium">DeepResearch</span>
          </a>
        </div>
        <div className="flex items-center space-x-4">
          <Button 
            onClick={() => navigate("/auth")} 
            variant="outline"
            className="text-sm"
          >
            {user ? "Dashboard" : "Login"}
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto px-4 py-16">
        <div className="space-y-6">
          
          <p className="text-base">
            deep research sucks.
          </p>
          
          <p className="text-base">
            I think to go from open ai's implementation to a phd-level research technology, it requires exactly 3 things:
          </p>
          
          <ul className="list-none space-y-3 text-base pl-4">
            <li>• identity-driven behavior (rules for conducting research, source prioritization)</li>
            <li>• reliable data sources with verifiable information</li>
            <li>• sophisticated knowledge graph builder that connects concepts meaningfully</li>
          </ul>
          
          <p className="text-base">
            People think information moves the world. We have an abundance of information. It's really knowledge that gets executed. If we can intelligently capture personalized knowledge, we can enable faster research.
          </p>
          
          <p className="text-base">
          This might be AGI then — an agent that can define, navigate, and self-optimize any context graph/objective combo. Humans are also graph traversal engines, but we don't maximize our behavior purely against research objectives. An agent should probably converge to an optimal context graph faster. Ultimately, if we have all the imperative knowledge in a given domain, we can converge to the ultimate marketing agent, biochem researcher, etc.
          </p>
          
          <p className="text-base">
            we're working with a selected few to launch their personal deep researchers, but you can try the raw version right now for <a href="/auth" onClick={(e) => {e.preventDefault(); navigate("/auth");}} className="text-blue-500 hover:underline font-medium">free</a>
          </p>

          <div className="pt-4">
            <p className="text-sm">
              you can reach me via <a href="https://twitter.com/timcvetko" className="font-medium">twitter</a> or email at{" "}
              <span className="font-medium">tim@timcvetko.com</span>
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