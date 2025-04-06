
import React, { ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LucideIcon } from 'lucide-react';

interface ResearchTabsProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

interface ResearchTabProps {
  children: ReactNode;
  label: string;
  value: string;
  icon: LucideIcon;
}

export const ResearchTab: React.FC<ResearchTabProps> = ({ children, value }) => (
  <TabsContent value={value} className="mt-4">
    {children}
  </TabsContent>
);

export const ResearchTabs: React.FC<ResearchTabsProps> = ({
  children,
  activeTab,
  onTabChange
}) => {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="grid grid-cols-3 mb-4">
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            const { label, value, icon: Icon } = child.props;
            return (
              <TabsTrigger value={value} className="flex items-center gap-2">
                {Icon && <Icon className="h-4 w-4" />}
                {label}
              </TabsTrigger>
            );
          }
          return null;
        })}
      </TabsList>
      {children}
    </Tabs>
  );
};
