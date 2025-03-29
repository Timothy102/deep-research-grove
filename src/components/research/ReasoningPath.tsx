
import React, { useState } from 'react';
import { Loader2, ExternalLink } from 'lucide-react';
import { Finding } from '@/types/researchTypes';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ReasoningPathProps {
  reasoningPath: string[];
  sources: string[];
  findings: Finding[];
  isActive: boolean;
  isLoading: boolean;
  rawData?: Record<string, string>;
  sessionId: string;
}

const ReasoningPath: React.FC<ReasoningPathProps> = ({
  reasoningPath,
  sources,
  findings,
  isActive,
  isLoading,
  rawData,
  sessionId
}) => {
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);

  const handleStepClick = (index: number) => {
    setSelectedStepIndex(index);
  };

  const ReasoningStep = ({ step, stepNumber, onClick, isSelected, sources, sourceFindings, rawData, sessionId }: {
    step: string;
    stepNumber: number;
    onClick?: () => void;
    isSelected: boolean;
    sources: string[];
    sourceFindings: Finding[];
    rawData?: string;
    sessionId: string;
  }) => {
    const hasFindings = sourceFindings && sourceFindings.length > 0;
    const hasRawData = rawData && rawData.length > 0;

    return (
      <div
        className={`p-4 border rounded-lg cursor-pointer transition-colors duration-200 ${isSelected ? 'bg-blue-50 border-blue-300' : 'border-gray-200 hover:bg-gray-50'}`}
        onClick={onClick}
      >
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-semibold text-gray-800">Step {stepNumber}</h3>
          {onClick && (
            <Badge variant="outline">Click to view details</Badge>
          )}
        </div>
        <p className="text-gray-700 mt-2">{step}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          {hasFindings && (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-700">
              Findings: {sourceFindings.length}
            </Badge>
          )}
          {hasRawData && (
            <Badge className="bg-violet-100 text-violet-700 border-violet-700">
              Raw Data Available
            </Badge>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 min-h-[400px] bg-white border-t border-gray-200">
      {reasoningPath.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-80">
          <p className="text-gray-500">No reasoning data available</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reasoningPath.map((step, index) => (
            <ReasoningStep 
              key={index} 
              step={step}
              stepNumber={index + 1}
              onClick={index < reasoningPath.length - 1 ? () => handleStepClick(index) : undefined}
              isSelected={selectedStepIndex === index}
              sources={sources}
              sourceFindings={findings.filter(f => f.node_id === `${index + 1}`)}
              rawData={rawData?.[`${index + 1}`]}
              sessionId={sessionId}
            />
          ))}
          
          {isLoading && (
            <div className="flex items-center p-4 border border-gray-200 bg-gray-50 rounded-lg">
              <div className="animate-pulse flex space-x-2">
                <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
              </div>
              <span className="ml-3 text-gray-600">Thinking...</span>
            </div>
          )}
        </div>
      )}
      
      {/* Modal for viewing step details */}
      {selectedStepIndex !== null && selectedStepIndex < reasoningPath.length && (
        <Dialog open={selectedStepIndex !== null} onOpenChange={() => setSelectedStepIndex(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Step {selectedStepIndex + 1} Details</DialogTitle>
              <DialogDescription>
                Detailed information and sources for this step in the reasoning process.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <h4 className="text-lg font-semibold text-gray-800 mb-2">Reasoning Step</h4>
              <p className="text-gray-700">{reasoningPath[selectedStepIndex]}</p>
            </div>

            {rawData?.[`${selectedStepIndex + 1}`] && (
              <div className="py-4">
                <h4 className="text-lg font-semibold text-gray-800 mb-2">Raw Data</h4>
                <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                  <pre className="whitespace-pre-wrap break-words text-sm text-gray-600">
                    {rawData[`${selectedStepIndex + 1}`]}
                  </pre>
                </ScrollArea>
              </div>
            )}

            {findings.filter(f => f.node_id === `${selectedStepIndex + 1}`).length > 0 && (
              <div className="py-4">
                <h4 className="text-lg font-semibold text-gray-800 mb-2">Findings</h4>
                <ul className="list-disc pl-5 text-gray-700">
                  {findings
                    .filter(f => f.node_id === `${selectedStepIndex + 1}`)
                    .map((finding, index) => (
                      <li key={index}>{finding.text || finding.content}</li>
                    ))}
                </ul>
              </div>
            )}

            {sources.length > 0 && (
              <div className="py-4">
                <h4 className="text-lg font-semibold text-gray-800 mb-2">Sources</h4>
                <ul className="space-y-2">
                  {sources.map((source, index) => (
                    <li key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <span className="text-blue-600 break-all">{source}</span>
                      {source.startsWith('http') && (
                        <a href={source} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 ml-2">
                          <ExternalLink size={16} />
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ReasoningPath;
