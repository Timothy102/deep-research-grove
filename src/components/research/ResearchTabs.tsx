
import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ResearchOutput from "@/components/research/ResearchOutput";
import SourcesList from "@/components/research/SourcesList";
import ReasoningPath from "@/components/research/ReasoningPath";
import { ReportData } from "@/components/research/ResearchOutput";

interface ResearchTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isLoading: boolean;
  reportData?: ReportData;
  researchOutput: string;
  sources: string[];
  findings: any[];
  reasoningPath: string[];
  sessionId: string;
}

export const ResearchTabs: React.FC<ResearchTabsProps> = ({
  activeTab,
  setActiveTab,
  isLoading,
  reportData,
  researchOutput,
  sources,
  findings,
  reasoningPath,
  sessionId
}) => {
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid grid-cols-3 mb-4">
        <TabsTrigger value="output" disabled={isLoading && !reportData?.sections?.length}>Output</TabsTrigger>
        <TabsTrigger value="sources">
          Sources 
          {sources.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-muted rounded-full">{sources.length}</span>}
        </TabsTrigger>
        <TabsTrigger value="reasoning">
          Reasoning
          {reasoningPath.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-muted rounded-full">{reasoningPath.length}</span>}
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="output" className="space-y-4">
        <ResearchOutput 
          output={researchOutput} 
          isLoading={isLoading && !reportData?.sections?.length}
          reportData={reportData}
          sessionId={sessionId}
          showReport={true}
        />
      </TabsContent>
      
      <TabsContent value="sources" className="space-y-4">
        <SourcesList 
          sources={sources}
          findings={findings}
          isLoading={isLoading} 
        />
      </TabsContent>
      
      <TabsContent value="reasoning" className="space-y-4">
        <ReasoningPath 
          path={reasoningPath}
          isLoading={isLoading}
          reportData={reportData}
          sessionId={sessionId}
        />
      </TabsContent>
    </Tabs>
  );
};
