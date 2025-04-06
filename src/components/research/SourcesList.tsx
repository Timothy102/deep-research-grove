
import React from 'react';
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Link, ExternalLink } from 'lucide-react';
import { Finding } from '@/services/researchStateService';

interface SourcesListProps {
  sources: string[];
  findings: Finding[];
  sessionId?: string | null;
}

const SourcesList: React.FC<SourcesListProps> = ({ sources, findings, sessionId }) => {
  // Combine sources from both arrays, removing duplicates
  const allSources = Array.from(new Set([
    ...(sources || []),
    ...(findings?.map(f => f.source) || []).filter(Boolean)
  ]));

  // Group findings by source
  const findingsBySource = (findings || []).reduce((acc, finding) => {
    if (finding.source) {
      if (!acc[finding.source]) {
        acc[finding.source] = [];
      }
      acc[finding.source].push(finding);
    }
    return acc;
  }, {} as Record<string, Finding[]>);

  if (!allSources.length && !Object.keys(findingsBySource).length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground">
          <FileText className="h-12 w-12 mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No Sources Yet</h3>
          <p>Sources will appear here as the research progresses.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-xl">Sources</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="space-y-6">
            {allSources.map((source, index) => (
              <Card key={index} className="mb-4">
                <CardHeader className="py-4">
                  <CardTitle className="text-md flex items-center">
                    <Link className="mr-2 h-4 w-4" />
                    <span className="font-medium">Source {index + 1}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="text-sm font-mono break-all mb-2">
                    {source}
                    {source.startsWith('http') && (
                      <a 
                        href={source} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="ml-2 inline-flex items-center text-blue-600 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Open
                      </a>
                    )}
                  </div>
                  
                  {findingsBySource[source] && findingsBySource[source].length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold mb-2">Findings from this source:</h4>
                      <div className="space-y-3">
                        {findingsBySource[source].map((finding, idx) => (
                          <div key={idx} className="text-sm p-3 bg-secondary/50 rounded-md">
                            {finding.finding?.title && (
                              <h5 className="font-medium mb-1">{finding.finding.title}</h5>
                            )}
                            {finding.finding?.summary && (
                              <p className="text-muted-foreground">{finding.finding.summary}</p>
                            )}
                            {finding.content && !finding.finding?.summary && (
                              <p className="text-muted-foreground">{finding.content}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default SourcesList;
