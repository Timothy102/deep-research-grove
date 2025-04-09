
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Lightbulb, ArrowDown } from "lucide-react";

export interface ReasoningPathProps {
  reasoningPath: string[];
  className?: string;
}

const ReasoningPath: React.FC<ReasoningPathProps> = ({ reasoningPath, className }) => {
  if (!reasoningPath || reasoningPath.length === 0) {
    return (
      <div className="text-center p-4 text-muted-foreground">
        No reasoning path available yet.
      </div>
    );
  }

  return (
    <div className={className}>
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <Lightbulb className="mr-2 h-5 w-5 text-yellow-500" />
            Research Reasoning Path
          </h3>
          
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {reasoningPath.map((step, index) => (
                <div key={index} className="relative">
                  <div className="flex">
                    <div className="flex-shrink-0 w-10 flex justify-center">
                      <div className="rounded-full w-8 h-8 bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
                        {index + 1}
                      </div>
                    </div>
                    <div className="ml-4 bg-card rounded-lg p-3 border text-sm">
                      <p className="whitespace-pre-wrap">{step}</p>
                    </div>
                  </div>
                  
                  {index < reasoningPath.length - 1 && (
                    <div className="absolute left-5 top-10 h-6 flex justify-center">
                      <ArrowDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReasoningPath;
