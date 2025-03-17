
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MessageSquarePlus } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  const handleStartResearch = () => {
    navigate("/research");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="py-6 px-8 flex items-center justify-between">
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
            onClick={() => navigate("/auth")}
            variant="outline"
            size="sm"
          >
            Sign In
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-3xl shadow-lg neo-morphism">
          <CardContent className="p-8 space-y-8">
            <div className="space-y-3">
              <h1 className="text-4xl font-bold">Deep Research</h1>
              <p className="text-muted-foreground text-lg">
                Find, connect, and synthesize information across multiple sources.
              </p>
            </div>
            
            <Separator />
            
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold">Intelligent Research Assistant</h2>
                <p className="text-muted-foreground mt-1">
                  Ask complex questions and get comprehensive answers backed by verified sources.
                </p>
              </div>
              
              <div>
                <h2 className="text-xl font-semibold">Customizable Research Models</h2>
                <p className="text-muted-foreground mt-1">
                  Choose from specialized research models or create your own.
                </p>
              </div>
              
              <div>
                <h2 className="text-xl font-semibold">Source Transparency</h2>
                <p className="text-muted-foreground mt-1">
                  Verify every insight with direct links to source material.
                </p>
              </div>
            </div>
            
            <div className="pt-4">
              <Button 
                size="lg" 
                className="w-full flex items-center justify-center gap-2"
                onClick={handleStartResearch}
              >
                <MessageSquarePlus className="h-5 w-5" />
                Start Researching
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Index;
