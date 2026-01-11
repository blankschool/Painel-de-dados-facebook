import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';

export default function Debug() {
  const { user, connectedAccounts } = useAuth();
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runDiagnostics = async () => {
    setTesting(true);
    setResults(null);

    try {
      // Call the debug-token edge function
      const { data, error } = await supabase.functions.invoke('debug-token', {
        body: {},
      });

      if (error) {
        setResults({
          success: false,
          error: error.message,
        });
      } else {
        setResults(data);
      }
    } catch (err) {
      setResults({
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>🔧 Token Diagnostics</CardTitle>
            <CardDescription>
              Debug tool to check your Instagram/Facebook token status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-secondary/30 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>User ID:</strong> {user?.id || 'Not logged in'}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Connected Accounts:</strong> {connectedAccounts.length}
                </p>
                {connectedAccounts.map((account) => (
                  <p key={account.id} className="text-sm text-muted-foreground ml-4">
                    • @{account.account_username} ({account.provider})
                  </p>
                ))}
              </div>

              <Button onClick={runDiagnostics} disabled={testing} className="w-full">
                {testing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing Tokens...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Run Token Diagnostics
                  </>
                )}
              </Button>

              {results && (
                <div className="space-y-4">
                  {results.success ? (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold text-green-900 dark:text-green-100">
                            Diagnostics Complete
                          </p>
                          <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                            Tested {results.accounts_count} account(s)
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold text-red-900 dark:text-red-100">
                            Error Running Diagnostics
                          </p>
                          <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                            {results.error}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {results.results && (
                    <div className="space-y-3">
                      {results.results.map((result: any, index: number) => (
                        <Card key={index}>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center justify-between">
                              <span>@{result.username}</span>
                              <span className="text-xs font-normal text-muted-foreground">
                                {result.provider}
                              </span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm">
                            {result.error ? (
                              <div className="bg-red-500/10 border border-red-500/20 rounded p-2">
                                <p className="text-red-700 dark:text-red-300 font-semibold">
                                  ❌ Error
                                </p>
                                <p className="text-red-600 dark:text-red-400 text-xs mt-1">
                                  {result.error}
                                </p>
                              </div>
                            ) : (
                              <>
                                <div className="bg-secondary/30 p-2 rounded">
                                  <p className="font-semibold mb-1">Token Info:</p>
                                  <p className="text-xs text-muted-foreground">
                                    Stored: {result.token_info.stored_prefix}... ({result.token_info.stored_length} chars)
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Decrypted: {result.token_info.decrypted_prefix}... ({result.token_info.decrypted_length} chars)
                                  </p>
                                  <p className="text-xs">
                                    Format: {result.token_info.looks_valid ? (
                                      <span className="text-green-600">✓ Valid</span>
                                    ) : (
                                      <span className="text-red-600">✗ Invalid</span>
                                    )}
                                  </p>
                                </div>

                                <div className={`p-2 rounded ${
                                  result.api_test.success
                                    ? 'bg-green-500/10 border border-green-500/20'
                                    : 'bg-red-500/10 border border-red-500/20'
                                }`}>
                                  <p className="font-semibold mb-1">
                                    {result.api_test.success ? '✓' : '✗'} Instagram API Test
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Status: {result.api_test.status}
                                  </p>
                                  {result.api_test.success ? (
                                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                      API responded successfully: {JSON.stringify(result.api_test.response)}
                                    </p>
                                  ) : (
                                    <div className="mt-1">
                                      <p className="text-xs text-red-600 dark:text-red-400 font-semibold">
                                        {result.api_test.error_details?.message || 'Unknown error'}
                                      </p>
                                      {result.api_test.error_details && (
                                        <details className="mt-2">
                                          <summary className="text-xs cursor-pointer text-muted-foreground">
                                            Full Error Details
                                          </summary>
                                          <pre className="text-xs bg-secondary/50 p-2 rounded mt-1 overflow-auto">
                                            {JSON.stringify(result.api_test.error_details, null, 2)}
                                          </pre>
                                        </details>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </>
                            )}

                            <details className="text-xs">
                              <summary className="cursor-pointer text-muted-foreground">
                                Full Account Info
                              </summary>
                              <pre className="bg-secondary/50 p-2 rounded mt-1 overflow-auto">
                                {JSON.stringify(result, null, 2)}
                              </pre>
                            </details>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  <details>
                    <summary className="text-xs cursor-pointer text-muted-foreground">
                      Raw Response
                    </summary>
                    <pre className="text-xs bg-secondary/50 p-2 rounded mt-1 overflow-auto max-h-96">
                      {JSON.stringify(results, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">What This Tests</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2 text-muted-foreground">
            <p>1. ✓ Fetches all your connected accounts from database</p>
            <p>2. ✓ Checks token format (encrypted vs raw vs base64)</p>
            <p>3. ✓ Decrypts tokens if needed</p>
            <p>4. ✓ Tests each token against Instagram Graph API</p>
            <p>5. ✓ Shows exact error messages from Instagram</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
