import React, { useState } from 'react';
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChevronDown, ChevronRight, ExternalLink, CircleAlert } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface Finding {
  source: string;
  content?: string;
  node_id?: string;
  query?: string;
  finding?: any;
}

interface SourcesListProps {
  sources: string[];
  findings: Finding[];
  rawData?: Record<string, string>;
}

const SourcesList: React.FC<SourcesListProps> = ({ 
  sources, 
  findings,
  rawData = {} 
}) => {
  const [groupByDomain, setGroupByDomain] = useState(false);
  
  // Combine sources and findings, prioritizing findings
  const allSources: Array<{ url: string; content?: string; isFinding: boolean; finding?: any }> = [];
  
  // Add findings first
  findings.forEach(finding => {
    allSources.push({
      url: finding.source,
      content: finding.content,
      isFinding: true,
      finding: finding.finding
    });
  });
  
  // Add remaining sources that aren't already in findings
  sources.forEach(source => {
    if (!allSources.some(item => item.url === source)) {
      allSources.push({ url: source, isFinding: false });
    }
  });
  
  if (allSources.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No sources available yet.</p>
      </div>
    );
  }

  const domainGroups = groupByDomain ? groupSourcesByDomain(allSources) : null;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-medium">
          {allSources.length} sources found
          {findings.length > 0 && ` (including ${findings.length} findings)`}
        </h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setGroupByDomain(!groupByDomain)}
          className="text-xs"
        >
          {groupByDomain ? "List view" : "Group by domain"}
        </Button>
      </div>
      
      {groupByDomain ? (
        // Grouped by domain view
        <div className="space-y-6">
          {domainGroups?.map(([domain, items]) => (
            <div key={domain} className="space-y-2">
              <h4 className="font-medium flex items-center gap-2 text-sm">
                {getDomainIcon(`https://${domain}`)}
                <span>{domain}</span>
                <Badge variant="outline" className="ml-1">{items.length}</Badge>
              </h4>
              <div className="space-y-2 ml-1">
                {items.map((item, idx) => (
                  <SourceItem 
                    key={idx} 
                    url={item.url} 
                    content={item.content} 
                    isFinding={item.isFinding}
                    index={item.index}
                    finding={item.finding}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // List view
        <div className="space-y-3">
          {allSources.map((source, index) => (
            <SourceItem 
              key={index} 
              url={source.url} 
              content={source.content} 
              isFinding={source.isFinding}
              index={index}
              finding={source.finding}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SourcesList;
