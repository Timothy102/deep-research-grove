
import React, { useState } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileText, Copy, Download, CheckCircle2 } from "lucide-react";
import { saveAs } from 'file-saver';
import { toast } from 'sonner';

export interface ResearchOutputProps {
  output: string;
  isLoading?: boolean;
  userName?: string;
  userModels?: any[];
  onSelectModel?: (modelId: string) => void;
}

const ResearchOutput: React.FC<ResearchOutputProps> = ({ 
  output, 
  isLoading = false, 
  userName,
  userModels = [],
  onSelectModel
}) => {
  const navigate = useNavigate();
  const [isCopied, setIsCopied] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  if (!output.trim()) {
    return (
      <div className="text-center space-y-6">
        {userName ? (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Hey, {userName}</h2>
            <p className="text-muted-foreground text-lg">Who are you today?</p>
            
            {userModels && userModels.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-w-4xl mx-auto">
                {userModels.map((model) => (
                  <Card 
                    key={model?.id || Math.random().toString()} 
                    className="cursor-pointer hover:border-primary transition-colors duration-200"
                    onClick={() => onSelectModel && model?.id && onSelectModel(model.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate">{model?.name || "Unnamed Model"}</span>
                          {model?.is_default && (
                            <Badge variant="outline" className="text-xs px-1 py-0">Default</Badge>
                          )}
                        </div>
                        
                        {model?.domain && (
                          <span className="text-xs text-muted-foreground truncate">
                            Domain: {model.domain}
                          </span>
                        )}
                        
                        {model?.expertise_level && (
                          <span className="text-xs text-muted-foreground truncate">
                            Expertise: {model.expertise_level}
                          </span>
                        )}
                        
                        {model?.cognitive_style && (
                          <span className="text-xs text-muted-foreground truncate">
                            Style: {model.cognitive_style}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground mt-4">
                <p>No user models found. Create one to get started!</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground">No research output yet. Start a search to see results here.</p>
        )}
      </div>
    );
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setIsCopied(true);
      toast.success("Output copied to clipboard");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
      toast.error("Failed to copy text");
    }
  };

  const exportToPdf = async () => {
    try {
      // We'll use a simple approach with html-to-pdf conversion
      const { jsPDF } = await import('jspdf');
      
      const doc = new jsPDF();
      
      // Set title
      doc.setFontSize(16);
      doc.text("Research Results", 20, 20);
      
      // Add content with word wrapping
      doc.setFontSize(12);
      const splitText = doc.splitTextToSize(output, 170);
      doc.text(splitText, 20, 30);
      
      // Save the PDF
      doc.save("research-output.pdf");
      toast.success("PDF downloaded successfully");
    } catch (err) {
      console.error("Failed to export as PDF:", err);
      toast.error("Failed to export as PDF");
    }
  };

  const exportToDocx = async () => {
    try {
      // Dynamically import the docx library
      const docx = await import('docx');
      
      // Create document
      const doc = new docx.Document({
        sections: [{
          properties: {},
          children: [
            new docx.Paragraph({
              children: [
                new docx.TextRun({ text: "Research Results", bold: true, size: 28 }),
              ],
            }),
            new docx.Paragraph({
              children: [
                new docx.TextRun({ text: output, size: 24 }),
              ],
            }),
          ],
        }],
      });
      
      // Generate and save document
      const buffer = await docx.Packer.toBuffer(doc);
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      saveAs(blob, "research-output.docx");
      toast.success("DOCX downloaded successfully");
    } catch (err) {
      console.error("Failed to export as DOCX:", err);
      toast.error("Failed to export as DOCX");
    }
  };

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      {/* Export Options */}
      <div className="flex flex-wrap items-center justify-end gap-2 mb-4">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-1" 
          onClick={copyToClipboard}
        >
          {isCopied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
          <span>{isCopied ? "Copied" : "Copy"}</span>
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-1" 
          onClick={exportToPdf}
        >
          <FileText size={16} />
          <span>PDF</span>
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-1" 
          onClick={exportToDocx}
        >
          <Download size={16} />
          <span>DOCX</span>
        </Button>
      </div>
      
      <div className="whitespace-pre-wrap">{output}</div>
    </div>
  );
};

export default ResearchOutput;
