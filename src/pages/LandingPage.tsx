
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
          <h1 className="text-4xl font-medium">► Hey, I'm Tim.</h1>
          
          <p className="text-xl">
            I'm a 21 y/o ml engineer building AI-1st businesses.
          </p>
          
          <p className="text-xl">
            I spent the last 4 years building early-stage ai companies(inferex, 
            rywave, nu, sync.labs). I think a lot about human cognition and creating 
            agentic AI that complements the physical world.
          </p>
          
          <p className="text-xl">
            you can reach me via <span className="font-medium">twitter</span> or email at{" "}
            <span className="font-medium">tim@timcvetko.com</span>.
          </p>
          
          <h2 className="text-2xl font-medium pt-8">Experience</h2>

          <div className="flex items-center space-x-4 pt-4">
            <div className="h-8 w-8 flex items-center justify-center rounded-md bg-blue-600 text-white">
              S
            </div>
            <span className="text-xl">Sync Labs</span>
            <span className="text-xl ml-auto">2024 →</span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
