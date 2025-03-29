
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MessageSquare, Folder, Settings } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ResearchHistorySidebar from './ResearchHistorySidebar';
import { ResearchHistoryGroup } from '@/services/researchService';
import { LOCAL_STORAGE_KEYS } from '@/lib/constants';

interface SideNavProps {
  historyGroups: ResearchHistoryGroup[];
  onHistoryItemClick: (item: any) => void;
  className?: string;
}

const SideNav: React.FC<SideNavProps> = ({
  historyGroups,
  onHistoryItemClick,
  className
}) => {
  const navigate = useNavigate();
  const [showHistory, setShowHistory] = useState(false);
  
  // Check if the sidebar was previously shown
  React.useEffect(() => {
    const savedState = localStorage.getItem(LOCAL_STORAGE_KEYS.SIDEBAR_STATE);
    if (savedState === 'visible') {
      setShowHistory(true);
    }
  }, []);

  // Save sidebar state when it changes
  React.useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.SIDEBAR_STATE, showHistory ? 'visible' : 'hidden');
  }, [showHistory]);

  const createNewChat = () => {
    const newSessionId = uuidv4();
    navigate(`/research/${newSessionId}`);
  };

  return (
    <div className={`flex h-full ${className}`}>
      {/* Narrow sidebar with icons */}
      <div className="flex flex-col items-center w-14 bg-white text-gray-700 py-4 border-r border-gray-200">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={createNewChat}
                className="h-10 w-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 mb-6"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>New Chat</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="flex flex-col items-center gap-4 mt-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowHistory(!showHistory)}
                  className={`h-10 w-10 rounded-full ${showHistory ? 'bg-gray-200' : 'bg-transparent'} hover:bg-gray-200 text-gray-700`}
                >
                  <MessageSquare className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Chat History</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => navigate('/models')}
                  className="h-10 w-10 rounded-full hover:bg-gray-200 text-gray-700"
                >
                  <Folder className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>User Models</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => navigate('/profile')}
                  className="h-10 w-10 rounded-full hover:bg-gray-200 text-gray-700"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Settings</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Expandable history sidebar */}
      <div 
        className={`transition-all duration-300 overflow-hidden ${showHistory ? 'w-72' : 'w-0'}`}
      >
        {showHistory && (
          <ResearchHistorySidebar 
            history={historyGroups}
            onHistoryItemClick={onHistoryItemClick}
            isOpen={true}
            className="h-full"
          />
        )}
      </div>
    </div>
  );
};

export default SideNav;
