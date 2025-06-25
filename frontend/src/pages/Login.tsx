import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";

interface LoginProps {
  onClose?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onClose }) => {
  const { login, signup, loading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("login");
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    email: "",
    organizationName: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = (isLogin: boolean) => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    }

    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    }

    if (!isLogin) {
      if (!formData.email.trim()) {
        newErrors.email = "Email is required";
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = "Please enter a valid email address";
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }

      if (formData.password.length < 6) {
        newErrors.password = "Password must be at least 6 characters";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm(true)) return;

    try {
      const success = await login(formData.username, formData.password);
      if (success) {
        toast({
          title: "Login Successful",
          description: "Welcome back! Redirecting to your dashboard...",
          className: "bg-dgrv-green text-white",
        });
        onClose?.();
        // Redirect based on user role
        setTimeout(() => {
          const user = JSON.parse(localStorage.getItem("dgrv_user") || "{}");
          window.location.href =
            user.role === "admin" ? "/admin" : "/dashboard";
        }, 1000);
      } else {
        setErrors({ general: "Invalid username or password" });
      }
    } catch (error) {
      setErrors({ general: "Login failed. Please try again." });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm(false)) return;

    try {
      const success = await signup(
        formData.username,
        formData.password,
        formData.email,
        formData.organizationName,
      );
      if (success) {
        toast({
          title: "Account Created Successfully",
          description: "Welcome to DGRV! Redirecting to your dashboard...",
          className: "bg-dgrv-green text-white",
        });
        onClose?.();
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1000);
      } else {
        setErrors({ general: "Signup failed. Please try again." });
      }
    } catch (error) {
      setErrors({ general: "Signup failed. Please try again." });
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <LoadingSpinner text="Authenticating..." />
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="login" className="text-sm font-medium">
            Login
          </TabsTrigger>
          <TabsTrigger value="signup" className="text-sm font-medium">
            Sign Up
          </TabsTrigger>
        </TabsList>

        {errors.general && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              {errors.general}
            </AlertDescription>
          </Alert>
        )}

        <TabsContent value="login">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="login-username">Username</Label>
              <Input
                id="login-username"
                type="text"
                value={formData.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
                placeholder="Enter your username"
                className={errors.username ? "border-red-500" : ""}
              />
              {errors.username && (
                <p className="text-sm text-red-500 mt-1">{errors.username}</p>
              )}
            </div>

            <div>
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                placeholder="Enter your password"
                className={errors.password ? "border-red-500" : ""}
              />
              {errors.password && (
                <p className="text-sm text-red-500 mt-1">{errors.password}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-dgrv-blue hover:bg-blue-700"
            >
              Login
            </Button>

            <div className="text-center text-sm text-gray-600">
              Demo credentials: <br />
              Admin: <code>admin</code> / <code>password</code>
              <br />
              User: <code>john</code> / <code>password</code>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="signup">
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <Label htmlFor="signup-username">Username</Label>
              <Input
                id="signup-username"
                type="text"
                value={formData.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
                placeholder="Choose a username"
                className={errors.username ? "border-red-500" : ""}
              />
              {errors.username && (
                <p className="text-sm text-red-500 mt-1">{errors.username}</p>
              )}
            </div>

            <div>
              <Label htmlFor="signup-email">Email</Label>
              <Input
                id="signup-email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="your.email@example.com"
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && (
                <p className="text-sm text-red-500 mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <Label htmlFor="signup-organization">
                Organization Name (Optional)
              </Label>
              <Input
                id="signup-organization"
                type="text"
                value={formData.organizationName}
                onChange={(e) =>
                  handleInputChange("organizationName", e.target.value)
                }
                placeholder="Your cooperative name"
              />
            </div>

            <div>
              <Label htmlFor="signup-password">Password</Label>
              <Input
                id="signup-password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                placeholder="Create a password"
                className={errors.password ? "border-red-500" : ""}
              />
              {errors.password && (
                <p className="text-sm text-red-500 mt-1">{errors.password}</p>
              )}
            </div>

            <div>
              <Label htmlFor="signup-confirm">Confirm Password</Label>
              <Input
                id="signup-confirm"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  handleInputChange("confirmPassword", e.target.value)
                }
                placeholder="Confirm your password"
                className={errors.confirmPassword ? "border-red-500" : ""}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-dgrv-green hover:bg-green-700"
            >
              Join DGRV's Mission
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
};
