
import React, { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

interface ResearchFormProps {
  onSubmit: (query: string) => void;
  maxIterations?: number;
  maxDepth?: number;
  initialQuery?: string;
}

export const ResearchForm: React.FC<ResearchFormProps> = ({
  onSubmit,
  maxIterations = 250,
  maxDepth = 25,
  initialQuery = "",
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [iterations, setIterations] = useState(maxIterations);
  const [depth, setDepth] = useState(maxDepth);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    // Store configuration in session storage or another state management solution
    sessionStorage.setItem("research_config", JSON.stringify({
      maxIterations: iterations,
      maxDepth: depth
    }));
    
    onSubmit(query);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Research Query</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="query">What would you like to research?</Label>
            <Textarea
              id="query"
              placeholder="Enter your research question or topic..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-h-20"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="iterations">Max Iterations: {iterations}</Label>
            <Slider
              id="iterations"
              min={50}
              max={500}
              step={10}
              value={[iterations]}
              onValueChange={(values) => setIterations(values[0])}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="depth">Max Depth: {depth}</Label>
            <Slider
              id="depth"
              min={5}
              max={50}
              step={5}
              value={[depth]}
              onValueChange={(values) => setDepth(values[0])}
            />
          </div>
        </CardContent>
        
        <CardFooter>
          <Button type="submit" className="w-full">Start Research</Button>
        </CardFooter>
      </form>
    </Card>
  );
};
