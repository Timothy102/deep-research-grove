
import React, { createContext, useContext, useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Define types
type AuthContextType = {
  session: Session | null;
  user: any | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  loading: boolean;
};

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<any | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        // Set up auth state listener FIRST to avoid missing auth events
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log(`Auth event: ${event}`, session);
            setSession(session);
            setUser(session?.user || null);
            setLoading(false);
            
            if (event === 'SIGNED_IN') {
              toast({
                title: "Signed in successfully",
                description: "Welcome to Deep Research!",
              });
            } else if (event === 'SIGNED_OUT') {
              toast({
                title: "Signed out successfully",
              });
            }
          }
        );

        // THEN check for existing session
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Error getting session:", error);
          setLoading(false);
          return;
        }
        
        setSession(data?.session || null);
        setUser(data?.session?.user || null);
        setLoading(false);

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error("Unexpected error during getSession:", error);
        setLoading(false);
      }
    };

    getInitialSession();
  }, [toast]);

  // Sign in
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Sign in failed",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }

      toast({
        title: "Signed in successfully",
        description: "Welcome back!",
      });
    } catch (error) {
      console.error("Sign in error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign up
  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Sign up failed",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }

      toast({
        title: "Account created",
        description: "Please check your email for confirmation",
      });
    } catch (error) {
      console.error("Sign up error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/auth',
        }
      });

      if (error) {
        toast({
          title: "Google sign in failed",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }
    } catch (error) {
      console.error("Google sign in error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        toast({
          title: "Sign out failed",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }
      
      toast({
        title: "Signed out successfully",
      });
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    session,
    user,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook for using the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
