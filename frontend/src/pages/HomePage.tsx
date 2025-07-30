import { useEffect } from "react";
import { FeatureCard } from "@/components/shared/FeatureCard";
import { Button } from "@/components/ui/button";
import { Leaf, CheckSquare, Users, Globe, Shield } from "lucide-react";
import { useAuth } from "@/hooks/shared/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export const Welcome: React.FC = () => {
  const { isAuthenticated, loading, user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) return;
    const roles = user?.roles || user?.realm_access?.roles || [];
    const isDrgvAdmin = roles.includes("drgv_admin");
    const isOrgAdmin = roles.includes("org_admin");
    const isOrgUser = roles.includes("Org_User");
    if (isDrgvAdmin && window.location.pathname !== "/admin/") {
      navigate("/admin/dashboard", { replace: true });
    } else if (
      (isOrgAdmin || isOrgUser) &&
      window.location.pathname !== "/dashboard"
    ) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, loading, user, navigate]);

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

  const handleStartAssessment = () => {
    if (user?.organizations && Object.keys(user.organizations).length > 0) {
      navigate("/assessment/sustainability");
    } else {
      toast.error(
        "You need to be part of an organisation to start an assessment.",
      );
    }
  };

  const handleViewAssessments = () => {
    if (user?.organizations && Object.keys(user.organizations).length > 0) {
      navigate("/assessments");
    } else {
      toast.error(
        "You need to be part of an organisation to view assessments.",
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-dgrv-light-blue">
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
        </div>
      </div>
    </div>
  );
};
