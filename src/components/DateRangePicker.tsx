import * as React from "react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DateRangePickerProps {
  date: DateRange | undefined;
  onDateChange: (date: DateRange | undefined) => void;
  className?: string;
}

const presets = [
  { label: "Últimos 7 dias", days: 7 },
  { label: "Últimos 30 dias", days: 30 },
  { label: "Últimos 90 dias", days: 90 },
];

export function DateRangePicker({
  date,
  onDateChange,
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handlePresetSelect = (days: string) => {
    const daysNum = parseInt(days);
    const today = startOfDay(new Date());
    const yesterday = subDays(today, 1);
    const to = endOfDay(yesterday);  // End at yesterday (last complete day)
    const from = startOfDay(subDays(yesterday, daysNum - 1));
    onDateChange({ from, to });
    setIsOpen(false);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Select onValueChange={handlePresetSelect}>
        <SelectTrigger className="h-8 w-[140px] text-xs">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          {presets.map((preset) => (
            <SelectItem key={preset.days} value={preset.days.toString()}>
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8 justify-start text-left font-normal text-xs",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "dd MMM", { locale: ptBR })} -{" "}
                  {format(date.to, "dd MMM yyyy", { locale: ptBR })}
                </>
              ) : (
                format(date.from, "dd MMM yyyy", { locale: ptBR })
              )
            ) : (
              <span>Selecionar período</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={(newDate) => {
              onDateChange(newDate);
              if (newDate?.from && newDate?.to) {
                setIsOpen(false);
              }
            }}
            numberOfMonths={2}
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
