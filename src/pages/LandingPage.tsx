
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthContext";

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="py-6 px-8 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-xl font-medium">DeepResearch</span>
        </div>
        <div className="flex items-center space-x-4">
          <Button 
            onClick={() => navigate("/auth")} 
            variant="outline"
          >
            {user ? "Dashboard" : "Login"}
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-4 py-20">
        <div className="space-y-8">
          
          <p className="text-xl">
            deep research sucks.
          </p>
          
          <p className="text-xl">
            it has no personalization, objective, and its search engine is irrelevant to my objective
          </p>
          
          <p className="text-xl">
            you can reach me via <span className="font-medium">twitter</span> or email at{" "}
            <span className="font-medium">tim@timcvetko.com</span>.
          </p>
          
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
