import { AlertCircle, Clock, Camera, Users } from 'lucide-react';

interface DataAlertsProps {
  messages?: string[];
  showPostsWarning?: boolean;
  showStoriesWarning?: boolean;
  showDemographicsWarning?: boolean;
}

export function DataAlerts({ 
  messages = [], 
  showPostsWarning = false,
  showStoriesWarning = false,
  showDemographicsWarning = false,
}: DataAlertsProps) {
  const alerts = [
    ...messages.map(msg => ({ icon: AlertCircle, text: msg })),
    showPostsWarning && { icon: Clock, text: 'Insights de posts aparecem após 24-48h de publicação.' },
    showStoriesWarning && { icon: Camera, text: 'Stories só mostram métricas enquanto ativas (24h).' },
    showDemographicsWarning && { icon: Users, text: 'Demographics requer 100+ seguidores no período.' },
  ].filter(Boolean) as { icon: typeof AlertCircle; text: string }[];

  if (alerts.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
      {alerts.map((alert, index) => (
        <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
          <alert.icon className="w-4 h-4 shrink-0" />
          <span>{alert.text}</span>
        </div>
      ))}
    </div>
  );
}
