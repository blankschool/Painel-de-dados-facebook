import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Instagram, Facebook, Mail, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Auth = () => {
  const { user, loading, connectedAccounts, loadingAccounts, connectWithInstagram, connectWithFacebook, signInWithEmail, signUpWithEmail } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login');
  
  // Email form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // Check for error in URL params
  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      const errorMessages: Record<string, string> = {
        'invalid_state': 'Authentication session expired. Please try again.',
        'token_exchange_failed': 'Failed to connect your account. Please try again.',
        'no_session': 'Please sign in before connecting an account.',
        'unknown': 'An error occurred. Please try again.',
      };
      toast({
        title: 'Authentication Error',
        description: errorMessages[error] || errorMessages['unknown'],
        variant: 'destructive',
      });
    }
  }, [searchParams]);

  // Redirect authenticated users with connected accounts to dashboard
  useEffect(() => {
    if (user && !loading && !loadingAccounts && connectedAccounts.length > 0) {
      const redirectTo = localStorage.getItem('auth_redirect_to') || '/profile';
      localStorage.removeItem('auth_redirect_to');
      navigate(redirectTo);
    }
  }, [user, loading, loadingAccounts, connectedAccounts, navigate]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSigningIn(true);
    
    try {
      if (authTab === 'login') {
        const { error } = await signInWithEmail(email, password);
        if (error) throw error;
        toast({
          title: 'Welcome back',
          description: 'You are now signed in.',
        });
      } else {
        const { error } = await signUpWithEmail(email, password, fullName);
        if (error) throw error;
        toast({
          title: 'Account created',
          description: 'Please check your email to confirm your account.',
        });
      }
    } catch (error: any) {
      const errorMessage = error.message === 'Invalid login credentials'
        ? 'Invalid email or password.'
        : error.message === 'User already registered'
          ? 'This email is already registered.'
          : error.message;
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleInstagramConnect = async () => {
    setIsSigningIn(true);
    try {
      await connectWithInstagram();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to connect with Instagram.',
        variant: 'destructive',
      });
      setIsSigningIn(false);
    }
  };

  const handleFacebookConnect = async () => {
    setIsSigningIn(true);
    try {
      await connectWithFacebook();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to connect with Facebook.',
        variant: 'destructive',
      });
      setIsSigningIn(false);
    }
  };

  if (loading || loadingAccounts) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // User is logged in but needs to connect an account (Step 2)
  const needsAccountConnection = user && connectedAccounts.length === 0;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background-secondary">
      <div className="w-full max-w-md animate-slide-up p-8">
        <div className="rounded-3xl border border-border bg-card p-10 shadow-card">
          {/* Logo */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-background">
              <Instagram className="h-8 w-8 text-foreground" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {needsAccountConnection ? 'Connect your account' : 'Access your dashboard'}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {needsAccountConnection 
                ? 'Choose how you want to connect. This lets you analyze and save Instagram accounts under your profile.'
                : 'Sign in with email to save profiles and track your analysis history.'}
            </p>
          </div>

          {needsAccountConnection ? (
            // Step 2: Connect Instagram or Facebook
            <div className="space-y-4">
              <p className="text-center text-sm text-muted-foreground mb-6">
                Signed in as <span className="font-medium text-foreground">{user.email}</span>
              </p>
              
              {/* Instagram Button */}
              <Button
                onClick={handleInstagramConnect}
                disabled={isSigningIn}
                className="w-full gap-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 py-6 text-sm font-semibold text-white transition-all hover:from-purple-700 hover:to-pink-600 hover:shadow-hover"
              >
                {isSigningIn ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Instagram className="h-5 w-5" />
                )}
                Connect Instagram
              </Button>

              {/* Facebook Button */}
              <Button
                onClick={handleFacebookConnect}
                disabled={isSigningIn}
                className="w-full gap-3 rounded-xl bg-[#1877F2] py-6 text-sm font-semibold text-white transition-all hover:bg-[#166FE5] hover:shadow-hover"
              >
                {isSigningIn ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Facebook className="h-5 w-5" />
                )}
                Connect Facebook
              </Button>
            </div>
          ) : (
            // Step 1: Email login/signup only
            <div className="space-y-6">
              <Tabs value={authTab} onValueChange={(v) => setAuthTab(v as 'login' | 'signup')} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="login">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Create account</TabsTrigger>
                </TabsList>
                
                <form onSubmit={handleEmailAuth} className="space-y-4">
                  <TabsContent value="signup" className="mt-0">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full name</Label>
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="Your name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="rounded-xl"
                      />
                    </div>
                  </TabsContent>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="rounded-xl"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="rounded-xl pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSigningIn}
                    className="w-full gap-2 rounded-xl py-6 text-sm font-medium"
                  >
                    {isSigningIn ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    ) : (
                      <Mail className="h-5 w-5" />
                    )}
                    {authTab === 'login' ? 'Sign in' : 'Create account'}
                  </Button>
                </form>
              </Tabs>
            </div>
          )}

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-muted-foreground">
            Your data is stored securely. You can disconnect at any time.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
