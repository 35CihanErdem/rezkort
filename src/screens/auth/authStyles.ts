import { StyleSheet } from 'react-native';
import { colors, fonts, radii, spacing } from '../../theme';

export const authStyles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  brand: {
    fontFamily: fonts.display,
    fontSize: 56,
    color: colors.white,
    letterSpacing: 1,
    lineHeight: 58,
  },
  brandLight: {
    fontFamily: fonts.display,
    fontSize: 48,
    color: colors.courtDeep,
    letterSpacing: 1,
    lineHeight: 50,
  },
  heroTag: {
    marginTop: 4,
    fontFamily: fonts.bodyMedium,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 15,
  },
  panel: {
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: 22,
    color: colors.ink,
  },
  subtitle: {
    marginTop: 6,
    marginBottom: spacing.md,
    fontFamily: fonts.body,
    color: colors.muted,
    lineHeight: 21,
    fontSize: 14,
  },
  label: {
    marginBottom: 6,
    marginTop: spacing.sm,
    fontFamily: fonts.bodyMedium,
    color: colors.ink,
    fontSize: 13,
  },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: colors.ink,
    fontFamily: fonts.body,
  },
  cta: {
    marginTop: spacing.lg,
    backgroundColor: colors.courtDeep,
    borderRadius: radii.md,
    paddingVertical: 15,
    alignItems: 'center',
  },
  ctaText: {
    color: colors.white,
    fontFamily: fonts.bodyBold,
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
    fontFamily: fonts.body,
    color: colors.muted,
  },
  link: {
    fontFamily: fonts.bodyBold,
    color: colors.courtDeep,
  },
  error: {
    marginTop: spacing.sm,
    fontFamily: fonts.bodyMedium,
    color: colors.danger,
  },
});
