
import React from 'react';
import { ExternalLink } from 'lucide-react';

interface SourcesListProps {
  sources: string[];
}

const SourcesList: React.FC<SourcesListProps> = ({ sources }) => {
  return (
    <div className="p-6 min-h-[400px] bg-white">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Sources ({sources.length})</h2>
      
      {sources.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-80">
          <p className="text-gray-500">No sources available</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sources.map((source, index) => (
            <div 
              key={index} 
              className="source-item p-4 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow bg-white"
            >
              <div className="flex justify-between">
                <p className="text-sm text-gray-800 break-all">
                  {source}
                </p>
                
                {source.startsWith('http') && (
                  <a 
                    href={source} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-600 hover:text-blue-800 flex-shrink-0"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SourcesList;
