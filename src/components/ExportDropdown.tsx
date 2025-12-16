import { useState } from 'react';
import { Download, FileJson, FileText, FileSpreadsheet, File, Loader2, FileType } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAccount } from '@/contexts/AccountContext';
import { toast } from 'sonner';

type ExportFormat = 'json' | 'csv' | 'ndjson' | 'markdown' | 'txt' | 'pdf';

const formatOptions: { value: ExportFormat; label: string; icon: typeof FileJson; description: string }[] = [
  { value: 'json', label: 'JSON', icon: FileJson, description: 'For developers/AI' },
  { value: 'csv', label: 'CSV Pack', icon: FileSpreadsheet, description: 'Spreadsheet format' },
  { value: 'ndjson', label: 'NDJSON', icon: FileText, description: 'For fine-tuning' },
  { value: 'markdown', label: 'Markdown Report', icon: File, description: 'Formatted report' },
  { value: 'txt', label: 'AI Prompt Ready', icon: FileText, description: 'Ready for AI analysis' },
  { value: 'pdf', label: 'PDF Report', icon: FileType, description: 'Printable document' },
];

export function ExportDropdown() {
  const [exporting, setExporting] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const { selectedAccountId } = useAccount();

  const handleExport = async (format: ExportFormat) => {
    if (!selectedAccountId) {
      toast.error('No account selected');
      return;
    }

    setExporting(true);
    setExportingFormat(format);
    toast.info('Exporting...');

    try {
      const { data, error } = await supabase.functions.invoke('export-insights', {
        body: { format, accountId: selectedAccountId },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      // Handle CSV pack specially - it returns JSON with multiple CSVs
      if (format === 'csv') {
        const csvData = JSON.parse(data.data);
        const files = [
          { name: 'profile_insights.csv', content: csvData.profile_insights },
          { name: 'posts.csv', content: csvData.posts },
          { name: 'stories.csv', content: csvData.stories },
        ];

        // Download each file
        files.forEach(file => {
          const blob = new Blob([file.content], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = file.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        });
      } else if (format === 'pdf') {
        // PDF is base64 encoded
        const byteCharacters = atob(data.data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Single file download
        const blob = new Blob([data.data], { type: data.contentType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      toast.success('Export complete!');
    } catch (err: any) {
      console.error('Export error:', err);
      toast.error(err.message || 'Export failed');
    } finally {
      setExporting(false);
      setExportingFormat(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={exporting || !selectedAccountId}>
          {exporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Export Format</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {formatOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handleExport(option.value)}
            disabled={exporting}
            className="flex items-center gap-3 cursor-pointer"
          >
            {exportingFormat === option.value ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <option.icon className="h-4 w-4" />
            )}
            <div className="flex flex-col">
              <span className="font-medium">{option.label}</span>
              <span className="text-xs text-muted-foreground">{option.description}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
