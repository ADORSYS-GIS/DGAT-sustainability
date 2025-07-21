import { Toaster } from "@/components/ui/sonner";
import * as React from "react";
import { SyncStatusIndicator } from "@/components/shared/SyncStatusIndicator";

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <>
      {children}
      <Toaster />
      <SyncStatusIndicator />
    </>
  );
};

export default MainLayout;
