
import { useCallback } from 'react';
import { toast } from "sonner";
import { saveResearchState, updateResearchState } from "@/services/researchStateService";

interface ResearchStreamProps {
  setIsLoading: (isLoading: boolean) => void;
  setSources: (sources: string[] | ((prev: string[]) => string[])) => void;
  setFindings: (findings: any[] | ((prev: any[]) => any[])) => void;
  setReasoningPath: (reasoningPath: string[] | ((prev: string[]) => string[])) => void;
  setResearchOutput: (researchOutput: string) => void;
  setActiveTab: (activeTab: string) => void;
  setProgressEvents: (progressEvents: string[] | ((prev: string[]) => string[])) => void;
  setCurrentStage: (currentStage: string) => void;
  setRawData: (rawData: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  setReportData: (reportData: any) => void;
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
  setReportData,
  sources,
  findings,
  reasoningPath,
  researchObjective,
  reportData
}: ResearchStreamProps) => {
  const startResearchStream = useCallback(async (
    userModelPayload: any,
    researchId: string,
    query: string,
    modelToUse: string
  ) => {
    setIsLoading(true);
    let eventSource: EventSource | null = null;

    try {
      const sseStreamUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/research/stream`;

      eventSource = new EventSource(sseStreamUrl + `?research_id=${researchId}&model=${modelToUse}`, {
        withCredentials: true,
      });

      eventSource.addEventListener('open', () => {
        console.log(`[${new Date().toISOString()}] SSE stream opened`);
        setIsLoading(true);
        setProgressEvents([]);
        setCurrentStage("Initializing research");
      });

      eventSource.addEventListener('message', async (event) => {
        if (event.data === "[DONE]") {
          console.log(`[${new Date().toISOString()}] SSE stream completed`);
          setIsLoading(false);
          eventSource?.close();
          return;
        }

        try {
          const json = JSON.parse(event.data);

          if (json.type === 'error') {
            console.error(`[${new Date().toISOString()}] Error in SSE stream:`, json.error);
            toast.error(json.error || "An error occurred during research");
            setIsLoading(false);
            eventSource?.close();
            return;
          }

          if (json.type === 'status') {
            console.log(`[${new Date().toISOString()}] Status update:`, json.message);
          }

          if (json.type === 'stage') {
            console.log(`[${new Date().toISOString()}] Stage update:`, json.stage);
            setCurrentStage(json.stage);
          }

          if (json.type === 'progress') {
            console.log(`[${new Date().toISOString()}] Progress event:`, json.event);
            setProgressEvents((prevEvents: string[]) => [...prevEvents, json.event]);
          }

          if (json.type === 'reasoning') {
            console.log(`[${new Date().toISOString()}] Reasoning step:`, json.step);
            setReasoningPath((prevReasoning: string[]) => [...prevReasoning, json.step]);
            await saveResearchState({
              research_id: researchId,
              session_id: userModelPayload.session_id,
              reasoning_path: [...reasoningPath, json.step]
            });
          }

          if (json.type === 'source') {
            console.log(`[${new Date().toISOString()}] New source found:`, json.source);
            setSources((prevSources: string[]) => [...prevSources, json.source]);
            await saveResearchState({
              research_id: researchId,
              session_id: userModelPayload.session_id,
              sources: [...sources, json.source]
            });
          }

          if (json.type === 'finding') {
            console.log(`[${new Date().toISOString()}] New finding found:`, json.finding);
            setFindings((prevFindings: any[]) => [...prevFindings, json.finding]);
            await saveResearchState({
              research_id: researchId,
              session_id: userModelPayload.session_id,
              findings: [...findings, json.finding]
            });
          }

          if (json.type === 'report_data') {
             console.log(`[${new Date().toISOString()}] Report data:`, json.report_data);
             setReportData(json.report_data);
              await saveResearchState({
                research_id: researchId,
                session_id: userModelPayload.session_id,
                report_data: json.report_data
              });
          }

          if (json.type === 'answer') {
            console.log(`[${new Date().toISOString()}] Answer update:`, json.answer);
            setResearchOutput(json.answer);
            await saveResearchState({
              research_id: researchId,
              session_id: userModelPayload.session_id,
              answer: json.answer
            });
            setActiveTab("output");
          }

          if (json.type === 'raw_data') {
            console.log(`[${new Date().toISOString()}] Raw data update:`, json.data);
            setRawData((prevData: Record<string, string>) => ({ ...prevData, ...json.data }));
          }
        } catch (error) {
          console.error(`[${new Date().toISOString()}] Error parsing SSE message:`, error, event.data);
          toast.error("Error processing research stream");
          setIsLoading(false);
          eventSource?.close();
        }
      });

      eventSource.addEventListener('error', (event) => {
        console.error(`[${new Date().toISOString()}] SSE stream error:`, event);
        setIsLoading(false);
        eventSource?.close();
        toast.error("An error occurred during research stream");
      });

      // Send the initial payload to kick off the research
      fetch('/api/research/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_model: userModelPayload,
          research_id: researchId,
          objective: query,
          model: modelToUse
        }),
      }).then(async (response) => {
        if (!response.ok) {
          const errorData = await response.json();
          console.error(`[${new Date().toISOString()}] Initial research request failed:`, errorData);
          toast.error(errorData.error || "Failed to start research");
          setIsLoading(false);
          eventSource?.close();
        } else {
          console.log(`[${new Date().toISOString()}] Initial research request succeeded`);
        }
      }).catch(error => {
        console.error(`[${new Date().toISOString()}] Error sending initial research request:`, error);
        toast.error("Failed to start research");
        setIsLoading(false);
        eventSource?.close();
      });
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error setting up SSE stream:`, error);
      toast.error("Failed to set up research stream");
      setIsLoading(false);
      eventSource?.close();
    }

    return eventSource;
  }, [setIsLoading, setSources, setFindings, setReasoningPath, setResearchOutput, setActiveTab, setProgressEvents, setCurrentStage, setRawData, setReportData, sources, findings, reasoningPath, researchObjective]);

  return { startResearchStream };
};
