import { useEffect } from "react";
import { FeatureCard } from "@/components/shared/FeatureCard";
import { Button } from "@/components/ui/button";
import { Leaf, CheckSquare, Users, Globe, Shield } from "lucide-react";
import { useAuth } from "@/hooks/shared/useAuth";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export const Welcome: React.FC = () => {
  const { isAuthenticated, loading, user, roles, login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const isDrgvAdmin = roles.includes("drgv_admin");
  const isOrgAdmin = roles.includes("org_admin");
  const isOrgUser = roles.includes("Org_User");

  const targetPath = isDrgvAdmin
    ? "/admin/dashboard"
    : (isOrgAdmin || (isOrgUser && user?.organizations && Object.keys(user.organizations).length > 0))
      ? "/dashboard"
      : null;

  if (!loading && isAuthenticated && targetPath && window.location.pathname !== targetPath) {
    return <Navigate to={targetPath} replace />;
  }

  const features = [
    {
      title: t('homePage.features.items.0.title'),
      description: t('homePage.features.items.0.description'),
      icon: Leaf,
      color: "green" as const,
    },
    {
      title: t('homePage.features.items.1.title'),
      description: t('homePage.features.items.1.description'),
      icon: CheckSquare,
      color: "blue" as const,
    },
  ];

  const benefits = [
    {
      title: t('homePage.benefits.items.0.title'),
      description: t('homePage.benefits.items.0.description'),
      icon: Users,
    },
    {
      title: t('homePage.benefits.items.1.title'),
      description: t('homePage.benefits.items.1.description'),
      icon: Globe,
    },
    {
      title: t('homePage.benefits.items.2.title'),
      description: t('homePage.benefits.items.2.description'),
      icon: Shield,
    },
  ];

  const handleStartAssessment = async () => {
    // Check if user is authenticated first
    if (!isAuthenticated) {
      try {
        await login();
      } catch (error) {
        console.error("Failed to redirect to authentication:", error);
        toast.error(
          "Failed to redirect to authentication. Please try again.",
        );
      }
      return;
    }

    // Check if user has organizations
    if (user?.organizations && Object.keys(user.organizations).length > 0) {
      navigate("/assessment/sustainability");
    } else {
      toast.error(
        "You need to be part of an organisation to start an assessment.",
      );
    }
  };

  const handleViewAssessments = async () => {
    // Check if user is authenticated first
    if (!isAuthenticated) {
      try {
        await login();
      } catch (error) {
        console.error("Failed to redirect to authentication:", error);
        toast.error(
          "Failed to redirect to authentication. Please try again.",
        );
      }
      return;
    }

    // Check if user has organizations
    if (user?.organizations && Object.keys(user.organizations).length > 0) {
      navigate("/assessments");
    } else {
      toast.error(
        "You need to be part of an organisation to view assessments.",
      );
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Refined Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32">
        {/* Soft Decorative Gradient */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-dgrv-light-blue/30 to-transparent pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            {/* Branded Logo */}
            <div className="mb-12 animate-in fade-in zoom-in duration-1000">
              <div className="w-48 md:w-64 h-auto mx-auto p-4 bg-white rounded-3xl shadow-sm border border-slate-100">
                <img
                  src="/coopsustainability-removebg-preview.png"
                  alt="Sustainability Portal Logo"
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>

            {/* Clean Hero Typography */}
            <div className="max-w-4xl mx-auto space-y-6">
              <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-[1.1] animate-in fade-in slide-in-from-bottom-8 duration-700">
                {t('homePage.hero.title')}
              </h1>

              <h2 className="text-2xl md:text-3xl font-bold text-slate-600 animate-in fade-in slide-in-from-bottom-12 duration-700 delay-100">
                {t('homePage.hero.subtitle')}
              </h2>

              <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-16 duration-700 delay-200">
                {t('homePage.hero.description')}
              </p>

              <div className="pt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in zoom-in duration-700 delay-300">
                <Button
                  className="h-14 px-10 text-lg font-black bg-dgrv-blue text-white rounded-2xl shadow-xl hover:bg-emerald-600 hover:-translate-y-1 transition-all duration-300"
                  onClick={handleStartAssessment}
                >
                  {t('homePage.hero.cta')}
                </Button>
                <Button
                  variant="outline"
                  className="h-14 px-10 text-lg font-bold border-2 border-slate-200 rounded-2xl hover:bg-slate-50 transition-all duration-300"
                  onClick={handleViewAssessments}
                >
                  {t('homePage.hero.viewResults', { defaultValue: 'Explore Insights' })}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content Section Integration */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">

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
  );
};
