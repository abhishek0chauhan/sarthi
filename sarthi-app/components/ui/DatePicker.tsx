import { useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, FlatList } from 'react-native';
import { useColors } from '@/hooks/useColorScheme';
import type { Colors } from '@/constants/colors';
import { type } from '@/constants/typography';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function parseDate(val: string): { year: number; month: number; day: number } {
  const d = new Date(val);
  if (!isNaN(d.getTime())) return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

interface DatePickerProps {
  label: string;
  value: string;
  onChange: (date: string) => void;
  minDate?: string;
}

export function DatePicker({ label, value, onChange, minDate }: DatePickerProps) {
  const colors = useColors();
  const styles = makeStyles(colors);
  const [open, setOpen] = useState(false);

  const parsed = parseDate(value || formatDate(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()));
  const [year, setYear] = useState(parsed.year);
  const [month, setMonth] = useState(parsed.month);

  const minParsed = minDate ? parseDate(minDate) : null;
  const today = new Date();
  const currentYear = today.getFullYear();

  const totalDays = daysInMonth(year, month);
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const isDisabled = (d: number) => {
    if (!minParsed) return false;
    const sel = new Date(year, month, d);
    const min = new Date(minParsed.year, minParsed.month, minParsed.day);
    return sel < min;
  };

  const displayValue = value
    ? (() => { const p = parseDate(value); return `${p.day} ${MONTHS[p.month]} ${p.year}`; })()
    : 'Select date';

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const select = (day: number) => {
    if (isDisabled(day)) return;
    onChange(formatDate(year, month, day));
    setOpen(false);
  };

  const years = Array.from({ length: 3 }, (_, i) => currentYear + i);

  // Build calendar grid with empty slots for alignment
  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  // pad to full rows
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedDay = value ? parseDate(value).day : null;
  const selectedMonth = value ? parseDate(value).month : null;
  const selectedYear = value ? parseDate(value).year : null;

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={styles.trigger}>
        {label ? <Text style={styles.label}>{label.toUpperCase()}</Text> : null}
        <View style={styles.input}>
          <Text style={[styles.inputText, !value && styles.placeholder]}>{displayValue}</Text>
          <Text style={styles.calIcon}>📅</Text>
        </View>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>

            {/* Year row */}
            <View style={styles.yearRow}>
              {years.map(y => (
                <Pressable
                  key={y}
                  onPress={() => setYear(y)}
                  style={[styles.yearBtn, year === y && styles.yearBtnActive]}
                >
                  <Text style={[styles.yearText, year === y && styles.yearTextActive]}>{y}</Text>
                </Pressable>
              ))}
            </View>

            {/* Month nav */}
            <View style={styles.monthRow}>
              <Pressable onPress={prevMonth} style={styles.navBtn}>
                <Text style={styles.navBtnText}>‹</Text>
              </Pressable>
              <Text style={styles.monthTitle}>{MONTH_FULL[month]} {year}</Text>
              <Pressable onPress={nextMonth} style={styles.navBtn}>
                <Text style={styles.navBtnText}>›</Text>
              </Pressable>
            </View>

            {/* Day names */}
            <View style={styles.dayNames}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <Text key={d} style={styles.dayName}>{d}</Text>
              ))}
            </View>

            {/* Grid */}
            <View style={styles.grid}>
              {cells.map((day, i) => {
                if (!day) return <View key={i} style={styles.cell} />;
                const disabled = isDisabled(day);
                const isSelected = day === selectedDay && month === selectedMonth && year === selectedYear;
                return (
                  <Pressable
                    key={i}
                    onPress={() => select(day)}
                    style={[styles.cell, isSelected && styles.cellSelected, disabled && styles.cellDisabled]}
                  >
                    <Text style={[styles.cellText, isSelected && styles.cellTextSelected, disabled && styles.cellTextDisabled]}>
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function makeStyles(colors: Colors) {
  const CELL = 40;
  return StyleSheet.create({
    trigger: { gap: 6 },
    label: { ...type.overline, color: colors.textSecondary },
    input: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgCard,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    inputText: { flex: 1, ...type.body, color: colors.textPrimary },
    placeholder: { color: colors.textTertiary },
    calIcon: { fontSize: 16 },

    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    sheet: {
      width: '100%',
      backgroundColor: colors.bgCard,
      borderRadius: 20,
      padding: 20,
      gap: 12,
    },

    yearRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
    yearBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
    yearBtnActive: { backgroundColor: colors.primary500, borderColor: colors.primary500 },
    yearText: { ...type.body, color: colors.textSecondary },
    yearTextActive: { color: '#fff', fontFamily: 'Inter_600SemiBold' },

    monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    navBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.bgBase },
    navBtnText: { fontSize: 22, color: colors.textPrimary, lineHeight: 26 },
    monthTitle: { ...type.cardHeading, color: colors.textPrimary },

    dayNames: { flexDirection: 'row' },
    dayName: { width: `${100 / 7}%`, textAlign: 'center', ...type.caption, color: colors.textTertiary, fontFamily: 'Inter_600SemiBold' },

    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: { width: `${100 / 7}%`, height: CELL, alignItems: 'center', justifyContent: 'center' },
    cellSelected: { backgroundColor: colors.primary500, borderRadius: 20 },
    cellDisabled: { opacity: 0.25 },
    cellText: { ...type.body, color: colors.textPrimary },
    cellTextSelected: { color: '#fff', fontFamily: 'Inter_600SemiBold' },
    cellTextDisabled: { color: colors.textTertiary },
  });
}
