import { StyleSheet } from 'react-native';
import { colors, spacing } from '../../theme';

export const authStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  brand: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.courtDeep,
    letterSpacing: -0.5,
  },
  title: {
    marginTop: spacing.lg,
    fontSize: 22,
    fontWeight: '800',
    color: colors.ink,
  },
  subtitle: {
    marginTop: 6,
    marginBottom: spacing.lg,
    color: colors.muted,
    lineHeight: 21,
    fontSize: 15,
  },
  label: {
    marginBottom: 6,
    marginTop: spacing.sm,
    color: colors.ink,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
  },
  cta: {
    marginTop: spacing.lg,
    backgroundColor: colors.court,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  linkRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  linkMuted: {
    color: colors.muted,
  },
  link: {
    color: colors.courtDeep,
    fontWeight: '700',
  },
  error: {
    marginTop: spacing.sm,
    color: colors.danger,
    fontWeight: '600',
  },
});
