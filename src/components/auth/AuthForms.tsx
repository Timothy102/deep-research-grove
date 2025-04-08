import { useState } from "react";
import { useAuth } from "./AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { captureEvent } from "@/integrations/posthog/client";

export const SignInForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { signIn, loading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    try {
      // Track sign in attempt
      captureEvent('signin_attempt', { 
        email_domain: email.split('@')[1] || 'unknown'
      });
      
      await signIn(email, password);
      
      // Track sign in success
      captureEvent('signin_success', { 
        email_domain: email.split('@')[1] || 'unknown'
      });
    } catch (error) {
      console.error("Sign in error:", error);
      
      // Track sign in failure
      captureEvent('signin_error', { 
        email_domain: email.split('@')[1] || 'unknown',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md">
      <div className="space-y-2">
        <Input
          type="email"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-11"
        />
      </div>
      <div className="space-y-2">
        <Input
          type="password"
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="h-11"
        />
      </div>
      <Button type="submit" className="w-full h-11" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> signing in...
          </>
        ) : (
          "sign in"
        )}
      </Button>
    </form>
  );
};

export const SignUpForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { signUp, loading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    try {
      // Track sign up attempt
      captureEvent('signup_attempt', { 
        email_domain: email.split('@')[1] || 'unknown'
      });
      
      await signUp(email, password);
      
      // Track sign up success
      captureEvent('signup_success', { 
        email_domain: email.split('@')[1] || 'unknown'
      });
    } catch (error) {
      console.error("Sign up error:", error);
      
      // Track sign up failure
      captureEvent('signup_error', { 
        email_domain: email.split('@')[1] || 'unknown',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md">
      <div className="space-y-2">
        <Input
          type="email"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-11"
        />
      </div>
      <div className="space-y-2">
        <Input
          type="password"
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="h-11"
        />
      </div>
      <Button type="submit" className="w-full h-11" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> creating account...
          </>
        ) : (
          "create account"
        )}
      </Button>
    </form>
  );
};
