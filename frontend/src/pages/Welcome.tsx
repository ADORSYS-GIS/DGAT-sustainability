import React, { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { FeatureCard } from "@/components/FeatureCard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BarChart3,
  Leaf,
  CheckSquare,
  Users,
  Globe,
  Shield,
} from "lucide-react";
import { Login } from "./Login";

export const Welcome: React.FC = () => {
  const [showLoginModal, setShowLoginModal] = useState(false);

  const features = [
    {
      title: "Digital Gap Analysis",
      description:
        "Assess your cooperative's digital maturity with comprehensive questionnaires covering technology infrastructure, digital literacy, and online presence.",
      icon: BarChart3,
      color: "blue" as const,
    },
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-dgrv-light-blue">
      <Navbar onLoginClick={() => setShowLoginModal(true)} />

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
                Assess Digital & Sustainability Goals
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Simple, secure, and impactful—help your cooperative thrive in
                the digital age while building sustainable practices for the
                future.
              </p>
            </div>

            <Button
              onClick={() => setShowLoginModal(true)}
              size="lg"
              className="bg-dgrv-blue hover:bg-blue-700 text-white px-8 py-4 text-lg font-semibold rounded-lg "
            >
              Start Assessment
            </Button>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 200}ms` }}
              >
                <FeatureCard
                  {...feature}
                  onClick={() => setShowLoginModal(true)}
                />
              </div>
            ))}
          </div>

          {/* Benefits Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 animate-fade-in">
            <h3 className="text-3xl font-bold text-center text-dgrv-blue mb-8">
              Why Choose DGRV Assessment Tools?
            </h3>
            <div className="grid md:grid-cols-3 gap-8">
              {benefits.map((benefit, index) => (
                <div key={benefit.title} className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-dgrv-blue to-dgrv-green rounded-full flex items-center justify-center mx-auto mb-4">
                    <benefit.icon className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">
                    {benefit.title}
                  </h4>
                  <p className="text-gray-600">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center mt-16">
            <h3 className="text-2xl font-bold text-dgrv-blue mb-4">
              Ready to Transform Your Cooperative?
            </h3>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Join cooperatives across Southern Africa in building a more
              digital and sustainable future.
            </p>
            <Button
              onClick={() => setShowLoginModal(true)}
              size="lg"
              variant="outline"
              className="border-dgrv-blue text-dgrv-blue hover:bg-dgrv-blue hover:text-white px-8 py-4 text-lg font-semibold rounded-lg"
            >
              Get Started Today
            </Button>
          </div>
        </div>
      </div>

      {/* Login Modal */}
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-dgrv-blue">
              Access Your Dashboard
            </DialogTitle>
          </DialogHeader>
          <Login onClose={() => setShowLoginModal(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};
