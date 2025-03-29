
import React from 'react';
import { Loader2 } from 'lucide-react';

interface ResearchOutputProps {
  output: string;
  isLoading: boolean;
}

const ResearchOutput: React.FC<ResearchOutputProps> = ({ output, isLoading }) => {
  return (
    <div className="p-6 min-h-[400px] bg-white">
      {isLoading && !output ? (
        <div className="flex flex-col items-center justify-center h-80">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-4" />
          <p className="text-gray-600">Generating research output...</p>
        </div>
      ) : output ? (
        <div className="prose prose-blue max-w-none text-gray-800">
          {output.split('\n').map((paragraph, idx) => (
            <p key={idx}>{paragraph}</p>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-80 text-gray-500">
          <p>No research output yet</p>
        </div>
      )}
    </div>
  );
};

export default ResearchOutput;
