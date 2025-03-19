
import { useState, useEffect, useMemo, useCallback } from "react";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  NodeTypes,
  EdgeTypes,
  NodeProps,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  Check, 
  Search, 
  Zap, 
  Brain, 
  AlertCircle, 
  Clock, 
  Loader2, 
  ChevronDown, 
  ChevronRight,
  FileText
} from "lucide-react";

type NodeData = {
  query: string;
  status: string;
  nodeType: string;
  confidenceScore?: number;
  depth: number;
  findings?: Array<{
    content: string;
    sourceUrl?: string;
    confidenceScore?: number;
    title?: string;
  }>;
  synthesisResult?: string;
  isExpanded?: boolean;
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "complete":
      return <Check className="h-4 w-4 text-green-500" />;
    case "searching":
      return <Search className="h-4 w-4 text-blue-500 animate-pulse" />;
    case "planning":
      return <Brain className="h-4 w-4 text-purple-500 animate-pulse" />;
    case "analyzing":
      return <Zap className="h-4 w-4 text-yellow-500 animate-pulse" />;
    case "synthesizing":
      return <Loader2 className="h-4 w-4 text-orange-500 animate-spin" />;
    case "awaiting_children":
      return <Clock className="h-4 w-4 text-gray-500" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-500" />;
  }
};

const getNodeTypeColor = (nodeType: string) => {
  switch (nodeType) {
    case "search":
      return "border-blue-400 bg-blue-50 dark:bg-blue-950";
    case "research":
      return "border-purple-400 bg-purple-50 dark:bg-purple-950";
    case "reasoning":
      return "border-amber-400 bg-amber-50 dark:bg-amber-950";
    default:
      return "border-gray-400 bg-gray-50 dark:bg-gray-900";
  }
};

const ResearchNode = ({ data, isConnectable }: NodeProps<NodeData>) => {
  const [expanded, setExpanded] = useState(data.isExpanded || false);
  
  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  return (
    <div 
      className={cn(
        "p-3 rounded-lg border-2 shadow-sm min-w-[200px] max-w-[300px]",
        getNodeTypeColor(data.nodeType)
      )}
    >
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
      
      <div className="flex justify-between items-start mb-2">
        <Badge variant="outline" className="flex items-center gap-1 text-xs">
          {getStatusIcon(data.status)}
          {data.status}
        </Badge>
        <Badge variant="secondary" className="text-xs">
          {data.nodeType}
        </Badge>
      </div>
      
      <div className="text-sm font-medium mb-2">{data.query}</div>
      
      {data.confidenceScore !== undefined && (
        <div className="text-xs mb-2">
          Confidence: {Math.round(data.confidenceScore * 100)}%
        </div>
      )}
      
      {data.synthesisResult && (
        <div className="text-xs mb-2 p-2 bg-background rounded border">
          <div className="font-medium mb-1">Synthesis:</div>
          <div className="text-muted-foreground">{data.synthesisResult}</div>
        </div>
      )}
      
      {data.findings && data.findings.length > 0 && (
        <div className="mt-2">
          <button 
            onClick={toggleExpand}
            className="flex items-center text-xs font-medium text-primary"
          >
            {expanded ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
            Findings ({data.findings.length})
          </button>
          
          {expanded && (
            <div className="mt-2 space-y-2">
              {data.findings.map((finding, idx) => (
                <div key={idx} className="text-xs p-2 bg-background rounded border">
                  {finding.title && <div className="font-medium">{finding.title}</div>}
                  <div className="text-muted-foreground line-clamp-3">{finding.content}</div>
                  {finding.sourceUrl && (
                    <a 
                      href={finding.sourceUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary text-xs flex items-center mt-1"
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      Source
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} />
    </div>
  );
};

export const NodeExplorationGraph = ({ researchEvents }: { researchEvents: any[] }) => {
  const nodeTypes = useMemo(() => ({ 
    researchNode: ResearchNode,
  }), []);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const processEvents = useCallback((events: any[]) => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    const nodeMap = new Map();

    events.forEach(event => {
      if (event.event === "node_created" && event.data?.node_details) {
        const { node_details } = event.data;
        
        // Skip if we already processed this node
        if (nodeMap.has(node_details.id)) return;
        
        const nodeData: NodeData = {
          query: node_details.query,
          status: node_details.status,
          nodeType: node_details.node_type,
          confidenceScore: node_details.confidence_score,
          depth: node_details.depth,
          findings: [],
          synthesisResult: node_details.synthesis_result,
          isExpanded: false,
        };
        
        // Calculate position based on depth and some randomness for the same depth
        const xPos = node_details.depth * 300 + (Math.random() * 100 - 50);
        const yPos = nodeMap.size * 200 + (Math.random() * 100 - 50);
        
        const newNode: Node = {
          id: node_details.id,
          data: nodeData,
          position: { x: xPos, y: yPos },
          type: 'researchNode',
        };
        
        newNodes.push(newNode);
        nodeMap.set(node_details.id, newNode);
        
        // Add edge from parent to this node
        if (node_details.parent_id && node_details.parent_id !== "0") {
          newEdges.push({
            id: `e-${node_details.parent_id}-${node_details.id}`,
            source: node_details.parent_id,
            target: node_details.id,
            type: 'default',
            markerEnd: {
              type: MarkerType.ArrowClosed,
            },
          });
        }
      }
      else if (event.event === "node_updated" && event.data?.node_details) {
        const { node_details } = event.data;
        const existingNode = nodeMap.get(node_details.id);
        
        if (existingNode) {
          // Update the node data
          existingNode.data = {
            ...existingNode.data,
            status: node_details.status,
            confidenceScore: node_details.confidence_score,
            synthesisResult: node_details.synthesis_result,
          };
        }
      }
      else if (event.event === "finding_added" && event.data?.node_id && event.data?.finding) {
        const existingNode = nodeMap.get(event.data.node_id);
        if (existingNode) {
          if (!existingNode.data.findings) {
            existingNode.data.findings = [];
          }
          
          existingNode.data.findings.push({
            content: event.data.finding.content,
            sourceUrl: event.data.finding.source_url,
            confidenceScore: event.data.finding.confidence_score,
            title: event.data.finding.title,
          });
        }
      }
    });
    
    return { nodes: Array.from(nodeMap.values()), edges: newEdges };
  }, []);

  useEffect(() => {
    if (researchEvents && researchEvents.length > 0) {
      const { nodes: newNodes, edges: newEdges } = processEvents(researchEvents);
      setNodes(newNodes);
      setEdges(newEdges);
    }
  }, [researchEvents, processEvents, setNodes, setEdges]);

  return (
    <div className="h-full w-full border rounded-md">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
};
