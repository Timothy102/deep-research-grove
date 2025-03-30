
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Clock, CalendarDays, ChevronRight } from "lucide-react";
import { formatDistance } from "date-fns";
import { ResearchHistoryEntry } from "@/services/researchService";
import { cn } from "@/lib/utils";

export interface ResearchHistorySidebarProps {
  isOpen: boolean;
  history: any[];
  onHistoryItemClick: (item: ResearchHistoryEntry) => void;
  onSelectItem: (item: ResearchHistoryEntry) => void;
  onToggle: () => void;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return formatDistance(date, new Date(), { addSuffix: true });
};

const ResearchHistorySidebar = ({
  isOpen,
  history,
  onHistoryItemClick,
  onSelectItem,
  onToggle,
}: ResearchHistorySidebarProps) => {
  return (
    <div
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col w-72 bg-background border-r transition-transform duration-200 ease-in-out transform",
        isOpen ? "translate-x-0" : "-translate-x-full",
        "lg:relative lg:translate-x-0",
        !isOpen && "lg:w-0 lg:min-w-0",
        isOpen && "lg:min-w-[288px] lg:w-72"
      )}
    >
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4" />
          Research History
        </h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="lg:hidden"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2 py-2">
          {history.length === 0 ? (
            <div className="text-center p-4 text-muted-foreground text-sm">
              No history yet
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((group, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span>{group.title}</span>
                  </div>
                  
                  {group.items.map((item: ResearchHistoryEntry) => (
                    <button
                      key={item.id}
                      className="w-full text-left px-2 py-2 rounded-md text-sm hover:bg-accent hover:text-accent-foreground flex items-start gap-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      onClick={() => onSelectItem(item)}
                    >
                      <ChevronRight className="h-3.5 w-3.5 mt-1 flex-shrink-0" />
                      <div className="flex-1 space-y-1 overflow-hidden">
                        <p className="font-medium truncate pr-2">{item.query}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(item.created_at)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ResearchHistorySidebar;
