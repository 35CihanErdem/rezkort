import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { colors, fonts, spacing } from '../theme';

type Props = {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
};

type PlayerProps = {
  variant: 'girl' | 'boy';
  swing: Animated.AnimatedInterpolation<string | number>;
  hop: Animated.AnimatedInterpolation<number>;
  mirrored?: boolean;
};

function MiniPlayer({ variant, swing, hop, mirrored }: PlayerProps) {
  const isGirl = variant === 'girl';

  return (
    <Animated.View
      style={[
        styles.player,
        mirrored && styles.playerMirrored,
        { transform: [{ translateY: hop }, ...(mirrored ? [{ scaleX: -1 }] : [])] },
      ]}
    >
      {isGirl ? <View style={styles.ponytail} /> : null}
      <View style={styles.head}>
        <View style={[styles.hair, !isGirl && styles.hairBoy]} />
        <View style={styles.face}>
          <View style={styles.eye} />
          <View style={[styles.eye, styles.eyeRight]} />
          {isGirl ? (
            <>
              <View style={styles.blush} />
              <View style={[styles.blush, styles.blushRight]} />
            </>
          ) : null}
          <View style={styles.smile} />
        </View>
      </View>

      <View style={[styles.torso, !isGirl && styles.torsoBoy]}>
        {isGirl ? <View style={styles.skirt} /> : <View style={styles.shorts} />}
      </View>

      <View style={styles.armLeft} />
      <Animated.View style={[styles.armRight, { transform: [{ rotate: swing }] }]}>
        <View style={styles.racketHandle} />
        <View style={[styles.racketHead, !isGirl && styles.racketHeadBoy]}>
          <View style={styles.racketStrings} />
        </View>
      </Animated.View>

      <View style={styles.legs}>
        <View style={styles.leg} />
        <View style={[styles.leg, styles.legRight]} />
      </View>
      <View style={styles.shoes}>
        <View style={[styles.shoe, !isGirl && styles.shoeBoy]} />
        <View style={[styles.shoe, styles.shoeRight, !isGirl && styles.shoeBoy]} />
      </View>
    </Animated.View>
  );
}

/**
 * Karşılıklı tenis: kız + erkek, top aralarında gidip gelir.
 */
export function TennisLoader({
  label = 'Yükleniyor...',
  size = 'md',
}: Props) {
  const rally = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const rallyLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(rally, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(rally, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
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

    rallyLoop.start();
    pulseLoop.start();

    return () => {
      rallyLoop.stop();
      pulseLoop.stop();
    };
  }, [pulse, rally]);

  const scale = size === 'lg' ? 1.05 : size === 'sm' ? 0.72 : 0.9;

  // Kız solda vurur (rally ~0), erkek sağda (rally ~1)
  const girlSwing = rally.interpolate({
    inputRange: [0, 0.15, 0.35, 1],
    outputRange: ['45deg', '-40deg', '10deg', '18deg'],
  });
  const boySwing = rally.interpolate({
    inputRange: [0, 0.65, 0.85, 1],
    outputRange: ['18deg', '10deg', '-40deg', '45deg'],
  });

  const girlHop = rally.interpolate({
    inputRange: [0, 0.12, 0.3, 1],
    outputRange: [0, -8, 0, 0],
  });
  const boyHop = rally.interpolate({
    inputRange: [0, 0.7, 0.88, 1],
    outputRange: [0, 0, -8, 0],
  });

  const ballX = rally.interpolate({
    inputRange: [0, 1],
    outputRange: [28, 168],
  });
  const ballY = rally.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -42, 0],
  });

  const labelOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 1],
  });

  return (
    <View
      style={styles.wrap}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
    >
      <View style={[styles.stage, { transform: [{ scale }] }]}>
        <View style={styles.net} />
        <View style={styles.courtShadow} />

        <View style={styles.girlSlot}>
          <MiniPlayer variant="girl" swing={girlSwing} hop={girlHop} />
        </View>

        <View style={styles.boySlot}>
          <MiniPlayer variant="boy" swing={boySwing} hop={boyHop} mirrored />
        </View>

        <Animated.View
          style={[
            styles.ball,
            { transform: [{ translateX: ballX }, { translateY: ballY }] },
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
    width: 230,
    height: 150,
    position: 'relative',
  },
  courtShadow: {
    position: 'absolute',
    bottom: 4,
    left: 24,
    right: 24,
    height: 12,
    borderRadius: 40,
    backgroundColor: 'rgba(15, 61, 40, 0.12)',
  },
  net: {
    position: 'absolute',
    bottom: 18,
    left: '50%',
    marginLeft: -1,
    width: 2,
    height: 52,
    backgroundColor: 'rgba(15, 92, 56, 0.28)',
    borderRadius: 1,
  },
  girlSlot: {
    position: 'absolute',
    left: 8,
    bottom: 10,
  },
  boySlot: {
    position: 'absolute',
    right: 8,
    bottom: 10,
  },
  player: {
    width: 64,
    height: 112,
    alignItems: 'center',
  },
  playerMirrored: {},
  ponytail: {
    position: 'absolute',
    top: 10,
    right: 6,
    width: 12,
    height: 24,
    borderRadius: 10,
    backgroundColor: '#2C1810',
    transform: [{ rotate: '18deg' }],
  },
  head: {
    width: 32,
    height: 32,
    zIndex: 2,
  },
  hair: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    height: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: '#2C1810',
  },
  hairBoy: {
    height: 14,
    backgroundColor: '#3D2914',
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  face: {
    marginTop: 5,
    marginHorizontal: 2,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F3C9A8',
    overflow: 'hidden',
  },
  eye: {
    position: 'absolute',
    top: 9,
    left: 6,
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: colors.ink,
  },
  eyeRight: {
    left: undefined,
    right: 6,
  },
  blush: {
    position: 'absolute',
    top: 12,
    left: 2,
    width: 5,
    height: 3.5,
    borderRadius: 3,
    backgroundColor: 'rgba(212, 94, 43, 0.35)',
  },
  blushRight: {
    left: undefined,
    right: 2,
  },
  smile: {
    position: 'absolute',
    bottom: 4,
    left: 10,
    width: 7,
    height: 3.5,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderColor: '#C45A3A',
  },
  torso: {
    marginTop: -2,
    width: 30,
    height: 26,
    borderRadius: 9,
    backgroundColor: colors.courtDeep,
    alignItems: 'center',
    zIndex: 1,
  },
  torsoBoy: {
    backgroundColor: '#1A4F7A',
  },
  skirt: {
    position: 'absolute',
    bottom: -7,
    width: 38,
    height: 14,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.court,
  },
  shorts: {
    position: 'absolute',
    bottom: -6,
    width: 34,
    height: 12,
    borderRadius: 4,
    backgroundColor: '#D7EAF8',
    borderWidth: 1,
    borderColor: '#7EB6E8',
  },
  armLeft: {
    position: 'absolute',
    top: 38,
    left: 4,
    width: 9,
    height: 20,
    borderRadius: 5,
    backgroundColor: '#F3C9A8',
    transform: [{ rotate: '22deg' }],
  },
  armRight: {
    position: 'absolute',
    top: 36,
    right: 0,
    width: 9,
    height: 22,
    borderRadius: 5,
    backgroundColor: '#F3C9A8',
    alignItems: 'center',
  },
  racketHandle: {
    position: 'absolute',
    top: 16,
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: '#8B5A2B',
  },
  racketHead: {
    position: 'absolute',
    top: 30,
    width: 18,
    height: 24,
    borderRadius: 12,
    borderWidth: 2.5,
    borderColor: colors.courtDeep,
    backgroundColor: 'rgba(217, 243, 228, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  racketHeadBoy: {
    borderColor: '#1A4F7A',
    backgroundColor: 'rgba(215, 234, 248, 0.55)',
  },
  racketStrings: {
    width: 8,
    height: 12,
    borderWidth: 1,
    borderColor: 'rgba(15, 92, 56, 0.35)',
    borderRadius: 2,
  },
  legs: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 7,
  },
  leg: {
    width: 8,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#F3C9A8',
  },
  legRight: {
    transform: [{ rotate: '6deg' }],
  },
  shoes: {
    marginTop: -2,
    flexDirection: 'row',
    gap: 5,
  },
  shoe: {
    width: 12,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  shoeBoy: {
    backgroundColor: '#1A4F7A',
    borderColor: '#1A4F7A',
  },
  shoeRight: {
    marginLeft: 1,
  },
  ball: {
    position: 'absolute',
    left: 0,
    bottom: 48,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#C8F542',
    borderWidth: 1,
    borderColor: '#8FBF20',
  },
  ballCurve: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 9,
    height: 9,
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
