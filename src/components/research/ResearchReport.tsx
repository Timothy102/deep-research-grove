
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
  
  useEffect(() => {
    if (sessionId && sessionId !== lastSessionId) {
      setLastSessionId(sessionId);
    }
  }, [sessionId, lastSessionId]);
  
  useEffect(() => {
    if (isComplete && finalReport && sessionId === lastSessionId) {
      toast.success("Research report is ready", {
        description: "Your complete research report is now available",
        action: {
          label: "View",
          onClick: () => {}
        }
      });
    }
  }, [isComplete, finalReport, sessionId, lastSessionId]);

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
