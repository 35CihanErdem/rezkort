import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../theme';

type Props = {
  children: ReactNode;
  style?: ViewStyle;
  variant?: 'light' | 'hero';
};

export function Screen({ children, style, variant = 'light' }: Props) {
  if (variant === 'hero') {
    return (
      <View style={styles.root}>
        <LinearGradient
          colors={['#0F5C38', '#1B8F55', '#0F3D28']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.courtLineH} />
        <View style={styles.courtLineV} />
        <View style={[styles.content, style]}>{children}</View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#F4FAF6', '#E4EFE8', '#D8E8DE']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.softOrb} />
      <View style={[styles.content, style]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
  },
  courtLineH: {
    position: 'absolute',
    top: '42%',
    left: '8%',
    right: '8%',
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  courtLineV: {
    position: 'absolute',
    top: '18%',
    bottom: '22%',
    left: '50%',
    width: 2,
    marginLeft: -1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  softOrb: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(27,143,85,0.12)',
    top: -40,
    right: -50,
  },
});
