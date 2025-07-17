import React, { useEffect } from "react";
import { Navbar } from "@/components/shared/Navbar";
import { FeatureCard } from "@/components/shared/FeatureCard";
import { Button } from "@/components/ui/button";
import {
  Leaf,
  CheckSquare,
  Users,
  Globe,
  Shield,
} from "lucide-react";
import { useAuth } from "@/hooks/shared/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export const Welcome: React.FC = () => {
  const { isAuthenticated, loading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) return;
    if (user?.email === "tchikayaline@gmail.com" && window.location.pathname !== "/admin/") {
      console.log("[Welcome] Admin detected, redirecting to /admin/");
      navigate("/admin/dashboard", { replace: true });
    } else if (user?.organisation && window.location.pathname !== "/dashboard") {
      console.log("[Welcome] User has organisation, redirecting to /dashboard");
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, loading, user, navigate]);

  const features = [
    {
      title: "Sustainability Assessment",
      description:
        "Evaluate environmental, social, and governance practices to build a more sustainable and responsible cooperative.",
      icon: Leaf,
      color: "green" as const,
    },
    {
      title: "Action Plans",
      description:
        "Track your progress with interactive Kanban boards, turning assessment insights into actionable tasks and measurable improvements.",
      icon: CheckSquare,
      color: "blue" as const,
    },
  ];

  const benefits = [
    {
      title: "Built for Cooperatives",
      description:
        "Designed specifically for cooperative organizations in Southern Africa",
      icon: Users,
    },
    {
      title: "Multilingual Support",
      description:
        "Available in English, siSwati, Portuguese, Zulu, German, and French",
      icon: Globe,
    },
    {
      title: "Offline Capable",
      description: "Works reliably even with limited internet connectivity",
      icon: Shield,
    },
  ];

  const handleStartAssessment = () => {
    if (!user?.organizations || Object.keys(user.organizations).length === 0) {
      toast.error("You need to be part of an organisation to start an assessment.");
      return;
    }
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-dgrv-light-blue">
      <Navbar />

      {/* Hero Section */}
      <div className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Content */}
          <div className="text-center mb-16 animate-fade-in">
            <div className="mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-dgrv-blue to-dgrv-green rounded-full flex items-center justify-center mx-auto mb-6 animate-glow">
                <span className="text-white font-bold text-3xl">D</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-dgrv-blue mb-4 animate-scale-in">
                Empower Your Cooperative
              </h1>
              <h2 className="text-2xl md:text-3xl font-semibold text-gray-700 mb-6">
                Assess Sustainability Goals
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Simple, secure, and impactful—help your cooperative thrive in
                the digital age while building sustainable practices for the
                future.
              </p>
              <Button
                className="mt-4 px-8 py-3 text-lg font-semibold bg-dgrv-green text-white rounded shadow hover:bg-dgrv-blue transition"
                onClick={handleStartAssessment}
              >
                Start Assessment
              </Button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 200}ms` }}
              >
                <FeatureCard {...feature} />
              </div>
            ))}
          </div>

          {/* Benefits Section */}
          <div className="grid md:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div
                key={benefit.title}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 200}ms` }}
              >
                <FeatureCard {...benefit} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
