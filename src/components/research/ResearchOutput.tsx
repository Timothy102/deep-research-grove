
import { useEffect, useState } from "react";
import { Separator } from "@/components/ui/separator";
import ReasoningPath from "./ReasoningPath";
import ResearchResults, { ResearchResult } from "./ResearchResults";
import { AlertTriangle, Check, Pause, Clock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LOCAL_STORAGE_KEYS, getSessionStorageKey } from "@/lib/constants";

interface ResearchOutputProps {
  loading: boolean;
  completed: boolean;
  paused: boolean;
  result: ResearchResult | null;
  error: string | null;
  reasoningPath: string[];
  sources: string[];
  findings: any[];
  rawData: Record<string, string>;
  sessionId?: string;
  userName?: string;
  userModels?: any[];
  onSelectModel?: (modelId: string) => Promise<void>;
}

const ResearchOutput = ({
  loading,
  completed,
  paused,
  result,
  error,
  reasoningPath,
  sources,
  findings,
  rawData,
  sessionId,
  userName,
  userModels,
  onSelectModel
}: ResearchOutputProps) => {
  const [reportData, setReportData] = useState<any>(null);
  
  useEffect(() => {
    if (sessionId) {
      // Try to load final report from session storage
      try {
        const sessionReportKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.FINAL_REPORT_CACHE, sessionId);
        const cachedReport = localStorage.getItem(sessionReportKey);
        
        if (cachedReport) {
          const parsedReport = JSON.parse(cachedReport);
          console.log(`[${new Date().toISOString()}] 📂 Loaded final report from cache for session ${sessionId}`);
          setReportData({
            ...parsedReport,
            isFinal: true
          });
        }
      } catch (e) {
        console.error("Error loading final report from cache:", e);
      }
    }
  }, [sessionId]);
  
  const handleReportUpdate = (data: any) => {
    console.log(`[${new Date().toISOString()}] 📊 Report update received:`, data);
    setReportData(data);
    
    if (data.isFinal && sessionId) {
      try {
        const sessionReportKey = getSessionStorageKey(LOCAL_STORAGE_KEYS.FINAL_REPORT_CACHE, sessionId);
        localStorage.setItem(sessionReportKey, JSON.stringify(data));
      } catch (e) {
        console.error("Error caching final report:", e);
      }
    }
  };

  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // Empty initial state styling - make sure it's not dark
  if (!loading && !completed && !paused && !reasoningPath.length && !sources.length && !result) {
    return (
      <div className="relative bg-background min-h-[400px] rounded-lg border border-border p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
          <div className="flex items-center justify-center border-r border-border">
            <p className="text-muted-foreground">Reasoning process will appear here...</p>
          </div>
          <div className="flex items-center justify-center">
            <p className="text-muted-foreground">No research results yet. Start a query to see results here.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-background">
      {paused && (
        <Alert className="my-4 border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-300">
          <Pause className="h-4 w-4" />
          <AlertTitle>Research Paused</AlertTitle>
          <AlertDescription>
            The research process is currently paused. You can resume it at any time.
          </AlertDescription>
        </Alert>
      )}
      
      {completed && (
        <Alert variant="default" className="my-4 border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
          <Check className="h-4 w-4" />
          <AlertTitle>Research Completed</AlertTitle>
          <AlertDescription>
            The research has been completed successfully.
          </AlertDescription>
        </Alert>
      )}
      
      {!completed && loading && !paused && (
        <Alert variant="default" className="my-4 border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
          <Clock className="h-4 w-4 animate-pulse" />
          <AlertTitle>Research In Progress</AlertTitle>
          <AlertDescription>
            The research is in progress. This may take a few minutes...
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:border-r lg:pr-6">
          <ReasoningPath
            reasoningPath={reasoningPath}
            sources={sources}
            findings={findings}
            isActive={loading && !paused}
            isLoading={loading}
            rawData={rawData}
            sessionId={sessionId}
            onReportUpdate={handleReportUpdate}
          />
        </div>
        <div className="lg:pl-6">
          <ResearchResults 
            result={result} 
            reportData={reportData}
            userName={userName}
            userModels={userModels}
            onSelectModel={onSelectModel}
          />
        </div>
      </div>
    </div>
  );
};

export default ResearchOutput;
