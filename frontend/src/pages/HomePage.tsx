import React, { useState } from "react";
import { Navbar } from "@/components/shared/Navbar";
import { FeatureCard } from "@/components/shared/FeatureCard";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

import {
  BarChart3,
  Leaf,
  CheckSquare,
  Users,
  Globe,
  Shield,
} from "lucide-react";

export const Welcome: React.FC = () => {
  const { t } = useTranslation("home");
  const [showLoginModal, setShowLoginModal] = useState(false);

  const features = [
    {
      title: t("features.digital_gap.title"),
      description: t("features.digital_gap.description"),
      icon: BarChart3,
      color: "blue" as const,
    },
    {
      title: t("features.sustainability.title"),
      description: t("features.sustainability.description"),
      icon: Leaf,
      color: "green" as const,
    },
    {
      title: t("features.action_plans.title"),
      description: t("features.action_plans.description"),
      icon: CheckSquare,
      color: "blue" as const,
    },
  ];

  const benefits = [
    {
      title: t("benefits.built_for_coops.title"),
      description: t("benefits.built_for_coops.description"),
      icon: Users,
    },
    {
      title: t("benefits.multilingual.title"),
      description: t("benefits.multilingual.description"),
      icon: Globe,
    },
    {
      title: t("benefits.offline.title"),
      description: t("benefits.offline.description"),
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
                {t("hero.title")}
              </h1>
              <h2 className="text-2xl md:text-3xl font-semibold text-gray-700 mb-6">
                {t("hero.subtitle")}
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                {t("hero.description")}
              </p>
            </div>

            <Button
              onClick={() => setShowLoginModal(true)}
              size="lg"
              className="bg-dgrv-blue hover:bg-blue-700 text-white px-8 py-4 text-lg font-semibold rounded-lg "
            >
              {t("hero.cta")}
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
              {t("benefits.title")}
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
              {t("cta.title")}
            </h3>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              {t("cta.description")}
            </p>
            <Button
              onClick={() => setShowLoginModal(true)}
              size="lg"
              variant="outline"
              className="border-dgrv-blue text-dgrv-blue hover:bg-dgrv-blue hover:text-white px-8 py-4 text-lg font-semibold rounded-lg"
            >
              {t("cta.button")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
