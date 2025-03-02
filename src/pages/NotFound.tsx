
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="py-6 px-8 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600"></div>
          <span className="font-display font-semibold text-xl">DeepResearch</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex items-center justify-center">
        <div className="text-center p-8 max-w-md mx-auto neo-morphism rounded-xl bg-background animate-fade-in">
          <h1 className="text-8xl font-display font-bold text-gradient mb-4">404</h1>
          <p className="text-xl text-muted-foreground mb-6">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Button size="lg" onClick={() => navigate("/")} className="transition-all duration-300 hover:scale-105">
            Return Home
          </Button>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
