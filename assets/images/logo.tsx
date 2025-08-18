import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showSubtitle?: boolean;
}

export const OriginalExpressLogo: React.FC<LogoProps> = ({ 
  size = 'medium', 
  showSubtitle = true 
}) => {
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { fontSize: 24, subtitleFontSize: 12 };
      case 'large':
        return { fontSize: 48, subtitleFontSize: 20 };
      default:
        return { fontSize: 36, subtitleFontSize: 16 };
    }
  };

  const { fontSize, subtitleFontSize } = getSizeStyles();

  return (
    <View style={styles.container}>
      <Text style={[styles.logoText, { fontSize }]}>
        ORIGINAL EXPRESS
      </Text>
      {showSubtitle && (
        <Text style={[styles.subtitle, { fontSize: subtitleFontSize }]}>
          Transport & Logistique
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  logoText: {
    fontWeight: 'bold',
    color: '#007bff',
    textAlign: 'center',
  },
  subtitle: {
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
});

export default OriginalExpressLogo;