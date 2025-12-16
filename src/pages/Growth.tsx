import { useInstagram } from '@/contexts/InstagramContext';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { 
  Users, 
  UserPlus, 
  UserMinus,
  TrendingUp,
  TrendingDown,
  Calendar,
  Loader2
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const Growth = () => {
  const { profile, loading } = useInstagram();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Mock data for growth charts (will be replaced with real insights API data)
  const dailyGrowthData = [
    { date: '01/12', followers: 10200, gained: 120, lost: 45 },
    { date: '02/12', followers: 10275, gained: 95, lost: 20 },
    { date: '03/12', followers: 10350, gained: 110, lost: 35 },
    { date: '04/12', followers: 10425, gained: 130, lost: 55 },
    { date: '05/12', followers: 10500, gained: 105, lost: 30 },
    { date: '06/12', followers: 10575, gained: 140, lost: 65 },
    { date: '07/12', followers: 10650, gained: 115, lost: 40 },
    { date: '08/12', followers: 10725, gained: 125, lost: 50 },
    { date: '09/12', followers: 10800, gained: 135, lost: 60 },
    { date: '10/12', followers: 10875, gained: 100, lost: 25 },
    { date: '11/12', followers: 10950, gained: 145, lost: 70 },
    { date: '12/12', followers: 11025, gained: 110, lost: 35 },
    { date: '13/12', followers: 11100, gained: 120, lost: 45 },
    { date: '14/12', followers: 11175, gained: 130, lost: 55 },
  ];

  const weeklyGrowthData = [
    { week: 'Sem 1', netGrowth: 350, avgDaily: 50 },
    { week: 'Sem 2', netGrowth: 420, avgDaily: 60 },
    { week: 'Sem 3', netGrowth: 385, avgDaily: 55 },
    { week: 'Sem 4', netGrowth: 490, avgDaily: 70 },
  ];

  const totalGained = dailyGrowthData.reduce((sum, d) => sum + d.gained, 0);
  const totalLost = dailyGrowthData.reduce((sum, d) => sum + d.lost, 0);
  const netGrowth = totalGained - totalLost;
  const growthRate = ((netGrowth / (dailyGrowthData[0]?.followers || 1)) * 100).toFixed(2);

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

      {/* Growth KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total de Seguidores"
          value={profile?.followers_count?.toLocaleString() || '0'}
          icon={<Users className="w-4 h-4" />}
        />
        <MetricCard
          label="Novos Seguidores"
          value={`+${totalGained.toLocaleString()}`}
          icon={<UserPlus className="w-4 h-4" />}
          delta={{ value: '+15%', positive: true }}
        />
        <MetricCard
          label="Seguidores Perdidos"
          value={`-${totalLost.toLocaleString()}`}
          icon={<UserMinus className="w-4 h-4" />}
          delta={{ value: '-5%', positive: true }}
        />
        <MetricCard
          label="Taxa de Crescimento"
          value={`${growthRate}%`}
          icon={<TrendingUp className="w-4 h-4" />}
          delta={{ value: netGrowth > 0 ? `+${netGrowth}` : `${netGrowth}`, positive: netGrowth > 0 }}
        />
      </div>

      {/* Main Growth Chart */}
      <ChartCard title="Evolução de Seguidores" subtitle="Últimos 14 dias">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyGrowthData}>
              <defs>
                <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" domain={['dataMin - 100', 'dataMax + 100']} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }} 
              />
              <Area 
                type="monotone" 
                dataKey="followers" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorGrowth)" 
                name="Seguidores"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Gained vs Lost */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Ganhos vs Perdas" subtitle="Comparativo diário">
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Legend />
                <Bar dataKey="gained" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Ganhos" />
                <Bar dataKey="lost" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Perdas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Crescimento Semanal" subtitle="Resumo por semana">
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyGrowthData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis dataKey="week" type="category" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" width={60} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Bar dataKey="netGrowth" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Crescimento Líquido" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Growth Summary Table */}
      <ChartCard title="Resumo do Período" subtitle="Detalhamento do crescimento">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Período</th>
                <th>Início</th>
                <th>Final</th>
                <th>Ganhos</th>
                <th>Perdas</th>
                <th>Líquido</th>
                <th>Variação</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-medium">Últimos 7 dias</td>
                <td>{dailyGrowthData[7]?.followers.toLocaleString()}</td>
                <td>{dailyGrowthData[13]?.followers.toLocaleString()}</td>
                <td className="text-success">+{dailyGrowthData.slice(7).reduce((s, d) => s + d.gained, 0)}</td>
                <td className="text-destructive">-{dailyGrowthData.slice(7).reduce((s, d) => s + d.lost, 0)}</td>
                <td className="font-semibold">+{dailyGrowthData.slice(7).reduce((s, d) => s + d.gained - d.lost, 0)}</td>
                <td>
                  <span className="tag tag-good">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    +4.2%
                  </span>
                </td>
              </tr>
              <tr>
                <td className="font-medium">Últimos 14 dias</td>
                <td>{dailyGrowthData[0]?.followers.toLocaleString()}</td>
                <td>{dailyGrowthData[13]?.followers.toLocaleString()}</td>
                <td className="text-success">+{totalGained}</td>
                <td className="text-destructive">-{totalLost}</td>
                <td className="font-semibold">+{netGrowth}</td>
                <td>
                  <span className="tag tag-good">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    +{growthRate}%
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
};

export default Growth;