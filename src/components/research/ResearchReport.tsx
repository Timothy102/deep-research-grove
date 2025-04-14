
import { useState, useEffect } from "react";
import { ReportBuildupDialog, ReportSynthesis, FinalReport } from "./ReportBuildupDialog";
import { toast } from "sonner";

type ResearchReportProps = {
  isOpen: boolean;
  onClose: () => void;
  syntheses: ReportSynthesis[];
  finalReport: FinalReport | null;
  isComplete: boolean;
  sessionId: string | null;
};

const ResearchReport = ({
  isOpen,
  onClose,
  syntheses,
  finalReport,
  isComplete,
  sessionId
}: ResearchReportProps) => {
  // We use sessionId to avoid reopening the dialog when switching sessions
  const [lastSessionId, setLastSessionId] = useState<string | null>(null);
  const [hasShownToast, setHasShownToast] = useState<boolean>(false);
  
  useEffect(() => {
    if (sessionId && sessionId !== lastSessionId) {
      setLastSessionId(sessionId);
      setHasShownToast(false);
    }
  }, [sessionId, lastSessionId]);
  
  useEffect(() => {
    if (isComplete && finalReport && sessionId === lastSessionId && !hasShownToast) {
      toast.success("Research report is ready", {
        description: "Your complete research report is now available"
      });
      setHasShownToast(true);
    }
  }, [isComplete, finalReport, sessionId, lastSessionId, hasShownToast]);

  // Add an effect to listen for report update events directly
  useEffect(() => {
    const handleReportUpdate = (event: CustomEvent) => {
      if (!event.detail || !event.detail.payload) return;
      
      console.log(`[${new Date().toISOString()}] 📝 Report update event received in ResearchReport:`, event.detail);
    };
    
    window.addEventListener('research_report_update', handleReportUpdate as EventListener);
    
    return () => {
      window.removeEventListener('research_report_update', handleReportUpdate as EventListener);
    };
  }, []);

  // Only render the dialog if explicitly requested to open
  if (!isOpen) {
    return null;
  }

  return (
    <ReportBuildupDialog
      isOpen={isOpen}
      onClose={onClose}
      syntheses={syntheses}
      finalReport={finalReport}
      isComplete={isComplete}
    />
  );
};

export default ResearchReport;
