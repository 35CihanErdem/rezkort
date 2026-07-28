import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing } from '../theme';

type Props = {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
};

/**
 * Animasyonlu tenisçi kız — yükleme göstergesi.
 * Racket swing + top sektirme + hafif zıplama.
 */
export function TennisLoader({
  label = 'Yükleniyor...',
  size = 'md',
}: Props) {
  const swing = useRef(new Animated.Value(0)).current;
  const bounce = useRef(new Animated.Value(0)).current;
  const hop = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const swingLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(swing, {
          toValue: 1,
          duration: 420,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(swing, {
          toValue: 0,
          duration: 420,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    const bounceLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: 1,
          duration: 380,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bounce, {
          toValue: 0,
          duration: 380,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    const hopLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(hop, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(hop, {
          toValue: 0,
          duration: 420,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );

    swingLoop.start();
    bounceLoop.start();
    hopLoop.start();
    pulseLoop.start();

    return () => {
      swingLoop.stop();
      bounceLoop.stop();
      hopLoop.stop();
      pulseLoop.stop();
    };
  }, [bounce, hop, pulse, swing]);

  const scale = size === 'lg' ? 1.15 : size === 'sm' ? 0.78 : 1;

  const racketRotate = swing.interpolate({
    inputRange: [0, 1],
    outputRange: ['-38deg', '52deg'],
  });

  const ballY = bounce.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -54],
  });

  const ballX = bounce.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 10, 22],
  });

  const bodyY = hop.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });

  const labelOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 1],
  });

  return (
    <View style={styles.wrap} accessibilityRole="progressbar" accessibilityLabel={label}>
      <View style={[styles.stage, { transform: [{ scale }] }]}>
        <View style={styles.courtShadow} />

        <Animated.View style={[styles.player, { transform: [{ translateY: bodyY }] }]}>
          {/* Saç / at kuyruğu */}
          <View style={styles.ponytail} />
          <View style={styles.head}>
            <View style={styles.hair} />
            <View style={styles.face}>
              <View style={styles.eye} />
              <View style={[styles.eye, styles.eyeRight]} />
              <View style={styles.blush} />
              <View style={[styles.blush, styles.blushRight]} />
              <View style={styles.smile} />
            </View>
          </View>

          {/* Gövde */}
          <View style={styles.torso}>
            <View style={styles.skirt} />
          </View>

          {/* Kollar + racket */}
          <View style={styles.armLeft} />
          <Animated.View
            style={[
              styles.armRight,
              { transform: [{ rotate: racketRotate }] },
            ]}
          >
            <View style={styles.racketHandle} />
            <View style={styles.racketHead}>
              <View style={styles.racketStrings} />
            </View>
          </Animated.View>

          {/* Bacaklar */}
          <View style={styles.legs}>
            <View style={styles.leg} />
            <View style={[styles.leg, styles.legRight]} />
          </View>
          <View style={styles.shoes}>
            <View style={styles.shoe} />
            <View style={[styles.shoe, styles.shoeRight]} />
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.ball,
            {
              transform: [{ translateY: ballY }, { translateX: ballX }],
            },
          ]}
        >
          <View style={styles.ballCurve} />
        </Animated.View>
      </View>

      {label ? (
        <Animated.Text style={[styles.label, { opacity: labelOpacity }]}>
          {label}
        </Animated.Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  stage: {
    width: 140,
    height: 150,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  courtShadow: {
    position: 'absolute',
    bottom: 6,
    width: 88,
    height: 14,
    borderRadius: 40,
    backgroundColor: 'rgba(15, 61, 40, 0.12)',
  },
  player: {
    width: 72,
    height: 118,
    alignItems: 'center',
  },
  ponytail: {
    position: 'absolute',
    top: 10,
    right: 8,
    width: 14,
    height: 28,
    borderRadius: 10,
    backgroundColor: '#2C1810',
    transform: [{ rotate: '18deg' }],
  },
  head: {
    width: 36,
    height: 36,
    zIndex: 2,
  },
  hair: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    height: 22,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: '#2C1810',
  },
  face: {
    marginTop: 6,
    marginHorizontal: 3,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3C9A8',
    overflow: 'hidden',
  },
  eye: {
    position: 'absolute',
    top: 10,
    left: 7,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.ink,
  },
  eyeRight: {
    left: undefined,
    right: 7,
  },
  blush: {
    position: 'absolute',
    top: 14,
    left: 3,
    width: 6,
    height: 4,
    borderRadius: 3,
    backgroundColor: 'rgba(212, 94, 43, 0.35)',
  },
  blushRight: {
    left: undefined,
    right: 3,
  },
  smile: {
    position: 'absolute',
    bottom: 5,
    alignSelf: 'center',
    left: 11,
    width: 8,
    height: 4,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderColor: '#C45A3A',
  },
  torso: {
    marginTop: -2,
    width: 34,
    height: 28,
    borderRadius: 10,
    backgroundColor: colors.courtDeep,
    alignItems: 'center',
    zIndex: 1,
  },
  skirt: {
    position: 'absolute',
    bottom: -8,
    width: 42,
    height: 16,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.court,
  },
  armLeft: {
    position: 'absolute',
    top: 42,
    left: 6,
    width: 10,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#F3C9A8',
    transform: [{ rotate: '22deg' }],
  },
  armRight: {
    position: 'absolute',
    top: 40,
    right: 2,
    width: 10,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#F3C9A8',
    transformOrigin: 'top center',
    alignItems: 'center',
  },
  racketHandle: {
    position: 'absolute',
    top: 18,
    width: 5,
    height: 22,
    borderRadius: 2,
    backgroundColor: '#8B5A2B',
  },
  racketHead: {
    position: 'absolute',
    top: 34,
    width: 22,
    height: 28,
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: colors.courtDeep,
    backgroundColor: 'rgba(217, 243, 228, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  racketStrings: {
    width: 10,
    height: 14,
    borderWidth: 1,
    borderColor: 'rgba(15, 92, 56, 0.35)',
    borderRadius: 2,
  },
  legs: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  leg: {
    width: 9,
    height: 22,
    borderRadius: 5,
    backgroundColor: '#F3C9A8',
  },
  legRight: {
    transform: [{ rotate: '6deg' }],
  },
  shoes: {
    marginTop: -2,
    flexDirection: 'row',
    gap: 6,
  },
  shoe: {
    width: 14,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  shoeRight: {
    marginLeft: 2,
  },
  ball: {
    position: 'absolute',
    right: 18,
    bottom: 42,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#C8F542',
    borderWidth: 1,
    borderColor: '#8FBF20',
  },
  ballCurve: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(143, 191, 32, 0.7)',
    backgroundColor: 'transparent',
  },
  label: {
    fontFamily: fonts.bodyMedium,
    color: colors.muted,
    fontSize: 15,
    letterSpacing: 0.3,
  },
});
