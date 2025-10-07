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
      <main className={shouldShowNavbar ? "pt-16" : ""}>
        <div className="py-8 px-4 sm:px-6 lg:px-8">{children}</div>
      </main>
      <Toaster />
      <SyncStatusIndicator />
    </>
  );
};

export default MainLayout;
