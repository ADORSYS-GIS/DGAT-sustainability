import { useEffect } from "react";
import { FeatureCard } from "@/components/shared/FeatureCard";
import { Button } from "@/components/ui/button";
import {
  Leaf,
  CheckSquare,
  Users,
  Globe,
  Shield,
  ArrowRight,
  ShieldCheck,
  BarChart3,
  Zap,
  CheckCircle2
} from "lucide-react";
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
    <div className="min-h-screen bg-white selection:bg-emerald-100 selection:text-emerald-900">
      {/* Premium Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-20">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob" />
          <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000" />
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-teal-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="space-y-12">
            {/* Branded Logo Hero */}
            <div className="inline-block animate-in fade-in zoom-in duration-1000">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-[3rem] blur opacity-25 group-hover:opacity-50 transition duration-1000" />
                <div className="relative w-48 h-48 md:w-64 md:h-64 bg-white rounded-[2.8rem] shadow-2xl p-8 flex items-center justify-center border border-emerald-50/50 backdrop-blur-xl">
                  <img
                    src="/coopsustainability-removebg-preview.png"
                    alt="Sustainability Portal Logo"
                    className="w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              </div>
            </div>

            {/* Hero Typography */}
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-black uppercase tracking-[0.3em] mb-4 animate-in slide-in-from-top-4 duration-700">
                <Zap className="w-3 h-3" />
                <span>{t('landing.newEra', { defaultValue: 'Next Generation Sustainability' })}</span>
              </div>

              <h1 className="text-5xl md:text-8xl font-black text-slate-900 tracking-tighter leading-[0.9] animate-in fade-in slide-in-from-bottom-8 duration-1000">
                {t('homePage.hero.title')}
              </h1>

              <p className="text-xl md:text-2xl text-slate-600 font-medium max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-12 duration-1000">
                {t('homePage.hero.description')}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8 animate-in fade-in zoom-in duration-1000 delay-500">
                <Button
                  className="w-full sm:w-auto h-14 px-10 text-lg font-black bg-slate-900 text-white hover:bg-emerald-600 rounded-2xl shadow-2xl transition-all duration-300 flex items-center group"
                  onClick={handleStartAssessment}
                >
                  <span>{t('homePage.hero.cta')}</span>
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto h-14 px-10 text-lg font-bold border-2 border-slate-200 rounded-2xl hover:bg-slate-50 transition-all duration-300"
                  onClick={handleViewAssessments}
                >
                  {t('homePage.hero.viewResults', { defaultValue: 'Explore Insights' })}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Features Section */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-sm font-black text-emerald-600 uppercase tracking-widest">{t('whyUs', { defaultValue: 'Advanced Capabilities' })}</h2>
            <p className="text-4xl font-bold text-slate-900 tracking-tight">{t('platformStrengths', { defaultValue: 'Built for Performance & Precision' })}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group p-10 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-emerald-200 transition-all duration-500 hover:-translate-y-2"
                style={{ animationDelay: `${index * 200}ms` }}
              >
                <div className={`w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-8 group-hover:bg-emerald-50 transition-colors`}>
                  <feature.icon className={`w-8 h-8 text-slate-400 group-hover:text-emerald-600 transition-colors`} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-4">{feature.title}</h3>
                <p className="text-slate-500 leading-relaxed font-medium">{feature.description}</p>
                <div className="mt-8 flex items-center text-emerald-600 font-bold text-sm tracking-tight">
                  <span className="mr-2">{t('learnMore', { defaultValue: 'Deep Dive' })}</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-12">
            {benefits.map((benefit, index) => (
              <div
                key={benefit.title}
                className="flex flex-col items-center text-center space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000"
                style={{ animationDelay: `${index * 200}ms` }}
              >
                <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center border-4 border-white shadow-xl">
                  <benefit.icon className="w-8 h-8 text-emerald-600" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-bold text-slate-900">{benefit.title}</h3>
                  <p className="text-slate-500 leading-relaxed">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-4">
          <div className="bg-slate-900 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl" />

            <div className="relative z-10 space-y-8">
              <div className="flex justify-center -space-x-3 mb-6">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-12 h-12 rounded-full border-4 border-slate-900 bg-slate-800 flex items-center justify-center overflow-hidden">
                    <img src={`https://i.pravatar.cc/150?u=${i}`} alt="User" />
                  </div>
                ))}
                <div className="w-12 h-12 rounded-full border-4 border-slate-900 bg-emerald-500 flex items-center justify-center text-slate-900 font-black text-xs">
                  +1k
                </div>
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-white leading-tight">
                {t('ctaFooter.title', { defaultValue: 'Ready to benchmark your sustainability impact?' })}
              </h2>
              <Button
                className="h-16 px-12 bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-black text-xl rounded-2xl shadow-xl shadow-emerald-500/20 transition-all duration-300"
                onClick={handleStartAssessment}
              >
                {t('homePage.hero.cta')}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-12 border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center space-x-3">
            <img
              src="/coopsustainability-removebg-preview.png"
              alt="Logo"
              className="h-8 w-auto opacity-50 grayscale hover:grayscale-0 transition-all cursor-pointer"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            />
            <span className="text-slate-400 font-bold text-sm">© {new Date().getFullYear()} Sustainability Portal</span>
          </div>
          <div className="flex items-center gap-8">
            {['Privacy', 'Terms', 'Support'].map(link => (
              <a key={link} href="#" className="text-slate-400 hover:text-emerald-600 font-bold text-sm transition-colors">{link}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};
