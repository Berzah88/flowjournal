import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Modal, StyleSheet, Text, TouchableOpacity, FlatList, Image, ActivityIndicator, Alert } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS, Easing } from 'react-native-reanimated';

const SHEET_HEIGHT = 420; // module-level constant to avoid re-creation on each render

export default function MediaPickerModal({ visible, onClose, onSelect }) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  // Active color: light theme -> app blue, dark theme -> app red (used heavily in dark mode)
  const activeColor = theme.name === 'dark' ? '#FF6B6B' : (theme.colors?.info || '#4A90E2');
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState([]);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [selectedUris, setSelectedUris] = useState([]);

  const translateY = useSharedValue(SHEET_HEIGHT);
  const startY = useSharedValue(0);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (!mounted) return;
        setPermissionGranted(status === 'granted');
        if (status === 'granted') {
          const res = await MediaLibrary.getAssetsAsync({
            first: 60,
            mediaType: ['photo'],
            sortBy: ['creationTime'],
          });
          if (!mounted) return;
          setAssets(res.assets || []);
        }
      } catch (err) {
        // swallow
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (visible) {
      init();
      // open animation
      translateY.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
    } else {
      // reset selection when modal hidden
      setSelectedUris([]);
    }
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const closeSheet = useCallback((cb) => {
    translateY.value = withTiming(SHEET_HEIGHT, { duration: 220 }, () => {
      // run a safe JS callback on animation end
      runOnJS(() => {
        try { cb && cb(); } catch (e) { if (__DEV__) console.debug('closeSheet cb error', e); }
      })();
    });
  }, [translateY]);

  const commitAndClose = useCallback(() => {
    try {
      if (selectedUris.length > 0) onSelect?.(selectedUris.slice());
    } catch (e) {
      if (__DEV__) console.debug('commitAndClose onSelect error', e);
    }
    try { onClose?.(); } catch (e) { if (__DEV__) console.debug('commitAndClose onClose error', e); }
    setSelectedUris([]);
  }, [selectedUris, onSelect, onClose]);

  // Drag-to-close gesture (robust: track start offset + velocity)
  const pan = Gesture.Pan()
    .onStart(() => {
      // remember starting translate value so we can add gesture delta
      startY.value = translateY.value;
    })
    .onUpdate((e) => {
      // allow only downward drag (positive translation). Keep sheet from moving above 0.
      const next = Math.max(0, startY.value + e.translationY);
      translateY.value = next;
    })
    .onEnd((e) => {
      // close if dragged far enough or released with a strong downward velocity
      const shouldClose = (e.translationY > 120) || (e.velocityY > 1200);
      if (shouldClose) {
        translateY.value = withTiming(SHEET_HEIGHT, { duration: 180 }, () => runOnJS(commitAndClose)());
      } else {
        translateY.value = withTiming(0, { duration: 180 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // ref for the horizontal FlatList so we can allow simultaneous handling
  const assetsListRef = useRef(null);

  const toggleSelect = useCallback((uri) => {
    setSelectedUris((prev) => {
      if (prev.includes(uri)) return prev.filter(u => u !== uri);
      return [...prev, uri];
    });
  }, []);

  const handleTakePhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') return;
      const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
      let uri = null;
      if (result?.assets && result.assets.length > 0) uri = result.assets[0].uri;
      else if (result?.uri) uri = result.uri;
      if (uri) {
        onSelect?.([uri]);
        closeSheet(onClose);
      }
    } catch (err) {
      if (__DEV__) console.debug('handleTakePhoto error', err);
    }
  }, [onSelect, closeSheet, onClose]);

  const handleOpenLibrary = useCallback(async () => {
    try {
      // Ensure media library permission is granted before launching
      let { status } = await ImagePicker.getMediaLibraryPermissionsAsync?.();
      if (status !== 'granted') {
        const req = await ImagePicker.requestMediaLibraryPermissionsAsync?.();
        status = req?.status || status;
      }
      if (status !== 'granted') {
        try {
          Alert.alert(t('permissionRequired') || 'Permission Required', t('galleryPermissionMessage') || 'Gallery access permission is required to add photos. Please grant permission in settings.', [{ text: t('ok') || 'OK' }]);
        } catch (e) {
          if (__DEV__) console.debug('Alert error', e);
        }
        return;
      }

      const mediaTypesOption = (ImagePicker.MediaType && ImagePicker.MediaType.Images) ? ImagePicker.MediaType.Images : 'images';
      const result = await ImagePicker.launchImageLibraryAsync({
        quality: 0.7,
        mediaTypes: mediaTypesOption,
        allowsMultipleSelection: false,
      });

      // Handle user cancellation consistently across SDK versions
      if (!result) return;
      if (result.canceled === true) return; // newer API

      let uri = null;
      if (result?.assets && result.assets.length > 0) uri = result.assets[0].uri;
      else if (result?.uri) uri = result.uri;
      if (uri) {
        onSelect?.([uri]);
        closeSheet(onClose);
      }
    } catch (err) {
      try { console.debug('MediaPicker: open library error', err); } catch (e) {}
    }
  }, [onSelect, closeSheet, onClose, t]);

  const triggerHaptic = useCallback(async () => {
    try {
      if (Haptics && Haptics.selectionAsync) {
        await Haptics.selectionAsync();
      }
    } catch (e) {
      // ignore if Haptics isn't available
    }
  }, []);

  const confirmSelection = useCallback(() => {
    if (selectedUris.length === 0) return;
    onSelect?.(selectedUris.slice());
    closeSheet(onClose);
  }, [selectedUris, onSelect, closeSheet, onClose]);

  const renderAssetItem = useCallback(({ item }) => {
    const selected = selectedUris.includes(item.uri);
    const overlayStyle = selected ? [styles.overlayBase, styles.overlaySelected, { backgroundColor: activeColor, borderColor: '#fff', borderWidth: 2 }] : [styles.overlayBase, styles.overlayUnselected];
    return (
      <TouchableOpacity onPress={() => toggleSelect(item.uri)} style={styles.assetWrap} activeOpacity={0.85}>
        <Image source={{ uri: item.uri }} style={styles.asset} resizeMode="cover" />
        <View style={overlayStyle}>
          {selected ? (<MaterialIcons name="check" size={12} color={'#fff'} />) : null}
        </View>
      </TouchableOpacity>
    );
  }, [selectedUris, activeColor, toggleSelect]);

  return (
    <Modal visible={visible} animationType="none" transparent>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={[styles.backdrop, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
            <Animated.View style={[styles.sheet, { backgroundColor: theme.name === 'dark' ? '#0B1612' : '#FFFFFF' }, sheetStyle]}>
              {/* Only allow the header/handle region to receive the vertical pan gesture so horizontal scrolling in the thumbnails works freely */}
              <GestureDetector gesture={pan} simultaneousHandlers={assetsListRef}>
                <View>
                  <View style={styles.handleRow}>
                    <View style={styles.handle} />
                  </View>

                  <View style={styles.headerRow}>
                    <View style={styles.headerSpacer} />
                    <Text style={[styles.title, { color: theme.name === 'dark' ? '#FFF' : '#111' }]}>{t('addMedia')}</Text>
                    <TouchableOpacity onPress={commitAndClose} style={styles.addButton} hitSlop={{top:8,bottom:8,left:8,right:8}}>
                      <Text style={[styles.addText, { color: activeColor }]}>{t('add')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </GestureDetector>

            <Text style={[styles.sectionTitle, { color: theme.name === 'dark' ? '#FFF' : '#111' }]}>{t('recentPhotos')}</Text>

            <View style={styles.assetsRow}>
              {loading ? (
                <ActivityIndicator size="small" color={activeColor} />
              ) : permissionGranted ? (
                <FlatList
                  ref={assetsListRef}
                  horizontal
                  data={assets}
                  keyExtractor={(item) => item.id}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.assetsScroll}
                  nestedScrollEnabled={true}
                  directionalLockEnabled={true}
                  initialNumToRender={6}
                  maxToRenderPerBatch={6}
                  windowSize={5}
                  removeClippedSubviews={true}
                  getItemLayout={(data, index) => ({ length: 104, offset: 104 * index, index })}
                  renderItem={({ item }) => {
                    const selected = selectedUris.includes(item.uri);
                    // avoid recreating inline style objects frequently
                    const overlayStyle = selected ? [styles.overlayBase, styles.overlaySelected, { backgroundColor: activeColor, borderColor: '#fff', borderWidth: 2 }] : [styles.overlayBase, styles.overlayUnselected];
                    return (
                      <TouchableOpacity key={item.id} onPress={() => toggleSelect(item.uri)} style={styles.assetWrap} activeOpacity={0.85}>
                        <Image source={{ uri: item.uri }} style={styles.asset} resizeMode="cover" />
                        <View style={overlayStyle}>
                          {selected ? (<MaterialIcons name="check" size={12} color={'#fff'} />) : null}
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                />
                ) : (
                <View style={styles.permissionNotice}>
                  <Text style={{ color: theme.name === 'dark' ? '#CCC' : '#444' }}>{t('galleryPermissionMessage')}</Text>
                </View>
              )}
            </View>

            <View style={styles.footerRow}>
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: activeColor }]} onPress={async () => { await triggerHaptic(); handleTakePhoto(); }} activeOpacity={0.9}>
                <Text style={[styles.primaryBtnText, { color: '#fff' }]}>{t('takePhoto')}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.secondaryBtn, { borderColor: theme.name === 'dark' ? '#1F1F1F' : '#E5E7EB' }]} onPress={async () => { await triggerHaptic(); handleOpenLibrary(); }} activeOpacity={0.9}>
                <Text style={[styles.secondaryBtnText, { color: theme.name === 'dark' ? '#FFF' : '#111' }]}>{t('openPhotoLibrary')}</Text>
              </TouchableOpacity>
            </View>
            </Animated.View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 48, paddingTop: 12 },
  handleRow: { alignItems: 'center', paddingVertical: 10 },
  handle: { width: 44, height: 6, borderRadius: 6, backgroundColor: '#D1D5DB' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 6 },
  headerButton: { width: 64, alignItems: 'flex-start' },
  headerText: { fontSize: 16 },
  title: { fontSize: 16, fontWeight: '700' },
  headerSpacer: { width: 64 },
  addButton: { width: 64, alignItems: 'flex-end' },
  addText: { fontSize: 16, fontWeight: '700' },
  sectionTitle: { paddingHorizontal: 16, paddingTop: 16, fontSize: 16, fontWeight: '600' },
  assetsRow: { paddingVertical: 24, paddingHorizontal: 12 },
  assetsScroll: { paddingRight: 12 },
  assetWrap: { marginRight: 8, width: 96, height: 96, borderRadius: 12, overflow: 'hidden', borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.06)' },
  asset: { width: '100%', height: '100%' },
  overlayBase: { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  overlaySelected: { /* border handled inline */ },
  overlayUnselected: { backgroundColor: 'rgba(255,255,255,0.28)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' },
  selectedText: { color: '#fff', fontWeight: '700' },
  permissionNotice: { padding: 12, alignItems: 'center' },
  footerRow: { flexDirection: 'column', paddingHorizontal: 16, gap: 12, marginTop: 24, paddingBottom: 24 },
  primaryBtn: { height: 58, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#000', fontWeight: '700', fontSize: 16 },
  secondaryBtn: { height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginTop: 16 },
  secondaryBtnText: { fontSize: 15, fontWeight: '700' },
  confirmBtn: { height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8, backgroundColor: '#111' },
  confirmBtnDisabled: { backgroundColor: '#AAA' },
  confirmBtnText: { color: '#fff', fontWeight: '700' },
});
