
import { useState, useRef, useCallback } from 'react';
import { getResearchState } from "@/services/researchStateService";
import { toast } from "sonner";

export const useResearchState = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [researchOutput, setResearchOutput] = useState("");
  const [sources, setSources] = useState<string[]>([]);
  const [findings, setFindings] = useState<any[]>([]);
  const [reasoningPath, setReasoningPath] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("reasoning");
  const [researchObjective, setResearchObjective] = useState("");
  const [researchDepth, setResearchDepth] = useState("");
  const [userContext, setUserContext] = useState("");
  const [selectedCognitiveStyle, setSelectedCognitiveStyle] = useState("");
  const [selectedLLM, setSelectedLLM] = useState("auto");
  const [rawData, setRawData] = useState<Record<string, string>>({});
  const [userModels, setUserModels] = useState<any[]>([]);
  const [progressEvents, setProgressEvents] = useState<string[]>([]);
  const [currentStage, setCurrentStage] = useState("Initializing research");
  const [reportData, setReportData] = useState<any | undefined>(undefined);

  // Reset research state
  const resetResearchState = useCallback(() => {
    console.log(`[${new Date().toISOString()}] 🔄 Resetting research state completely`);
    
    setResearchOutput("");
    setSources([]);
    setFindings([]);
    setReasoningPath([]);
    setActiveTab("reasoning");
    setResearchObjective("");
    setResearchDepth("");
    setUserContext("");
    setSelectedCognitiveStyle("");
    setProgressEvents([]);
    setCurrentStage("Initializing research");
    setReportData(undefined);
    
    localStorage.removeItem('CURRENT_STATE');
    localStorage.removeItem('CURRENT_RESEARCH_ID');
  }, []);

  // Poll research state
  const pollResearchState = useCallback((
    researchId: string, 
    interval: number = 5000, 
    maxAttempts: number = 20, 
    currentAttempt: number = 0
  ) => {
    console.log(`[${new Date().toISOString()}] 🔄 Starting polling for research state:`, researchId);
    
    const sessionId = localStorage.getItem('CURRENT_SESSION_ID');
    
    const checkInterval = setInterval(async () => {
      if (!sessionId || currentAttempt >= maxAttempts) {
        clearInterval(checkInterval);
        return;
      }
      
      try {
        const state = await getResearchState(researchId, sessionId);
        
        if (state) {
          console.log(`[${new Date().toISOString()}] 📊 Polled state update:`, {
            status: state.status,
            hasAnswer: !!state.answer,
            sourceCount: state.sources?.length || 0,
            findingsCount: state.findings?.length || 0
          });
          
          if (state.status === 'completed') {
            console.log(`[${new Date().toISOString()}] ✅ Research completed according to polled state`);
            setIsLoading(false);
            clearInterval(checkInterval);
            
            // Update UI with final state
            if (state.answer) setResearchOutput(state.answer);
            if (state.sources) setSources(state.sources);
            if (state.findings) setFindings(state.findings);
            if (state.reasoning_path) setReasoningPath(state.reasoning_path);
            if (state.report_data) setReportData(state.report_data);
            
            setActiveTab("output");
          } else if (state.status === 'error') {
            console.error(`[${new Date().toISOString()}] ❌ Research error according to polled state:`, state.error);
            setIsLoading(false);
            clearInterval(checkInterval);
            
            if (state.error) {
              toast.error(state.error);
            } else {
              toast.error("An error occurred during research");
            }
            
            if (researchId && sessionId) {
              pollResearchState(researchId, 5000, 20, 0);
            }
          }
        }
      } catch (err) {
        console.error("Error polling research state:", err);
      }
      
      // Increment the attempt counter
      currentAttempt++;
    }, interval);
    
    return checkInterval;
  }, []);

  return {
    isLoading, setIsLoading,
    researchOutput, setResearchOutput,
    sources, setSources,
    findings, setFindings,
    reasoningPath, setReasoningPath,
    activeTab, setActiveTab,
    researchObjective, setResearchObjective,
    researchDepth, setResearchDepth,
    userContext, setUserContext,
    selectedCognitiveStyle, setSelectedCognitiveStyle,
    selectedLLM, setSelectedLLM,
    rawData, setRawData,
    userModels, setUserModels,
    progressEvents, setProgressEvents,
    currentStage, setCurrentStage,
    reportData, setReportData,
    resetResearchState,
    pollResearchState
  };
};
