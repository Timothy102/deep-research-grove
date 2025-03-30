
import React from 'react';
import { ExternalLink, Link } from 'lucide-react';

interface SourcesListProps {
  sources: string[];
}

const SourcesList: React.FC<SourcesListProps> = ({ sources }) => {
  return (
    <div className="p-6 min-h-[400px] bg-white border-t border-gray-200">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Sources ({sources.length})</h2>
      
      {sources.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-80">
          <Link className="h-8 w-8 text-gray-400 mb-2" />
          <p className="text-gray-500">No sources available</p>
          <p className="mt-2 text-sm text-gray-400">Sources will be listed here as they are discovered</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sources.map((source, index) => (
            <div 
              key={index} 
              className="source-item p-4 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow bg-white"
            >
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-800 break-all mr-2">{source}</p>
                
                {source.startsWith('http') && (
                  <a 
                    href={source} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-600 hover:text-blue-800 flex-shrink-0"
                    aria-label="Open source"
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
