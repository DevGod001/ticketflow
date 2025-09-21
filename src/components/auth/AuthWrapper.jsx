import { useState, useEffect } from "react";
import { User } from "@/api/entities";
import Login from "./Login";
import Signup from "./Signup";

export default function AuthWrapper({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSignup, setShowSignup] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      await User.me();
      setIsAuthenticated(true);
    } catch (error) {
      setIsAuthenticated(false);
    }
    setIsLoading(false);
  };

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleSwitchToSignup = () => {
    setShowSignup(true);
  };

  const handleSwitchToLogin = () => {
    setShowSignup(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-slate-600">Loading TicketFlow...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (showSignup) {
      return (
        <Signup
          onSignupSuccess={handleAuthSuccess}
          onSwitchToLogin={handleSwitchToLogin}
        />
      );
    } else {
      return (
        <Login
          onLoginSuccess={handleAuthSuccess}
          onSwitchToSignup={handleSwitchToSignup}
        />
      );
    }
  }

  return children;
}
