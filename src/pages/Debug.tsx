import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Debug() {
  const { user, connectedAccounts } = useAuth();
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);
  const navigate = useNavigate();

  const runDiagnostics = async () => {
    setTesting(true);
    setResults(null);

    try {
      // Call the test-instagram-token edge function (more comprehensive)
      const { data, error } = await supabase.functions.invoke('test-instagram-token', {
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
                                    Stored: {result.token_info.stored_format}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Decrypted: {result.token_info.decrypted_format}
                                  </p>
                                  <p className="text-xs">
                                    IGAA token: {result.token_info.starts_with_igaa ? (
                                      <span className="text-blue-600">✓ Yes (Instagram Business Login)</span>
                                    ) : result.token_info.starts_with_eaa ? (
                                      <span className="text-purple-600">✓ Yes (Facebook OAuth)</span>
                                    ) : (
                                      <span className="text-red-600">✗ No</span>
                                    )}
                                  </p>
                                  <p className="text-xs">
                                    Format: {result.token_info.looks_valid ? (
                                      <span className="text-green-600">✓ Valid</span>
                                    ) : (
                                      <span className="text-red-600">✗ Invalid</span>
                                    )}
                                  </p>
                                </div>

                                {result.token_info.starts_with_igaa && (
                                  <Button
                                    onClick={() => navigate('/igaa-dashboard')}
                                    className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400"
                                  >
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    Abrir Dashboard IGAA
                                  </Button>
                                )}

                                {result.tests && result.tests.length > 0 && (
                                  <div className="space-y-2">
                                    <p className="font-semibold">API Tests:</p>
                                    {result.tests.map((test: any, testIndex: number) => (
                                      <div key={testIndex} className={`p-2 rounded border ${
                                        test.success
                                          ? 'bg-green-500/10 border-green-500/20'
                                          : 'bg-red-500/10 border-red-500/20'
                                      }`}>
                                        <p className="font-semibold text-xs mb-1">
                                          {test.success ? '✓' : '✗'} {test.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {test.endpoint}
                                        </p>
                                        {test.status && (
                                          <p className="text-xs text-muted-foreground">
                                            Status: {test.status}
                                          </p>
                                        )}
                                        {test.success ? (
                                          test.response && (
                                            <details className="mt-1">
                                              <summary className="text-xs cursor-pointer text-green-600">
                                                View Response
                                              </summary>
                                              <pre className="text-xs bg-secondary/50 p-2 rounded mt-1 overflow-auto max-h-32">
                                                {JSON.stringify(test.response, null, 2)}
                                              </pre>
                                            </details>
                                          )
                                        ) : (
                                          <div className="mt-1">
                                            <p className="text-xs text-red-600 dark:text-red-400 font-semibold">
                                              {test.response?.error?.message || test.error || 'Unknown error'}
                                            </p>
                                            {test.response?.error && (
                                              <details className="mt-2">
                                                <summary className="text-xs cursor-pointer text-muted-foreground">
                                                  Full Error Details
                                                </summary>
                                                <pre className="text-xs bg-secondary/50 p-2 rounded mt-1 overflow-auto">
                                                  {JSON.stringify(test.response.error, null, 2)}
                                                </pre>
                                              </details>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
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
            <p>3. ✓ Identifies IGAA vs EAA token types</p>
            <p>4. ✓ Decrypts tokens if needed</p>
            <p>5. ✓ Tests against Facebook Graph API (basic profile)</p>
            <p>6. ✓ Tests against Instagram Graph API (/me endpoint)</p>
            <p>7. ✓ Token introspection (debug_token)</p>
            <p>8. ✓ Full profile fetch (simulates ig-dashboard)</p>
            <p>9. ✓ Shows exact error messages from Instagram/Facebook</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
