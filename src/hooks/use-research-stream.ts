
import { useCallback, useRef } from 'react';
import { updateResearchState } from "@/services/researchStateService";
import { useToast } from "@/hooks/use-toast";
import { HumanApprovalRequest } from "@/hooks/use-human-approval";

interface UseResearchStreamProps {
  setIsLoading: (loading: boolean) => void;
  setSources: (sources: string[]) => void;
  setFindings: (findings: any[]) => void;
  setReasoningPath: (path: string[]) => void;
  setResearchOutput: (output: string) => void;
  setActiveTab: (tab: string) => void;
  setProgressEvents: (events: string[]) => void;
  setCurrentStage: (stage: string) => void;
  setRawData: (data: Record<string, string>) => void;
  setHumanApprovalRequest: (request: HumanApprovalRequest | null) => void;
  setReportData: (data: any) => void;
  sources: string[];
  findings: any[];
  reasoningPath: string[];
  researchObjective: string;
  reportData: any;
}

export const useResearchStream = ({
  setIsLoading,
  setSources,
  setFindings,
  setReasoningPath,
  setResearchOutput,
  setActiveTab,
  setProgressEvents,
  setCurrentStage,
  setRawData,
  setHumanApprovalRequest,
  setReportData,
  sources,
  findings,
  reasoningPath,
  researchObjective,
  reportData
}: UseResearchStreamProps) => {
  const initialEventReceivedRef = useRef<boolean>(false);
  const { toast: uiToast } = useToast();

  const startResearchStream = useCallback((
    userModelData: any, 
    researchId: string, 
    query: string, 
    modelToUse: string = 'claude-3.5-sonnet'
  ) => {
    const clientId = userModelData.client_id;
    const sessionId = userModelData.session_id;
    
    const streamUrl = `https://timothy102--vertical-deep-research-stream-research.modal.run`;
    
    console.log(`[${new Date().toISOString()}] 🔄 Setting up POST connection to research stream`);
    
    const requestBody = {
      research_objective: query,
      user_model: userModelData,
      model: modelToUse,
      session_id: sessionId,
      research_id: researchId,
      user_id: userModelData.user_id || 'anonymous',
      client_id: clientId
    };
    
    fetch(streamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body reader could not be created');
      }
      
      console.log(`[${new Date().toISOString()}] 🔄 Connection established to research stream (POST)`);
      
      const processStreamChunks = async () => {
        let partialData = '';
        
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log(`[${new Date().toISOString()}] 🔄 Stream completed`);
            setIsLoading(false);
            break;
          }
          
          const chunk = new TextDecoder().decode(value);
          const lines = (partialData + chunk).split('\n');
          partialData = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.substring(6));
                processEventData(data, userModelData, researchId, clientId, sessionId);
              } catch (e) {
                console.error(`[${new Date().toISOString()}] ❌ Error parsing event data:`, e);
              }
            }
          }
        }
      };
      
      processStreamChunks().catch(error => {
        console.error(`[${new Date().toISOString()}] ❌ Error processing stream:`, error);
        uiToast({
          title: "connection error",
          description: "lost connection to research service",
          variant: "destructive",
        });
        setIsLoading(false);
      });
    })
    .catch(error => {
      console.error(`[${new Date().toISOString()}] ❌ Fetch error:`, error);
      uiToast({
        title: "connection error",
        description: "failed to connect to research service. Please try again later.",
        variant: "destructive",
      });
      setIsLoading(false);
    });
  }, [uiToast, setIsLoading]);

  const processEventData = useCallback((
    data: any, 
    userModelData: any, 
    researchId: string,
    clientId: string,
    sessionId: string | null
  ) => {
    if (!initialEventReceivedRef.current) {
      initialEventReceivedRef.current = true;
      console.log(`[${new Date().toISOString()}] 🎬 First event received, research is active`);
    }
    
    const eventClientId = data.client_id || userModelData.client_id;
    const eventSessionId = data.session_id || sessionId;
    const eventResearchId = data.research_id || researchId;
    
    if (eventClientId !== clientId) {
      console.warn(`[${new Date().toISOString()}] 🚫 Rejected event for different client:`, { 
        eventClientId: eventClientId?.substring(0, 15), 
        currentClientId: clientId.substring(0, 15),
        eventType: data.event || data.type
      });
      return;
    }
    
    if (eventSessionId !== sessionId || 
        eventResearchId !== researchId) {
      console.warn(`[${new Date().toISOString()}] 🚫 Rejected event for different session/research:`, { 
        eventSessionId,
        currentSessionId: sessionId,
        eventResearchId,
        currentResearchId: researchId,
        eventType: data.event || data.type
      });
      return;
    }
    
    const eventType = data.event || data.type;
    console.log(`[${new Date().toISOString()}] 📊 Processing event:`, { 
      type: eventType, 
      clientId: clientId.substring(0, 15)
    });
    
    const timestamp = new Date().toLocaleTimeString();
    if (data.data && data.data.message) {
      const progressEvent = `${timestamp}: ${data.data.message}`;
      setProgressEvents((prev: string[]) => [...prev.slice(-4), progressEvent]);
    }
    
    if (data.data && data.data.node_id) {
      const nodeId = data.data.node_id;
      const rawEventData = JSON.stringify(data, null, 2);
      
      setRawData((prevData: Record<string, string>) => {
        const existing = prevData[nodeId] || '';
        return {
          ...prevData,
          [nodeId]: existing ? `${existing}\n${rawEventData}` : rawEventData
        };
      });
    }
    
    switch (eventType) {
      case "start":
        console.log("Research started");
        setActiveTab("reasoning");
        setCurrentStage("Starting research");
        
        window.dispatchEvent(new CustomEvent('research_state_update', { 
          detail: { 
            payload: {
              new: {
                session_id: sessionId,
                reasoning_path: reasoningPath,
                status: 'in_progress'
              }
            },
            timestamp: new Date().toISOString()
          }
        }));
        break;
      case "update":
        const message = data.data.message || "";
        setResearchOutput((prevOutput: string) => prevOutput + message + "\n");
        setCurrentStage("Generating answer");
        
        if (sessionId) {
          updateResearchState(researchId, sessionId, {
            answer: data.data.answer || ""
          }).catch(err => console.error("Error updating research state:", err));
        }
        break;
      case "source":
        const source = data.data.source || "";
        setSources((prevSources: string[]) => [...prevSources, source]);
        setCurrentStage("Finding sources");
        
        if (sessionId) {
          updateResearchState(researchId, sessionId, {
            sources: [...sources, source]
          }).catch(err => console.error("Error updating sources:", err));
        }
        break;
      case "finding":
        const finding: any = { 
          source: data.data.source || "",
          content: data.data.content || undefined,
          node_id: data.data.node_id || undefined,
          query: data.data.query || undefined,
          finding: data.data.finding || undefined
        };
        
        console.log(`[${new Date().toISOString()}] 📑 Received finding:`, finding);
        
        setFindings((prevFindings: any[]) => [...prevFindings, finding]);
        
        if (sessionId) {
          const updatedFindings = [...findings, finding];
          updateResearchState(researchId, sessionId, {
            findings: updatedFindings
          }).catch(err => console.error("Error updating findings:", err));
        }
        break;
      case "reasoning":
        const step = data.data.step || "";
        setCurrentStage("Analyzing information");
        
        if (step.toLowerCase().includes("planning")) {
          setCurrentStage("Planning research approach");
        } else if (step.toLowerCase().includes("search")) {
          setCurrentStage("Searching for information");
        } else if (step.toLowerCase().includes("read")) {
          setCurrentStage("Reading sources");
        } else if (step.toLowerCase().includes("synthe")) {
          setCurrentStage("Synthesizing information");
        }
        
        const nodeIdMatch = step.match(/Node ID:?\s*([a-zA-Z0-9_-]+)/i) || 
                          step.match(/node\s+(\d+)|#(\d+)/i);
        if (nodeIdMatch) {
          const nodeId = nodeIdMatch[1] || nodeIdMatch[2];
          const rawDataString = JSON.stringify(data, null, 2);
          
          setRawData((prevData: Record<string, string>) => {
            const existing = prevData[nodeId] || '';
            return {
              ...prevData,
              [nodeId]: existing ? `${existing}\n${rawDataString}` : rawDataString
            };
          });
        }
        
        if (step.toLowerCase().includes("synthesizing") && reasoningPath.length > 0 && reasoningPath.length % 5 === 0) {
          const syntheticRequest = {
            call_id: `synthetic-${researchId}-${reasoningPath.length}`,
            node_id: `${reasoningPath.length}`,
            query: researchObjective,
            content: `This is a synthetic approval request at step ${reasoningPath.length}. This would normally contain synthesized content based on the research so far.`,
            approval_type: "synthesis"
          };
          setHumanApprovalRequest(syntheticRequest);
        }
        
        setReasoningPath((prevPath: string[]) => [...prevPath, step]);
        
        setActiveTab("reasoning");
        
        if (sessionId) {
          const updatedPath = [...reasoningPath, step];
          updateResearchState(researchId, sessionId, {
            reasoning_path: updatedPath
          }).catch(err => console.error("Error updating reasoning path:", err));
        }
        break;
      case "report_update":
        console.log(`[${new Date().toISOString()}] 📄 Received report update:`, data.data);
        
        const reportUpdate: any = {
          node_id: data.data.node_id || '',
          synthesis: data.data.synthesis || '',
          confidence: data.data.confidence,
          timestamp: data.data.timestamp,
          query: data.data.query
        };
        
        setReportData((prevReportData: any) => {
          const existingData = prevReportData || { sections: [] };
          
          const sectionIndex = existingData.sections.findIndex(
            (s: any) => s.node_id === reportUpdate.node_id
          );
          
          let updatedSections;
          if (sectionIndex >= 0) {
            updatedSections = [...existingData.sections];
            updatedSections[sectionIndex] = {
              ...updatedSections[sectionIndex],
              ...reportUpdate
            };
          } else {
            updatedSections = [...existingData.sections, reportUpdate];
          }
          
          return {
            ...existingData,
            sections: updatedSections
          };
        });
        
        if (sessionId) {
          updateResearchState(researchId, sessionId, {
            report_data: reportData
          }).catch(err => console.error("Error updating report data:", err));
        }
        
        setCurrentStage("Updating research report");
        break;
      case "final_report":
        console.log(`[${new Date().toISOString()}] 📝 Received final report:`, data.data);
        
        setReportData((prevReportData: any) => {
          const existingData = prevReportData || { sections: [] };
          
          const rootSection = {
            node_id: 'root',
            synthesis: data.data.synthesis || '',
            confidence: data.data.confidence,
            query: data.data.query,
            is_root: true
          };
          
          const rootIndex = existingData.sections.findIndex((s: any) => s.is_root);
          
          let updatedSections;
          if (rootIndex >= 0) {
            updatedSections = [...existingData.sections];
            updatedSections[rootIndex] = {
              ...updatedSections[rootIndex],
              ...rootSection
            };
          } else {
            updatedSections = [rootSection, ...existingData.sections];
          }
          
          return {
            sections: updatedSections,
            finalSynthesis: data.data.synthesis,
            confidence: data.data.confidence,
            sources: data.data.sources || [],
            findings: data.data.findings || []
          };
        });
        
        if (sessionId) {
          updateResearchState(researchId, sessionId, {
            report_data: reportData,
            answer: data.data.synthesis || ''
          }).catch(err => console.error("Error updating final report:", err));
        }
        
        setResearchOutput(data.data.synthesis || '');
        setCurrentStage("Finalizing research report");
        break;
      case "complete":
        const finalAnswer = data.data.answer || "";
        const finalSources = data.data.sources || [];
        const finalFindings = data.data.findings || [];
        const finalReasoningPath = data.data.reasoning_path || [];
        
        setResearchOutput(finalAnswer);
        setSources(finalSources);
        setFindings(finalFindings);
        setReasoningPath(finalReasoningPath);
        setIsLoading(false);
        
        if (sessionId) {
          updateResearchState(researchId, sessionId, {
            status: 'completed',
            answer: finalAnswer,
            sources: finalSources,
            findings: finalFindings,
            reasoning_path: finalReasoningPath,
            report_data: reportData
          }).catch(err => console.error("Error updating final state:", err));
        }
        
        setActiveTab("output");
        break;
      case "error":
        uiToast({
          title: "research error",
          description: data.data.error || "Unknown error",
          variant: "destructive",
        });
        setIsLoading(false);
        break;
    }
  }, [
    findings, reasoningPath, sources, researchObjective, reportData, 
    setProgressEvents, setRawData, setActiveTab, setCurrentStage, 
    setReasoningPath, setResearchOutput, setSources, setFindings, 
    setHumanApprovalRequest, setReportData, setIsLoading, uiToast
  ]);

  return { startResearchStream };
};
