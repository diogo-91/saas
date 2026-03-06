interface DateSeparatorProps {
  date: Date;
  label: string;
}

export function DateSeparator({ label }: DateSeparatorProps) {
  return (
    <div className="flex items-center justify-center my-3">
      <div className="bg-muted-foreground/20 text-muted-foreground text-xs font-medium px-3 py-1 rounded-full">
        {label}
      </div>
    </div>
  );
}
