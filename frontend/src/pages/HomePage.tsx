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
          t("staticText.home.authRedirectFailed"),
        );
      }
      return;
    }

    // Check if user has organizations
    if (user?.organizations && Object.keys(user.organizations).length > 0) {
      navigate("/assessment/sustainability");
    } else {
      toast.error(
        t("staticText.home.organizationRequiredStart"),
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
          t("staticText.home.authRedirectFailed"),
        );
      }
      return;
    }

    // Check if user has organizations
    if (user?.organizations && Object.keys(user.organizations).length > 0) {
      navigate("/assessments");
    } else {
      toast.error(
        t("staticText.home.organizationRequiredView"),
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-dgrv-light-blue">
      {/* Hero Section */}
      <div className="pt--6 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Content */}
          <div className="text-center mb-16 animate-fade-in">
            <div className="mb-8">
              <div className="w-32 h-32 flex items-center justify-center mx-auto mb-6">
                <img
                  src="/coopsustainability-removebg-preview.png"
                  alt={t("staticText.home.logoAlt")}
                  className="w-full h-full object-contain"
                />
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-dgrv-blue mb-4 animate-scale-in">
                {t('homePage.hero.title')}
              </h1>
              <h2 className="text-2xl md:text-3xl font-semibold text-gray-700 mb-6">
                {t('homePage.hero.subtitle')}
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                {t('homePage.hero.description')}
              </p>
              <Button
                className="mt-4 px-8 py-3 text-lg font-semibold bg-dgrv-green text-white rounded shadow hover:bg-dgrv-blue transition"
                onClick={handleStartAssessment}
              >
                {t('homePage.hero.cta')}
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

          {/* Partners Section */}
          <div className="mt-16 text-center animate-fade-in">
            <p className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-6">
              {t('homePage.partners.title', 'Our Partners')}
            </p>
            <div className="flex flex-wrap justify-center items-center gap-8">
              <img
                src="/german_coop.jpeg"
                alt="German Cooperative"
                className="h-16 w-auto object-contain rounded-lg opacity-80 hover:opacity-100 transition"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
