
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
  sources = [],
  findings = [],
  reasoningPath = [],
  sessionId
}) => {
  // Add multiple safety checks to prevent undefined.map errors
  const hasReportSections = reportData && reportData.sections && Array.isArray(reportData.sections);
  const safeSources = Array.isArray(sources) ? sources : [];
  const safeFindings = Array.isArray(findings) ? findings : [];
  const safeReasoningPath = Array.isArray(reasoningPath) ? reasoningPath : [];

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid grid-cols-3 mb-4">
        <TabsTrigger value="output" disabled={isLoading && !(hasReportSections && reportData.sections.length > 0)}>Output</TabsTrigger>
        <TabsTrigger value="sources">
          Sources 
          {safeSources.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-muted rounded-full">{safeSources.length}</span>}
        </TabsTrigger>
        <TabsTrigger value="reasoning">
          Reasoning
          {safeReasoningPath.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-muted rounded-full">{safeReasoningPath.length}</span>}
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="output" className="space-y-4">
        <ResearchOutput 
          output={researchOutput} 
          isLoading={isLoading && !(hasReportSections && reportData?.sections?.length > 0)}
          reportData={reportData}
          sessionId={sessionId}
          showReport={true}
        />
      </TabsContent>
      
      <TabsContent value="sources" className="space-y-4">
        <SourcesList 
          sources={safeSources}
          findings={safeFindings}
          isLoading={isLoading} 
        />
      </TabsContent>
      
      <TabsContent value="reasoning" className="space-y-4">
        <ReasoningPath 
          path={safeReasoningPath}
          isLoading={isLoading}
          reportData={reportData}
          sessionId={sessionId}
        />
      </TabsContent>
    </Tabs>
  );
};
