import { Toaster } from "@/components/ui/sonner";
import * as React from "react";
import { SyncStatusIndicator } from "@/components/shared/SyncStatusIndicator";
import { Navbar } from "@/components/shared/Navbar";
import { useLocation } from "react-router-dom";

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const location = useLocation();
  
  // Routes that should not show the navbar (like login page if you have one)
  const routesWithoutNavbar = ["/login"];
  const shouldShowNavbar = !routesWithoutNavbar.includes(location.pathname);

  return (
    <>
      {shouldShowNavbar && <Navbar />}
      {children}
      <Toaster />
      <SyncStatusIndicator />
    </>
  );
};

export default MainLayout;
