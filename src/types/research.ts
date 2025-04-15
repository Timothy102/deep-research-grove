
export type Finding = {
  title?: string;
  summary?: string;
  confidence_score?: number;
  url?: string;
  timestamp?: string;
  node_type?: string;
  depth?: number;
};

export type ReportSynthesis = {
  synthesis: string;
  confidence: number;
  timestamp: string;
  node_id: string;
  query: string;
};

export type FinalReport = {
  query: string;
  synthesis: string;
  confidence: number;
  reasoning_path: string[];
  findings: Finding[];
  sources: string[];
  timestamp: string;
};

export type ResearchNode = {
  id: string;
  query: string;
  status: string;
  depth: number;
  node_type: string;
  children: string[];
  parent_id: string | null;
};
