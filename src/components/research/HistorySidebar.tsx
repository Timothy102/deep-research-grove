
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, Sidebar, SidebarContent, SidebarFooter } from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Clock, Plus, Search, FileText, X, MessageSquare, History } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/components/auth/AuthContext";
import { v4 as uuidv4 } from 'uuid';

interface HistoryItem {
  id: string;
  query: string;
  user_model: string;
  use_case: string;
  created_at: string;
}

interface HistorySidebarProps {
  open: boolean;
  onClose: () => void;
  history: HistoryItem[];
  activeSessionId?: string | null;
  onHistoryItemClick: (item: HistoryItem) => void;
  onNewChat: () => void;
}

const HistorySidebar = ({ 
  open, 
  onClose, 
  history, 
  activeSessionId,
  onHistoryItemClick,
  onNewChat
}: HistorySidebarProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  
  const filteredHistory = searchTerm 
    ? history.filter(item => 
        item.query.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : history;

  const getSessionId = (item: HistoryItem): string | null => {
    try {
      const userModel = JSON.parse(item.user_model);
      return userModel.session_id || null;
    } catch {
      return null;
    }
  };

  const isActive = (item: HistoryItem): boolean => {
    const sessionId = getSessionId(item);
    return sessionId === activeSessionId;
  };

  const formatDate = (dateString: string): string => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return "Unknown date";
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: -320 }}
          animate={{ x: 0 }}
          exit={{ x: -320 }}
          transition={{ ease: "easeInOut", duration: 0.3 }}
          className="fixed top-0 left-0 bottom-0 z-40 w-[300px] overflow-hidden shadow-xl border-r"
        >
          <SidebarProvider>
            <div className="h-full bg-background">
              <div className="px-4 py-3.5 flex items-center justify-between border-b">
                <div className="flex items-center">
                  <History className="h-5 w-5 mr-2 text-muted-foreground" />
                  <h2 className="text-sm font-medium">Research History</h2>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="p-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="search"
                    placeholder="Search history..."
                    className="w-full bg-muted/40 pl-9 pr-4 py-2 text-sm rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onNewChat} 
                  className="w-full mt-3 text-xs gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Research
                </Button>
              </div>
              
              <Separator />
              
              <div className="px-0 py-0 flex-1 overflow-hidden">
                <ScrollArea className="h-[calc(100vh-150px)]">
                  {filteredHistory.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      {searchTerm ? "No matching history found" : "No research history yet"}
                    </div>
                  ) : (
                    <div className="space-y-1 p-2">
                      {filteredHistory.map((item) => (
                        <Card 
                          key={item.id} 
                          className={`cursor-pointer hover:bg-muted/60 transition-colors ${isActive(item) ? 'bg-muted border-primary/40' : ''}`}
                          onClick={() => onHistoryItemClick(item)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start gap-3">
                              <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{item.query}</p>
                                <div className="flex items-center mt-1">
                                  <Clock className="h-3 w-3 mr-1 text-muted-foreground" />
                                  <p className="text-xs text-muted-foreground truncate">
                                    {formatDate(item.created_at)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
              
              <div className="border-t p-3">
                <div className="flex items-center text-xs text-muted-foreground">
                  <FileText className="h-3.5 w-3.5 mr-1" />
                  <span>{filteredHistory.length} research {filteredHistory.length === 1 ? 'session' : 'sessions'}</span>
                </div>
              </div>
            </div>
          </SidebarProvider>
        </motion.div>
      )}
      
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-30 bg-black"
          onClick={onClose}
        />
      )}
    </AnimatePresence>
  );
};

export default HistorySidebar;
