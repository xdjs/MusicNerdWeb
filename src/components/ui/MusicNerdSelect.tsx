'use client';

import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import styles from './MusicNerdSelect.module.css';

type Props = {
  label: string;
  options: { value: string; label: string }[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
  'aria-describedby'?: string;
};

/** The interview menu treatment, shared by review filters and correction forms. */
export default function MusicNerdSelect({label, options, value, defaultValue = '', onValueChange, name, id, disabled, className, 'aria-describedby': describedBy}: Props) {
  const [selected, setSelected] = useState(defaultValue);
  const current = value ?? selected;
  // Radix reserves an empty value for its placeholder; option indexes preserve empty form values.
  const index = options.findIndex(option => option.value === current);
  return <>
    {name && <input type="hidden" name={name} value={current} disabled={disabled} />}
    <Select value={index < 0 ? '' : String(index)} disabled={disabled} onValueChange={next => {
      const option = options[Number(next)];
      if (!option) return;
      setSelected(option.value);
      onValueChange?.(option.value);
    }}>
      <SelectTrigger id={id} aria-label={label} aria-describedby={describedBy} className={cn('min-h-11 rounded-xl border-input bg-black/[0.03] text-foreground dark:border-white/20 dark:bg-white/5 focus:ring-inset focus:ring-pastypink focus:ring-offset-0', className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className={styles.menu}>
        {options.map((option, optionIndex) => <SelectItem key={option.value} value={String(optionIndex)} className={styles.option}>{option.label}</SelectItem>)}
      </SelectContent>
    </Select>
  </>;
}
