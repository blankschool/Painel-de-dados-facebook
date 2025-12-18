import { useDashboardData } from '@/hooks/useDashboardData';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { 
  Users, 
  UserPlus, 
  UserMinus,
  TrendingUp,
  Loader2,
  AlertCircle
} from 'lucide-react';

const Growth = () => {
  const { data, loading, error } = useDashboardData();
  const profile = data?.profile ?? null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Check if we have real profile data
  const hasData = profile && profile.followers_count !== undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Crescimento</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Análise do crescimento de seguidores e variações no período.
          </p>
        </div>
      </section>

      {/* Growth KPIs - Show real data only */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total de Seguidores"
          value={hasData ? profile.followers_count?.toLocaleString() : '--'}
          icon={<Users className="w-4 h-4" />}
        />
        <MetricCard
          label="Seguindo"
          value={hasData && profile.follows_count ? profile.follows_count.toLocaleString() : '--'}
          icon={<UserPlus className="w-4 h-4" />}
        />
        <MetricCard
          label="Publicações"
          value={hasData && profile.media_count ? profile.media_count.toLocaleString() : '--'}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <MetricCard
          label="Taxa de Crescimento"
          value="--"
          icon={<TrendingUp className="w-4 h-4" />}
          tooltip="Dados históricos não disponíveis. O Instagram Graph API não fornece dados de crescimento diário."
        />
      </div>

      {/* Info Card */}
      <div className="chart-card p-6 flex flex-col items-center justify-center min-h-[300px]">
        <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Dados de crescimento indisponíveis</h3>
        <p className="text-sm text-muted-foreground text-center max-w-lg">
          O Instagram Graph API não fornece dados históricos de crescimento de seguidores (ganhos/perdas diários). 
          Apenas o total atual de seguidores está disponível.
        </p>
        <p className="text-sm text-muted-foreground text-center max-w-lg mt-2">
          Para acompanhar o crescimento, seria necessário salvar snapshots diários no banco de dados.
        </p>
        {error && (
          <p className="text-sm text-destructive mt-4">{error}</p>
        )}
      </div>

      {/* Profile Summary */}
      {hasData && (
        <ChartCard title="Resumo do Perfil" subtitle="Dados atuais do perfil">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Métrica</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-medium">Seguidores</td>
                  <td>{profile.followers_count?.toLocaleString() || '--'}</td>
                </tr>
                <tr>
                  <td className="font-medium">Seguindo</td>
                  <td>{profile.follows_count?.toLocaleString() || '--'}</td>
                </tr>
                <tr>
                  <td className="font-medium">Publicações</td>
                  <td>{profile.media_count?.toLocaleString() || '--'}</td>
                </tr>
                {profile.username && (
                  <tr>
                    <td className="font-medium">Username</td>
                    <td>@{profile.username}</td>
                  </tr>
                )}
                {profile.name && (
                  <tr>
                    <td className="font-medium">Nome</td>
                    <td>{profile.name}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}
    </div>
  );
};

export default Growth;
