import { Modal, StyleSheet, View } from 'react-native';
import { colors, radii, spacing } from '../theme';
import { TennisLoader } from './TennisLoader';

type Props = {
  visible: boolean;
  label?: string;
};

/** Tam ekran yükleme — form submit / kayıt vb. */
export function LoadingOverlay({
  visible,
  label = 'Yükleniyor...',
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <TennisLoader label={label} size="md" />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(14, 26, 20, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderWidth: 1,
    borderColor: colors.line,
    minWidth: 200,
    alignItems: 'center',
  },
});
