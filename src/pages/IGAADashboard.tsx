import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, FileText, Heart, MessageCircle, TrendingUp, Instagram, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function IGAADashboard() {
  const { user, connectedAccounts, selectedAccount } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: responseData, error: invokeError } = await supabase.functions.invoke('igaa-dashboard', {
        body: {
          accountId: selectedAccount?.id,
        },
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (!responseData.success) {
        if (responseData.use_regular_dashboard) {
          toast({
            title: 'Token EAA Detectado',
            description: 'Esta conta usa token Facebook (EAA). Redirecionando para o dashboard principal...',
          });
          navigate('/overview');
          return;
        }
        throw new Error(responseData.error || 'Failed to fetch dashboard data');
      }

      setData(responseData);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      toast({
        title: 'Erro ao carregar dados',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && selectedAccount) {
      fetchDashboardData();
    }
  }, [user, selectedAccount]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Carregando dashboard IGAA...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Erro</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button onClick={fetchDashboardData} className="w-full">
                Tentar Novamente
              </Button>
              <Button variant="outline" onClick={() => navigate('/connect')} className="w-full">
                Gerenciar Contas
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { profile, media, summary } = data;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/overview')}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div className="flex items-center gap-2">
              <Instagram className="h-6 w-6" />
              <span className="text-sm font-semibold bg-white/20 px-2 py-1 rounded">IGAA Token</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {profile.profile_picture_url ? (
              <img
                src={profile.profile_picture_url}
                alt={profile.username}
                className="w-20 h-20 rounded-full border-4 border-white"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
                <Instagram className="h-10 w-10" />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-bold">@{profile.username}</h1>
              {profile.name && <p className="text-white/90">{profile.name}</p>}
              {profile.biography && (
                <p className="text-sm text-white/80 mt-1 max-w-2xl">{profile.biography}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                Seguidores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{profile.followers_count?.toLocaleString() || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-500" />
                Posts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{profile.media_count?.toLocaleString() || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-500" />
                Curtidas Médias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.avg_likes.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">nos últimos {summary.total_posts} posts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-green-500" />
                Comentários Médios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.avg_comments.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">nos últimos {summary.total_posts} posts</p>
            </CardContent>
          </Card>
        </div>

        {/* Info Banner */}
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900 dark:text-blue-100">
                  Dashboard para Tokens IGAA (Instagram Business Login)
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Este dashboard exibe dados básicos disponíveis para tokens IGAA. Insights avançados podem estar limitados
                  enquanto o app está em modo de desenvolvimento.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Media Grid */}
        <Card>
          <CardHeader>
            <CardTitle>Posts Recentes</CardTitle>
            <CardDescription>Últimos {media.length} posts da sua conta</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {media.map((item: any) => (
                <Card key={item.id} className="overflow-hidden">
                  {item.media_type === 'IMAGE' || item.media_type === 'CAROUSEL_ALBUM' ? (
                    <img
                      src={item.media_url || item.thumbnail_url}
                      alt={item.caption?.substring(0, 50) || 'Post'}
                      className="w-full h-48 object-cover"
                    />
                  ) : item.media_type === 'VIDEO' ? (
                    <div className="relative w-full h-48 bg-secondary">
                      {item.thumbnail_url ? (
                        <img
                          src={item.thumbnail_url}
                          alt={item.caption?.substring(0, 50) || 'Video'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileText className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                        VIDEO
                      </div>
                    </div>
                  ) : null}

                  <CardContent className="p-4">
                    {item.caption && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {item.caption}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {item.like_count?.toLocaleString() || 0}
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {item.comments_count?.toLocaleString() || 0}
                      </div>
                    </div>

                    {item.insights && Object.keys(item.insights).length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Insights:</p>
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          {item.insights.impressions && (
                            <div>Impressões: {item.insights.impressions.toLocaleString()}</div>
                          )}
                          {item.insights.reach && (
                            <div>Alcance: {item.insights.reach.toLocaleString()}</div>
                          )}
                          {item.insights.engagement && (
                            <div>Engajamento: {item.insights.engagement.toLocaleString()}</div>
                          )}
                          {item.insights.saved && (
                            <div>Salvos: {item.insights.saved.toLocaleString()}</div>
                          )}
                        </div>
                      </div>
                    )}

                    {item.permalink && (
                      <a
                        href={item.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline mt-2 block"
                      >
                        Ver no Instagram →
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {media.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum post encontrado</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Metadata */}
        {data._metadata && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Informações Técnicas</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1">
              <p>Tipo de Token: IGAA (Instagram Business Login)</p>
              <p>Tempo de carregamento: {data._metadata.duration_ms}ms</p>
              <p>Posts carregados: {data._metadata.media_fetched}</p>
              <p>Posts com insights: {data._metadata.insights_fetched}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
