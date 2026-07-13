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
    : isOrgAdmin || (isOrgUser && user?.organizations && Object.keys(user.organizations).length > 0)
      ? "/dashboard"
      : null;

  if (!loading && isAuthenticated && targetPath && window.location.pathname !== targetPath) {
    return <Navigate to={targetPath} replace />;
  }

  const features = [
    {
      title: t("homePage.features.items.0.title"),
      description: t("homePage.features.items.0.description"),
      icon: Leaf,
      color: "green" as const,
    },
    {
      title: t("homePage.features.items.1.title"),
      description: t("homePage.features.items.1.description"),
      icon: CheckSquare,
      color: "blue" as const,
    },
  ];

  const benefits = [
    {
      title: t("homePage.benefits.items.0.title"),
      description: t("homePage.benefits.items.0.description"),
      icon: Users,
    },
    {
      title: t("homePage.benefits.items.1.title"),
      description: t("homePage.benefits.items.1.description"),
      icon: Globe,
    },
    {
      title: t("homePage.benefits.items.2.title"),
      description: t("homePage.benefits.items.2.description"),
      icon: Shield,
    },
  ];

  const handleStartAssessment = async () => {
    if (!isAuthenticated) {
      try {
        await login();
      } catch {
        toast.error(t("staticText.home.authRedirectFailed"));
      }
      return;
    }
    if (user?.organizations && Object.keys(user.organizations).length > 0) {
      navigate("/assessment/sustainability");
    } else {
      toast.error(t("staticText.home.organizationRequiredStart"));
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">

      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-dgrv-blue to-blue-700 text-white">
        <div className="max-w-5xl mx-auto px-6 py-24 text-center animate-fade-in">
          <div className="w-20 h-20 mx-auto mb-6 bg-white/10 rounded-2xl flex items-center justify-center">
            <img
              src="/coopsustainability-removebg-preview.png"
              alt={t("staticText.home.logoAlt")}
              className="w-14 h-14 object-contain brightness-0 invert"
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 animate-scale-in">
            {t("homePage.hero.title")}
          </h1>
          <p className="text-lg md:text-xl text-blue-100 max-w-2xl mx-auto mb-10 leading-relaxed">
            {t("homePage.hero.description")}
          </p>
          <Button
            onClick={handleStartAssessment}
            className="bg-dgrv-green hover:bg-emerald-500 text-white font-semibold px-10 py-3 text-base rounded-full shadow-lg transition-all duration-200 hover:shadow-xl"
          >
            {t("homePage.hero.cta")}
          </Button>
        </div>
      </section>

      {/* ── Key Features ── */}
      <section className="py-20 px-6 bg-dgrv-light-blue">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-dgrv-green">
              {t("homePage.features.title", "Features")}
            </span>
            <h2 className="mt-2 text-3xl font-bold text-dgrv-blue">
              {t("homePage.features.heading", "Everything you need")}
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, i) => (
              <div key={feature.title} className="animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                <FeatureCard {...feature} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Choose This Tool ── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-dgrv-green">
              {t("homePage.benefits.label", "Why Us")}
            </span>
            <h2 className="mt-2 text-3xl font-bold text-dgrv-blue">
              {t("homePage.benefits.title", "Why Choose This Tool")}
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {benefits.map((benefit, i) => (
              <div key={benefit.title} className="animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                <FeatureCard {...benefit} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Supported By ── */}
      <section className="py-20 px-6 bg-gray-50 border-t border-gray-100">
        <div className="max-w-5xl mx-auto text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-dgrv-green">
            {t("homePage.partners.label", "Partners")}
          </span>
          <h2 className="mt-2 text-3xl font-bold text-dgrv-blue mb-4">
            {t("homePage.partners.title", "Supported By")}
          </h2>
          <p className="text-gray-500 mb-12 max-w-xl mx-auto">
            {t("homePage.partners.subtitle", "Proudly backed by trusted cooperative organisations")}
          </p>
          <div className="flex flex-wrap justify-center items-center gap-12">
            <div className="flex flex-col items-center gap-3">
              <img
                src="/german_coop.jpeg"
                alt="German Cooperative"
                className="h-24 w-auto object-contain rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200"
              />
              <span className="text-sm text-gray-500 font-medium">German Cooperative</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="mt-auto bg-dgrv-blue text-white">
        <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
              <img
                src="/coopsustainability-removebg-preview.png"
                alt={t("staticText.home.logoAlt")}
                className="w-5 h-5 object-contain brightness-0 invert"
              />
            </div>
            <span className="font-semibold text-sm tracking-wide">
              {t("homePage.hero.title", "CoopSustainability")}
            </span>
          </div>
          <p className="text-sm text-blue-200">
            © {new Date().getFullYear()} {t("homePage.footer.rights", "All rights reserved.")}
          </p>
        </div>
      </footer>

    </div>
  );
};
