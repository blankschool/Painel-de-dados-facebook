import { useInstagram } from '@/contexts/InstagramContext';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { 
  Users, 
  MapPin,
  Globe,
  User,
  Loader2
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const Demographics = () => {
  const { demographics, loading } = useInstagram();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Process age data from audience_gender_age
  const ageData = demographics.audience_gender_age 
    ? (() => {
        const ageGroups: Record<string, number> = {};
        Object.entries(demographics.audience_gender_age).forEach(([key, value]) => {
          const age = key.split('.')[1]; // e.g., "M.25-34" -> "25-34"
          if (age) {
            ageGroups[age] = (ageGroups[age] || 0) + (value as number);
          }
        });
        return Object.entries(ageGroups).map(([range, value]) => ({ range, value }));
      })()
    : [
        { range: '13-17', value: 5 },
        { range: '18-24', value: 28 },
        { range: '25-34', value: 35 },
        { range: '35-44', value: 18 },
        { range: '45-54', value: 9 },
        { range: '55-64', value: 4 },
        { range: '65+', value: 1 },
      ];

  // Process gender data from audience_gender_age
  const genderData = demographics.audience_gender_age 
    ? (() => {
        const genders: Record<string, number> = { M: 0, F: 0 };
        Object.entries(demographics.audience_gender_age).forEach(([key, value]) => {
          const gender = key.split('.')[0]; // e.g., "M.25-34" -> "M"
          if (gender === 'M' || gender === 'F') {
            genders[gender] += value as number;
          }
        });
        const total = genders.M + genders.F || 1;
        return [
          { name: 'Masculino', value: Math.round((genders.M / total) * 100), color: 'hsl(var(--primary))' },
          { name: 'Feminino', value: Math.round((genders.F / total) * 100), color: 'hsl(217, 91%, 60%)' },
        ];
      })()
    : [
        { name: 'Masculino', value: 45, color: 'hsl(var(--primary))' },
        { name: 'Feminino', value: 52, color: 'hsl(217, 91%, 60%)' },
        { name: 'Outro', value: 3, color: 'hsl(var(--muted-foreground))' },
      ];

  const countryData = demographics.audience_country 
    ? Object.entries(demographics.audience_country)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 10)
        .map(([country, value]) => ({ country, value: value as number }))
    : [
        { country: 'Brasil', value: 78 },
        { country: 'Portugal', value: 8 },
        { country: 'Estados Unidos', value: 5 },
        { country: 'Angola', value: 3 },
        { country: 'Moçambique', value: 2 },
        { country: 'Espanha', value: 1.5 },
        { country: 'França', value: 1 },
        { country: 'Outros', value: 1.5 },
      ];

  const cityData = demographics.audience_city 
    ? Object.entries(demographics.audience_city)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 10)
        .map(([city, value]) => ({ city, value: value as number }))
    : [
        { city: 'São Paulo', value: 25 },
        { city: 'Rio de Janeiro', value: 15 },
        { city: 'Belo Horizonte', value: 8 },
        { city: 'Brasília', value: 6 },
        { city: 'Salvador', value: 5 },
        { city: 'Curitiba', value: 4.5 },
        { city: 'Fortaleza', value: 4 },
        { city: 'Recife', value: 3.5 },
        { city: 'Porto Alegre', value: 3 },
        { city: 'Lisboa', value: 2.5 },
      ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Demografia</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Análise demográfica dos seus seguidores.
          </p>
        </div>
      </section>

      {/* Age Distribution */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Distribuição por Idade" subtitle="Faixa etária dos seguidores">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="range" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" unit="%" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value) => [`${value}%`, 'Percentual']}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Gender Distribution */}
        <ChartCard title="Distribuição por Gênero" subtitle="Gênero dos seguidores">
          <div className="h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {genderData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value) => [`${value}%`, 'Percentual']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6">
            {genderData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-muted-foreground">{entry.name}</span>
                <span className="font-medium">{entry.value}%</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Countries */}
      <ChartCard title="Top Países" subtitle="Localização geográfica dos seguidores">
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={countryData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" unit="%" />
              <YAxis dataKey="country" type="category" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" width={100} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value) => [`${value}%`, 'Percentual']}
              />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Cities */}
      <ChartCard title="Top Cidades" subtitle="Principais cidades dos seguidores">
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cityData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" unit="%" />
              <YAxis dataKey="city" type="category" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" width={100} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value) => [`${value}%`, 'Percentual']}
              />
              <Bar dataKey="value" fill="hsl(var(--muted-foreground))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="chart-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
              <User className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Faixa Principal</p>
              <p className="text-lg font-bold">25-34 anos</p>
            </div>
          </div>
        </div>
        <div className="chart-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
              <Users className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Gênero Dominante</p>
              <p className="text-lg font-bold">Feminino (52%)</p>
            </div>
          </div>
        </div>
        <div className="chart-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
              <Globe className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">País Principal</p>
              <p className="text-lg font-bold">Brasil (78%)</p>
            </div>
          </div>
        </div>
        <div className="chart-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
              <MapPin className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cidade Principal</p>
              <p className="text-lg font-bold">São Paulo</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Demographics;