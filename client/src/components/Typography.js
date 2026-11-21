import React from 'react';
import { StyleSheet, Text as NativeText, TextInput as NativeTextInput } from 'react-native';

const FONT_FAMILIES = {
  400: 'PlusJakartaSans_400Regular',
  500: 'PlusJakartaSans_500Medium',
  600: 'PlusJakartaSans_600SemiBold',
  700: 'PlusJakartaSans_700Bold',
  800: 'PlusJakartaSans_800ExtraBold',
};

function fontFamilyFor(style) {
  const flattened = StyleSheet.flatten(style) || {};
  if (flattened.fontFamily) return flattened.fontFamily;

  const weight = flattened.fontWeight === 'bold' ? 700 : Number(flattened.fontWeight) || 400;
  const fontWeight = weight <= 400 ? 400 : weight <= 500 ? 500 : weight <= 600 ? 600 : weight <= 700 ? 700 : 800;
  return FONT_FAMILIES[fontWeight];
}

export function Text({ style, ...props }) {
  return <NativeText {...props} style={[{ fontFamily: fontFamilyFor(style) }, style]} />;
}

export function TextInput({ style, ...props }) {
  return <NativeTextInput {...props} style={[{ fontFamily: fontFamilyFor(style) }, style]} />;
}
