import React, { useState, useMemo } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, spacing } from '../theme/colors';

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const pad = (n) => String(n).padStart(2, '0');

const parseDateString = (str) => {
  if (!str) return null;
  const parts = String(str).split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return { year: y, month: m, day: d };
    }
  }
  return null;
};

const formatDate = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

/**
 * Reusable Date Picker component with a visual calendar popup.
 * Supports quick Year jumps (critical for birth dates) and month navigation.
 */
export const DatePickerField = ({
  label,
  value,
  onChange,
  error,
  disabled = false,
  variant = 'auth', // 'auth' | 'settings'
  placeholder = 'Select date',
  maxDate = new Date(),
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [mode, setMode] = useState('calendar'); // 'calendar' | 'years'

  const parsed = useMemo(() => parseDateString(value), [value]);
  const today = useMemo(() => new Date(), []);

  // View state for current month/year being browsed
  const [viewYear, setViewYear] = useState(() => parsed?.year || today.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => (parsed ? parsed.month : today.getMonth()));
  const [tempDay, setTempDay] = useState(() => parsed?.day || null);

  const openModal = () => {
    if (disabled) return;
    const cur = parseDateString(value);
    if (cur) {
      setViewYear(cur.year);
      setViewMonth(cur.month);
      setTempDay(cur.day);
    } else {
      setViewYear(today.getFullYear() - 18); // Default to reasonable adult age for DOB
      setViewMonth(0);
      setTempDay(null);
    }
    setMode('calendar');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Generate day grid
  const daysInMonth = useMemo(() => {
    return new Date(viewYear, viewMonth + 1, 0).getDate();
  }, [viewYear, viewMonth]);

  const firstDayOfWeek = useMemo(() => {
    return new Date(viewYear, viewMonth, 1).getDay();
  }, [viewYear, viewMonth]);

  const maxYear = maxDate ? maxDate.getFullYear() : today.getFullYear();
  const maxMonth = maxDate ? maxDate.getMonth() : 11;
  const maxDay = maxDate ? maxDate.getDate() : 31;

  const isDayDisabled = (day) => {
    if (!maxDate) return false;
    if (viewYear > maxYear) return true;
    if (viewYear === maxYear && viewMonth > maxMonth) return true;
    if (viewYear === maxYear && viewMonth === maxMonth && day > maxDay) return true;
    return false;
  };

  const handleSelectDay = (day) => {
    if (isDayDisabled(day)) return;
    const dateStr = formatDate(viewYear, viewMonth, day);
    onChange(dateStr);
    setModalVisible(false);
  };

  // List of selectable years (from 1920 to maxYear)
  const yearsList = useMemo(() => {
    const list = [];
    for (let y = maxYear; y >= 1920; y--) {
      list.push(y);
    }
    return list;
  }, [maxYear]);

  // Render input trigger based on variant
  const isSettings = variant === 'settings';

  return (
    <View style={isSettings ? styles.settingsContainer : styles.authContainer}>
      {label && <Text style={styles.authLabel}>{label}</Text>}

      <TouchableOpacity
        onPress={openModal}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={label || 'Select date'}
        style={[
          isSettings ? styles.settingsInput : styles.authInput,
          error ? styles.inputError : null,
          disabled ? styles.inputDisabled : null,
        ]}
      >
        <Text style={value ? styles.valueText : styles.placeholderText}>
          {value || placeholder}
        </Text>
        <Ionicons
          name="calendar-outline"
          size={isSettings ? 16 : 18}
          color={value ? colors.primary : colors.textMuted}
        />
      </TouchableOpacity>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Calendar Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <TouchableWithoutFeedback onPress={closeModal}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.calendarCard}>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderLeft}>
                    <Ionicons name="calendar" size={18} color={colors.primary} />
                    <Text style={styles.modalTitle}>Select Date of Birth</Text>
                  </View>
                  <TouchableOpacity
                    onPress={closeModal}
                    hitSlop={8}
                    style={styles.closeBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Close"
                  >
                    <Ionicons name="close" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Selected Date Preview */}
                <View style={styles.previewBox}>
                  <Text style={styles.previewLabel}>Chosen Date</Text>
                  <Text style={styles.previewValue}>
                    {value ? value : 'None selected'}
                  </Text>
                </View>

                {/* Month / Year Navigator */}
                <View style={styles.navRow}>
                  <TouchableOpacity
                    onPress={handlePrevMonth}
                    style={styles.navBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Previous month"
                  >
                    <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setMode(mode === 'years' ? 'calendar' : 'years')}
                    style={styles.monthYearBtn}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.monthYearText}>
                      {MONTH_NAMES[viewMonth]} {viewYear}
                    </Text>
                    <Ionicons
                      name={mode === 'years' ? 'chevron-up' : 'chevron-down'}
                      size={14}
                      color={colors.primary}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleNextMonth}
                    style={styles.navBtn}
                    disabled={viewYear === maxYear && viewMonth >= maxMonth}
                    accessibilityRole="button"
                    accessibilityLabel="Next month"
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={
                        viewYear === maxYear && viewMonth >= maxMonth
                          ? colors.borderDark
                          : colors.textPrimary
                      }
                    />
                  </TouchableOpacity>
                </View>

                {mode === 'years' ? (
                  /* Quick Year Selector Grid */
                  <View style={styles.yearPickerContainer}>
                    <Text style={styles.yearPickerHint}>Tap a year to jump:</Text>
                    <ScrollView style={styles.yearScroll} contentContainerStyle={styles.yearGrid}>
                      {yearsList.map((y) => (
                        <TouchableOpacity
                          key={y}
                          style={[
                            styles.yearChip,
                            y === viewYear && styles.yearChipActive,
                          ]}
                          onPress={() => {
                            setViewYear(y);
                            setMode('calendar');
                          }}
                        >
                          <Text
                            style={[
                              styles.yearChipText,
                              y === viewYear && styles.yearChipTextActive,
                            ]}
                          >
                            {y}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                ) : (
                  /* Days of Week & Calendar Grid */
                  <View style={styles.calendarBody}>
                    <View style={styles.weekDaysRow}>
                      {DAYS_OF_WEEK.map((d) => (
                        <Text key={d} style={styles.weekDayText}>
                          {d}
                        </Text>
                      ))}
                    </View>

                    <View style={styles.daysGrid}>
                      {/* Blank cells for offset */}
                      {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                        <View key={`blank-${i}`} style={styles.dayCell} />
                      ))}

                      {/* Day numbers */}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const dayNum = i + 1;
                        const disabledDay = isDayDisabled(dayNum);
                        const isSelected =
                          parsed &&
                          parsed.year === viewYear &&
                          parsed.month === viewMonth &&
                          parsed.day === dayNum;
                        const isToday =
                          today.getFullYear() === viewYear &&
                          today.getMonth() === viewMonth &&
                          today.getDate() === dayNum;

                        return (
                          <TouchableOpacity
                            key={`day-${dayNum}`}
                            style={[
                              styles.dayCell,
                              isSelected && styles.dayCellSelected,
                              isToday && !isSelected && styles.dayCellToday,
                            ]}
                            disabled={disabledDay}
                            onPress={() => handleSelectDay(dayNum)}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.dayText,
                                isSelected && styles.dayTextSelected,
                                disabledDay && styles.dayTextDisabled,
                                isToday && !isSelected && styles.dayTextToday,
                              ]}
                            >
                              {dayNum}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Footer Buttons */}
                <View style={styles.modalFooter}>
                  {value ? (
                    <TouchableOpacity
                      onPress={() => {
                        onChange('');
                        closeModal();
                      }}
                      style={styles.clearBtn}
                    >
                      <Text style={styles.clearBtnText}>Clear</Text>
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity
                    onPress={closeModal}
                    style={styles.cancelBtn}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  authContainer: {
    gap: 6,
  },
  authLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  authInput: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgSurface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 16,
  },
  settingsContainer: {
    flex: 1,
  },
  settingsInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgHighlight,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
    minHeight: 38,
  },
  valueText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  placeholderText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  inputError: {
    borderColor: colors.danger,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    marginTop: 2,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  calendarCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  previewBox: {
    backgroundColor: colors.bgHighlight,
    borderRadius: borderRadius.sm,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  previewValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  navBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
    backgroundColor: colors.bgHighlight,
  },
  monthYearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.bgHighlight,
  },
  monthYearText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  calendarBody: {
    marginTop: spacing.xs,
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  weekDayText: {
    width: 38,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
    borderRadius: 18,
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  dayText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  dayTextSelected: {
    color: colors.textWhite,
    fontWeight: '700',
  },
  dayTextDisabled: {
    color: colors.borderDark,
  },
  dayTextToday: {
    color: colors.primary,
    fontWeight: '700',
  },

  // Year picker
  yearPickerContainer: {
    height: 220,
    marginTop: spacing.xs,
  },
  yearPickerHint: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  yearScroll: {
    flex: 1,
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  yearChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.bgHighlight,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 64,
    alignItems: 'center',
  },
  yearChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  yearChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  yearChipTextActive: {
    color: colors.textWhite,
    fontWeight: '700',
  },

  // Footer
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.md,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  clearBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 'auto',
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.danger,
  },
  cancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.bgHighlight,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});

