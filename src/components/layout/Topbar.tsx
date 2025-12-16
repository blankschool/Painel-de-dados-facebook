import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAccount } from '@/contexts/AccountContext';
import { ExportDropdown } from '@/components/ExportDropdown';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from 'lucide-react';

const pageNames: Record<string, string> = {
  '/': 'Visão Geral',
  '/content': 'Conteúdo',
  '/audience': 'Audiência',
  '/profile': 'Perfil',
};

const periods = [
  { value: '7', label: 'Últimos 7 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
];

export function Topbar() {
  const location = useLocation();
  const { selectedAccount } = useAccount();
  const [selectedPeriod, setSelectedPeriod] = useState('30');

  const pageName = pageNames[location.pathname] || 'Dashboard';
  const username = selectedAccount?.account_username 
    ? `@${selectedAccount.account_username}` 
    : selectedAccount?.account_name || '';

  return (
    <header className="topbar">
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Profile + Page */}
          {username && (
            <div className="chip">
              {selectedAccount?.profile_picture_url ? (
                <img 
                  src={selectedAccount.profile_picture_url} 
                  alt="" 
                  className="h-7 w-7 rounded-full border border-border object-cover" 
                />
              ) : (
                <div className="h-7 w-7 rounded-full border border-border bg-secondary" />
              )}
              <span className="flex flex-col leading-tight">
                <b className="text-sm font-semibold">{username}</b>
                <small className="text-xs text-muted-foreground">{pageName}</small>
              </span>
            </div>
          )}

          {/* Period Selector */}
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[160px] h-9 text-sm">
              <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periods.map((period) => (
                <SelectItem key={period.value} value={period.value}>
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5">
          <ExportDropdown />
        </div>
      </div>
    </header>
  );
}
