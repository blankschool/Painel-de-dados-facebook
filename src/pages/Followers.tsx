import { useMemo, useState } from "react";
import { FiltersBar } from "@/components/layout/FiltersBar";
import { useDashboardData } from "@/hooks/useDashboardData";
import { BrazilMap } from "@/components/dashboard/BrazilMap";
import { SortToggle, SortOrder } from "@/components/ui/SortToggle";
import { Users, UserPlus, MapPin, Calendar } from "lucide-react";
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
  Cell,
} from "recharts";

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
  padding: "12px",
};

const GENDER_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
];

export default function Followers() {
  const { data, loading, error } = useDashboardData();
  const demographics = (data?.demographics as Record<string, Record<string, number>> | undefined) ?? {};
  const profile = data?.profile;
  const followersCount = profile?.followers_count ?? 0;
  const followsCount = profile?.follows_count ?? 0;

  // Sort order states
  const [ageSortOrder, setAgeSortOrder] = useState<SortOrder>("desc");
  const [countrySortOrder, setCountrySortOrder] = useState<SortOrder>("desc");
  const [citySortOrder, setCitySortOrder] = useState<SortOrder>("desc");
  const [genderSortOrder, setGenderSortOrder] = useState<SortOrder>("desc");

  // Debug: Log demographics data
  console.log("[Followers] Demographics:", demographics);

  // Parse Age Groups - try multiple possible API formats
  const ageGroups = useMemo(() => {
    // Try audience_gender_age first (format: "M.25-34", "F.18-24", etc.)
    if (demographics.audience_gender_age && Object.keys(demographics.audience_gender_age).length > 0) {
      const out: Record<string, number> = {};
      Object.entries(demographics.audience_gender_age).forEach(([key, value]) => {
        const age = key.split(".")[1];
        if (age) out[age] = (out[age] || 0) + value;
      });
      
      let result = Object.entries(out).map(([range, value]) => ({
        range,
        value,
        percentage: followersCount > 0 ? ((value / followersCount) * 100) : 0,
      }));
      
      // Sort based on user preference
      if (ageSortOrder === "desc") {
        result.sort((a, b) => b.value - a.value);
      } else {
        result.sort((a, b) => a.value - b.value);
      }
      
      console.log("[Followers] Age groups from gender_age:", result);
      return result;
    }
    
    // Try audience_age (format: "25-34": 1234)
    if (demographics.audience_age && Object.keys(demographics.audience_age).length > 0) {
      let result = Object.entries(demographics.audience_age).map(([range, value]) => ({
        range,
        value: Number(value) || 0,
        percentage: followersCount > 0 ? ((Number(value) || 0) / followersCount) * 100 : 0,
      }));
      
      if (ageSortOrder === "desc") {
        result.sort((a, b) => b.value - a.value);
      } else {
        result.sort((a, b) => a.value - b.value);
      }
      
      console.log("[Followers] Age groups from audience_age:", result);
      return result;
    }
    
    console.log("[Followers] No age data found");
    return [];
  }, [demographics.audience_gender_age, demographics.audience_age, followersCount, ageSortOrder]);

  // Parse Countries
  const countries = useMemo(() => {
    if (!demographics.audience_country || Object.keys(demographics.audience_country).length === 0) return [];
    
    let result = Object.entries(demographics.audience_country)
      .map(([key, value]) => ({ 
        key, 
        value,
        percentage: followersCount > 0 ? (value / followersCount) * 100 : 0,
      }));
    
    if (countrySortOrder === "desc") {
      result.sort((a, b) => b.value - a.value);
    } else {
      result.sort((a, b) => a.value - b.value);
    }
    
    return result.slice(0, 10);
  }, [demographics.audience_country, followersCount, countrySortOrder]);

  // Parse Cities
  const cities = useMemo(() => {
    if (!demographics.audience_city || Object.keys(demographics.audience_city).length === 0) return [];
    
    let result = Object.entries(demographics.audience_city)
      .map(([key, value]) => ({ 
        key, 
        value,
        percentage: followersCount > 0 ? (value / followersCount) * 100 : 0,
      }));
    
    if (citySortOrder === "desc") {
      result.sort((a, b) => b.value - a.value);
    } else {
      result.sort((a, b) => a.value - b.value);
    }
    
    return result.slice(0, 10);
  }, [demographics.audience_city, followersCount, citySortOrder]);

  // Parse Genders
  const genders = useMemo(() => {
    const genderLabels: Record<string, string> = {
      "M": "Masculino",
      "F": "Feminino",
      "U": "Não informado",
      "male": "Masculino",
      "female": "Feminino",
      "unknown": "Não informado",
    };
    
    // Try audience_gender_age first
    if (demographics.audience_gender_age && Object.keys(demographics.audience_gender_age).length > 0) {
      const genderTotals: Record<string, number> = {};
      Object.entries(demographics.audience_gender_age).forEach(([key, value]) => {
        const gender = key.split(".")[0];
        const label = genderLabels[gender] || gender;
        genderTotals[label] = (genderTotals[label] || 0) + value;
      });
      
      let result = Object.entries(genderTotals).map(([key, value]) => ({
        key,
        value,
        percentage: followersCount > 0 ? (value / followersCount) * 100 : 0,
      }));
      
      if (genderSortOrder === "desc") {
        result.sort((a, b) => b.value - a.value);
      } else {
        result.sort((a, b) => a.value - b.value);
      }
      
      return result;
    }
    
    // Try audience_gender
    if (demographics.audience_gender && Object.keys(demographics.audience_gender).length > 0) {
      let result = Object.entries(demographics.audience_gender).map(([gender, value]) => ({
        key: genderLabels[gender] || gender,
        value: Number(value) || 0,
        percentage: followersCount > 0 ? ((Number(value) || 0) / followersCount) * 100 : 0,
      }));
      
      if (genderSortOrder === "desc") {
        result.sort((a, b) => b.value - a.value);
      } else {
        result.sort((a, b) => a.value - b.value);
      }
      
      return result;
    }
    
    return [];
  }, [demographics.audience_gender_age, demographics.audience_gender, followersCount, genderSortOrder]);

  // Get state-level data for Brazil map
  const stateData = useMemo(() => {
    const brazilianStates: Record<string, number> = {};
    
    if (demographics.audience_city) {
      Object.entries(demographics.audience_city).forEach(([cityKey, value]) => {
        const parts = cityKey.split(",").map((s) => s.trim());
        if (parts.length >= 2) {
          const state = parts[parts.length - 1];
          brazilianStates[state] = (brazilianStates[state] || 0) + value;
        } else {
          const cityStateMap: Record<string, string> = {
            "São Paulo": "São Paulo",
            "Rio de Janeiro": "Rio de Janeiro",
            "Brasília": "Distrito Federal",
            "Salvador": "Bahia",
            "Fortaleza": "Ceará",
            "Belo Horizonte": "Minas Gerais",
            "Manaus": "Amazonas",
            "Curitiba": "Paraná",
            "Recife": "Pernambuco",
            "Porto Alegre": "Rio Grande do Sul",
            "Goiânia": "Goiás",
            "Belém": "Pará",
            "Guarulhos": "São Paulo",
            "Campinas": "São Paulo",
            "São Luís": "Maranhão",
            "Maceió": "Alagoas",
            "Natal": "Rio Grande do Norte",
            "João Pessoa": "Paraíba",
            "Teresina": "Piauí",
            "Campo Grande": "Mato Grosso do Sul",
            "Cuiabá": "Mato Grosso",
            "Florianópolis": "Santa Catarina",
            "Vitória": "Espírito Santo",
            "Aracaju": "Sergipe",
            "Palmas": "Tocantins",
            "Porto Velho": "Rondônia",
            "Macapá": "Amapá",
            "Boa Vista": "Roraima",
            "Rio Branco": "Acre",
          };
          const state = cityStateMap[cityKey];
          if (state) {
            brazilianStates[state] = (brazilianStates[state] || 0) + value;
          }
        }
      });
    }

    return brazilianStates;
  }, [demographics.audience_city]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="h-10 w-full bg-secondary rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-secondary rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-64 bg-secondary rounded-lg animate-pulse" />
          <div className="lg:col-span-2 h-64 bg-secondary rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  const maxAgeValue = Math.max(...ageGroups.map(d => d.value), 1);

  return (
    <>
      <FiltersBar />

      <div className="content-area space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="metrics-card">
            <div className="metric-icon blue">
              <Users className="w-6 h-6" />
            </div>
            <div className="metric-group">
              <div className="metric-item">
                <span className="metric-label">Followers</span>
                <span className="metric-value">{followersCount.toLocaleString("pt-BR")}</span>
              </div>
            </div>
          </div>
          <div className="metrics-card">
            <div className="metric-icon blue">
              <UserPlus className="w-6 h-6" />
            </div>
            <div className="metric-group">
              <div className="metric-item">
                <span className="metric-label">Following</span>
                <span className="metric-value">{followsCount.toLocaleString("pt-BR")}</span>
              </div>
            </div>
          </div>
          <div className="metrics-card">
            <div className="metric-icon blue">
              <MapPin className="w-6 h-6" />
            </div>
            <div className="metric-group">
              <div className="metric-item">
                <span className="metric-label">Top País</span>
                <span className="metric-value">{countries[0]?.key || "-"}</span>
              </div>
            </div>
          </div>
          <div className="metrics-card">
            <div className="metric-icon blue">
              <Calendar className="w-6 h-6" />
            </div>
            <div className="metric-group">
              <div className="metric-item">
                <span className="metric-label">Faixa Principal</span>
                <span className="metric-value">{ageGroups[0]?.range || "-"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Age Group + Gender Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Followers By Age Group */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="card-title">Followers By Age Group</h3>
              <SortToggle
                sortOrder={ageSortOrder}
                onToggle={() => setAgeSortOrder(o => o === "desc" ? "asc" : "desc")}
              />
            </div>
            <div className="h-56">
              {ageGroups.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ageGroups} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="range"
                      tick={{ fontSize: 11 }}
                      stroke="hsl(var(--muted-foreground))"
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      stroke="hsl(var(--muted-foreground))"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelStyle={{ fontWeight: 600, marginBottom: "4px", color: "hsl(var(--foreground))" }}
                      formatter={(value: number, _, props) => {
                        const percentage = props.payload?.percentage?.toFixed(1) || "0";
                        return [
                          <span key="value">
                            {value.toLocaleString("pt-BR")} <span className="text-muted-foreground">({percentage}%)</span>
                          </span>,
                          "Followers",
                        ];
                      }}
                      labelFormatter={(label) => `Faixa etária: ${label}`}
                      cursor={{ fill: "hsl(var(--accent))", opacity: 0.3 }}
                    />
                    <Bar
                      dataKey="value"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Users className="w-10 h-10 mb-2 opacity-50" />
                  <p className="text-sm font-medium">Dados de faixa etária não disponíveis</p>
                  <p className="text-xs mt-1 text-center max-w-xs">
                    A conta pode não ter seguidores suficientes (mínimo 100) ou as permissões necessárias.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Gender Distribution */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="card-title">Gender Distribution</h3>
              <SortToggle
                sortOrder={genderSortOrder}
                onToggle={() => setGenderSortOrder(o => o === "desc" ? "asc" : "desc")}
              />
            </div>
            <div className="h-56">
              {genders.length > 0 ? (
                <div className="flex items-center gap-6 h-full">
                  <div className="w-40 h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={genders}
                          cx="50%"
                          cy="50%"
                          innerRadius={35}
                          outerRadius={65}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {genders.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={GENDER_COLORS[index % GENDER_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={tooltipStyle}
                          formatter={(value: number, name) => [
                            `${value.toLocaleString("pt-BR")} (${((value / followersCount) * 100).toFixed(1)}%)`,
                            name,
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-3">
                    {genders.map((item, index) => (
                      <div key={item.key} className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: GENDER_COLORS[index % GENDER_COLORS.length] }} 
                        />
                        <span className="text-sm">{item.key}</span>
                        <span className="ml-auto text-sm font-medium">
                          {item.percentage.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Users className="w-10 h-10 mb-2 opacity-50" />
                  <p className="text-sm font-medium">Dados de gênero não disponíveis</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Location Map */}
        <div className="card">
          <div className="chart-header">
            <h3 className="card-title">Followers By Location</h3>
          </div>
          <BrazilMap data={stateData} total={followersCount} />
        </div>

        {/* Country + City Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Country Table */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="card-title">Followers By Country</h3>
              <SortToggle
                sortOrder={countrySortOrder}
                onToggle={() => setCountrySortOrder(o => o === "desc" ? "asc" : "desc")}
              />
            </div>
            {countries.length > 0 ? (
              <div className="space-y-2">
                {countries.map((row, idx) => (
                  <div key={row.key} className="flex items-center gap-3 py-1.5">
                    <span className="text-xs text-muted-foreground w-5">{idx + 1}.</span>
                    <span className="text-sm flex-1 truncate">{row.key}</span>
                    <span className="text-sm font-medium w-20 text-right">
                      {row.value.toLocaleString("pt-BR")}
                    </span>
                    <div className="w-24 h-2 bg-secondary rounded overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded" 
                        style={{ width: `${(row.value / (countries[0]?.value || 1)) * 100}%` }} 
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-12 text-right">
                      {row.percentage.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <MapPin className="w-5 h-5 mr-2 opacity-50" />
                <p className="text-sm">Dados de localização não disponíveis</p>
              </div>
            )}
          </div>

          {/* City Table */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="card-title">Followers By City</h3>
              <SortToggle
                sortOrder={citySortOrder}
                onToggle={() => setCitySortOrder(o => o === "desc" ? "asc" : "desc")}
              />
            </div>
            {cities.length > 0 ? (
              <div className="space-y-2">
                {cities.map((row, idx) => (
                  <div key={row.key} className="flex items-center gap-3 py-1.5">
                    <span className="text-xs text-muted-foreground w-5">{idx + 1}.</span>
                    <span className="text-sm flex-1 truncate">{row.key}</span>
                    <span className="text-sm font-medium w-20 text-right">
                      {row.value.toLocaleString("pt-BR")}
                    </span>
                    <div className="w-24 h-2 bg-secondary rounded overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded" 
                        style={{ width: `${(row.value / (cities[0]?.value || 1)) * 100}%` }} 
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-12 text-right">
                      {row.percentage.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <MapPin className="w-5 h-5 mr-2 opacity-50" />
                <p className="text-sm">Dados de cidade não disponíveis</p>
              </div>
            )}
          </div>
        </div>

        {/* Full Demographics Table */}
        <div className="card">
          <h3 className="card-title mb-4">Follower Demographics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Country Column */}
            <div>
              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground pb-2 border-b border-border">
                <span>Country</span>
                <span>Followers</span>
                <span>%</span>
              </div>
              <div className="space-y-2 mt-2 text-sm">
                {countries.length > 0 ? (
                  countries.slice(0, 7).map((row) => (
                    <div key={row.key} className="grid grid-cols-3 gap-2 items-center">
                      <span className="truncate">{row.key}</span>
                      <span>{row.value.toLocaleString("pt-BR")}</span>
                      <span>{row.percentage.toFixed(1)}%</span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-xs py-2">Sem dados</p>
                )}
              </div>
            </div>

            {/* City Column */}
            <div>
              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground pb-2 border-b border-border">
                <span>City</span>
                <span>Followers</span>
                <span>%</span>
              </div>
              <div className="space-y-2 mt-2 text-sm">
                {cities.length > 0 ? (
                  cities.slice(0, 7).map((row) => (
                    <div key={row.key} className="grid grid-cols-3 gap-2 items-center">
                      <span className="truncate">{row.key}</span>
                      <span>{row.value.toLocaleString("pt-BR")}</span>
                      <span>{row.percentage.toFixed(1)}%</span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-xs py-2">Sem dados</p>
                )}
              </div>
            </div>

            {/* Age Column */}
            <div>
              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground pb-2 border-b border-border">
                <span>Age</span>
                <span>Followers</span>
                <span>%</span>
              </div>
              <div className="space-y-2 mt-2 text-sm">
                {ageGroups.length > 0 ? (
                  ageGroups.map((row) => (
                    <div key={row.range} className="grid grid-cols-3 gap-2 items-center">
                      <span>{row.range}</span>
                      <span>{row.value.toLocaleString("pt-BR")}</span>
                      <span>{row.percentage.toFixed(1)}%</span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-xs py-2">Sem dados</p>
                )}
              </div>
            </div>

            {/* Gender Column */}
            <div>
              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground pb-2 border-b border-border">
                <span>Gender</span>
                <span>Followers</span>
                <span>%</span>
              </div>
              <div className="space-y-2 mt-2 text-sm">
                {genders.length > 0 ? (
                  genders.map((row) => (
                    <div key={row.key} className="grid grid-cols-3 gap-2 items-center">
                      <span>{row.key}</span>
                      <span>{row.value.toLocaleString("pt-BR")}</span>
                      <span>{row.percentage.toFixed(1)}%</span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-xs py-2">Sem dados</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 text-destructive">
            {error}
          </div>
        )}
      </div>
    </>
  );
}
