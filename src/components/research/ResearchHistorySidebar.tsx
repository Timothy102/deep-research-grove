
import React from 'react';
import { Clock, ChevronRight } from 'lucide-react';
import { ResearchHistoryGroup } from '@/services/researchService';

interface ResearchHistorySidebarProps {
  history: ResearchHistoryGroup[];
  onHistoryItemClick: (item: any) => void;
  isOpen: boolean;
  className?: string;
}

const ResearchHistorySidebar: React.FC<ResearchHistorySidebarProps> = ({
  history,
  onHistoryItemClick,
  isOpen,
  className
}) => {
  return (
    <div className={`h-full bg-white border-r border-gray-200 overflow-y-auto ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">Research History</h2>
      </div>
      
      <div className="overflow-y-auto">
        {history.length === 0 ? (
          <div className="px-4 py-6 text-center text-gray-500">
            <Clock className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p>No research history yet</p>
          </div>
        ) : (
          <div className="px-2 py-2">
            {history.map((group) => (
              <div key={group.date} className="mb-4">
                <h3 className="text-xs font-semibold uppercase text-gray-500 px-2 my-2">{group.date}</h3>
                
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      className="flex items-center w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 transition-colors duration-200"
                      onClick={() => onHistoryItemClick(item)}
                    >
                      <ChevronRight className="h-4 w-4 text-gray-500 mr-2 flex-shrink-0" />
                      <span className="truncate text-gray-800">{item.query}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResearchHistorySidebar;
