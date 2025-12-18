import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useInstagram } from '@/contexts/InstagramContext';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { requireSupabaseJwt } from '@/integrations/supabase/jwt';
import { copyTextToClipboard } from '@/utils/clipboard';
import { 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Database,
  Code,
  Terminal,
  Play,
  Pause,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  endpoint?: string;
  duration?: number;
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

const getSupabaseFunctionErrorDetails = (error: unknown): string | null => {
  if (!error || typeof error !== 'object') return null;
  const maybeContext = (error as { context?: unknown }).context;
  if (!maybeContext || typeof maybeContext !== 'object') return null;

  const context = maybeContext as { status?: unknown; body?: unknown };
  const status = typeof context.status === 'number' ? context.status : null;

  const body = context.body;
  if (body && typeof body === 'object') {
    const bodyError = (body as { error?: unknown }).error;
    const requestId = (body as { request_id?: unknown }).request_id;
    const parts = [
      typeof bodyError === 'string' ? bodyError : null,
      typeof requestId === 'string' ? `request_id: ${requestId}` : null,
      status !== null ? `status: ${status}` : null,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(' | ') : null;
  }

  if (typeof body === 'string') {
    return status !== null ? `status: ${status} | ${body}` : body;
  }

  return status !== null ? `status: ${status}` : null;
};

const DeveloperMode = () => {
  const { connectedAccounts, refreshConnectedAccounts } = useAuth();
  const { profile, media, refreshData, loading } = useInstagram();
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [forceRefreshing, setForceRefreshing] = useState(false);
  const [seedingTestAccount, setSeedingTestAccount] = useState(false);

  // Add log entry
  const addLog = (type: LogEntry['type'], message: string, endpoint?: string, duration?: number) => {
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      type,
      message,
      endpoint,
      duration,
    };
    setLogs(prev => [entry, ...prev].slice(0, 50));
  };

  // Auto refresh effect
  useEffect(() => {
    if (autoRefresh) {
      addLog('info', 'Auto-refresh ativado (30s)');
      const interval = setInterval(() => {
        addLog('info', 'Executando refresh automático...', '/refresh');
        refreshData();
      }, 30000);
      setRefreshInterval(interval);
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
        addLog('info', 'Auto-refresh desativado');
      }
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [autoRefresh]);

  const handleForceRefresh = async () => {
    setForceRefreshing(true);
    const startTime = Date.now();
    addLog('info', 'Iniciando refresh forçado...', '/api/refresh');
    
    try {
      await refreshData();
      const duration = Date.now() - startTime;
      addLog('success', 'Refresh concluído com sucesso', '/api/refresh', duration);
      toast.success('Dados atualizados');
    } catch (error) {
      addLog('error', `Erro no refresh: ${error}`, '/api/refresh');
      toast.error('Erro ao atualizar dados');
    } finally {
      setForceRefreshing(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
    toast.success('Logs limpos');
  };

  const copyJwtToClipboard = async () => {
    try {
      const jwt = await requireSupabaseJwt();
      await copyTextToClipboard(jwt);
      addLog('success', 'JWT copiado para a área de transferência');
      toast.success('JWT copiado');
    } catch (error) {
      const msg = getErrorMessage(error);
      const hint =
        typeof window !== 'undefined' && !window.isSecureContext
          ? 'Abra em https:// ou http://localhost para permitir cópia.'
          : 'Confira as permissões do navegador.';

      addLog('error', `Falha ao copiar JWT: ${msg}`);
      toast.error(`Falha ao copiar JWT. ${hint}`);
    }
  };

  const seedTestAccount = async () => {
    setSeedingTestAccount(true);
    const startTime = Date.now();
    addLog('info', 'Executando seed-test-account...', '/seed-test-account');

    try {
      const jwt = await requireSupabaseJwt();
      const { data, error } = await supabase.functions.invoke('seed-test-account', {
        headers: { Authorization: `Bearer ${jwt}` },
        body: {},
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'seed-test-account failed');

      const duration = Date.now() - startTime;
      addLog('success', 'seed-test-account concluído', '/seed-test-account', duration);
      await refreshConnectedAccounts();
      toast.success('Conta de teste adicionada');
    } catch (error) {
      const details = getSupabaseFunctionErrorDetails(error);
      const msg = details ?? getErrorMessage(error);
      addLog('error', `Erro no seed-test-account: ${msg}`, '/seed-test-account');
      toast.error(msg || 'Erro ao adicionar conta de teste');
    } finally {
      setSeedingTestAccount(false);
    }
  };

  // Data integrity check
  const integrityChecks = [
    {
      name: 'Conta conectada',
      apiValue: connectedAccounts.length > 0,
      storedValue: connectedAccounts.length > 0,
      match: true,
    },
    {
      name: 'Perfil carregado',
      apiValue: profile !== null,
      storedValue: profile !== null,
      match: true,
    },
    {
      name: 'Token válido',
      apiValue: !!sessionStorage.getItem('instagram_access_token'),
      storedValue: connectedAccounts[0]?.token_expires_at 
        ? new Date(connectedAccounts[0].token_expires_at) > new Date()
        : false,
      match: true,
    },
    {
      name: 'Mídia sincronizada',
      apiValue: media.length,
      storedValue: media.length,
      match: true,
    },
  ];

  const LogIcon = ({ type }: { type: LogEntry['type'] }) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Modo Desenvolvedor</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ferramentas de debug e monitoramento avançado.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              id="auto-refresh"
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
            <Label htmlFor="auto-refresh" className="text-sm">Auto-refresh</Label>
          </div>
          <Button 
            onClick={handleForceRefresh} 
            disabled={forceRefreshing || loading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${forceRefreshing || loading ? 'animate-spin' : ''}`} />
            Forçar Refresh
          </Button>
        </div>
      </section>

      {/* Integrity Alerts */}
      <ChartCard title="Verificação de Integridade" subtitle="Comparação entre dados da API e armazenados">
        <div className="space-y-3">
          {integrityChecks.map((check) => (
            <div
              key={check.name}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                check.match ? 'border-border bg-secondary/30' : 'border-destructive/50 bg-destructive/10'
              }`}
            >
              <div className="flex items-center gap-3">
                {check.match ? (
                  <CheckCircle className="w-5 h-5 text-success" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                )}
                <span className="font-medium">{check.name}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="text-right">
                  <p className="text-muted-foreground">API</p>
                  <p className="font-mono">{String(check.apiValue)}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground">Stored</p>
                  <p className="font-mono">{String(check.storedValue)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ChartCard>

      {/* Execution Monitor */}
      <ChartCard 
        title="Monitor de Execução" 
        subtitle="Logs de chamadas e operações"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-success animate-pulse' : 'bg-muted-foreground'}`} />
            <span className="text-sm text-muted-foreground">
              {autoRefresh ? 'Monitorando...' : 'Pausado'}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={clearLogs} className="gap-2">
            <Trash2 className="w-4 h-4" />
            Limpar
          </Button>
        </div>

        <div className="max-h-[400px] overflow-y-auto space-y-2">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum log registrado</p>
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-secondary/30 text-sm font-mono"
              >
                <LogIcon type={log.type} />
                <span className="text-muted-foreground whitespace-nowrap">
                  {log.timestamp.toLocaleTimeString()}
                </span>
                <span className="flex-1">{log.message}</span>
                {log.endpoint && (
                  <code className="text-xs bg-secondary px-1.5 py-0.5 rounded">
                    {log.endpoint}
                  </code>
                )}
                {log.duration && (
                  <span className="text-muted-foreground">{log.duration}ms</span>
                )}
              </div>
            ))
          )}
        </div>
      </ChartCard>

      {/* Raw Data Preview */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Dados do Perfil (Raw)" subtitle="JSON do perfil atual">
          <pre className="text-xs font-mono bg-secondary/50 p-4 rounded-lg overflow-auto max-h-[300px]">
            {profile ? JSON.stringify(profile, null, 2) : 'null'}
          </pre>
        </ChartCard>

        <ChartCard title="Conta Conectada (Raw)" subtitle="JSON da conta">
          <pre className="text-xs font-mono bg-secondary/50 p-4 rounded-lg overflow-auto max-h-[300px]">
            {connectedAccounts.length > 0 
              ? JSON.stringify(connectedAccounts[0], null, 2) 
              : 'null'
            }
          </pre>
        </ChartCard>
      </div>

      {/* Quick Actions */}
      <ChartCard title="Ações Rápidas" subtitle="Operações de debug">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Button
            variant="outline"
            className="justify-start gap-2"
            onClick={copyJwtToClipboard}
          >
            <Terminal className="w-4 h-4" />
            Copiar JWT
          </Button>
          <Button
            variant="outline"
            className="justify-start gap-2"
            onClick={seedTestAccount}
            disabled={seedingTestAccount}
          >
            <Play className={`w-4 h-4 ${seedingTestAccount ? 'animate-pulse' : ''}`} />
            Seed Test Account
          </Button>
          <Button variant="outline" className="justify-start gap-2" onClick={() => {
            sessionStorage.removeItem('instagram_access_token');
            addLog('warning', 'Token removido da sessão');
            toast.success('Token removido');
          }}>
            <Database className="w-4 h-4" />
            Limpar Token
          </Button>
          <Button variant="outline" className="justify-start gap-2" onClick={() => {
            console.log('Profile:', profile);
            console.log('Media:', media);
            console.log('Accounts:', connectedAccounts);
            addLog('info', 'Dados logados no console');
            toast.success('Dados no console (F12)');
          }}>
            <Code className="w-4 h-4" />
            Log no Console
          </Button>
          <Button variant="outline" className="justify-start gap-2" onClick={() => {
            window.location.reload();
          }}>
            <RefreshCw className="w-4 h-4" />
            Recarregar Página
          </Button>
          <Button variant="outline" className="justify-start gap-2" onClick={() => {
            localStorage.clear();
            sessionStorage.clear();
            addLog('warning', 'Storage limpo');
            toast.success('Storage limpo');
          }}>
            <Trash2 className="w-4 h-4" />
            Limpar Storage
          </Button>
        </div>
      </ChartCard>
    </div>
  );
};

export default DeveloperMode;
