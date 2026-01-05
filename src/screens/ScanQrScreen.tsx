import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../contexts/AuthContext';
import { AttendanceService, SessionService } from '../services';
import { QrPayload } from '../types/models';

type ScanQrScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'ScanQr'>;
};

const ScanQrScreen = ({ navigation }: ScanQrScreenProps) => {
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || processing || !user) return;
    
    setScanned(true);
    setProcessing(true);

    try {
      // Parse QR data - handle invalid JSON
      let qrPayload: QrPayload;
      try {
        qrPayload = JSON.parse(data);
      } catch (parseError) {
        Alert.alert('QR invalide', 'Ce QR code n\'est pas un code de présence valide.');
        setScanned(false);
        setProcessing(false);
        return;
      }
      
      if (!qrPayload.sessionId || !qrPayload.courseId || !qrPayload.token) {
        throw new Error('QR code invalide');
      }

      // Verify session is still active
      const session = await SessionService.getSessionById(qrPayload.sessionId);
      
      if (!session) {
        Alert.alert('Erreur', 'Session introuvable.');
        setScanned(false);
        setProcessing(false);
        return;
      }

      if (session.status !== 'active' && !session.isActive) {
        Alert.alert('Session terminée', 'Cette session de présence est terminée.');
        setScanned(false);
        setProcessing(false);
        return;
      }

      // Verify token matches
      const sessionToken = session.currentQrToken || session.qrSecret;
      if (sessionToken !== qrPayload.token) {
        Alert.alert('QR expiré', 'Ce QR code a expiré. Scannez le nouveau QR code.');
        setScanned(false);
        setProcessing(false);
        return;
      }

      // Record attendance - function expects (sessionId, studentId, sessionStartTime)
      await AttendanceService.recordAttendance(
        qrPayload.sessionId,
        user.uid,
        session.startTime
      );

      Alert.alert(
        '✅ Présence enregistrée',
        `Bienvenue ${user.displayName || 'Étudiant'} !\n\nVotre présence a été enregistrée avec succès.`,
        [{ text: 'OK', onPress: () => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('StudentHome' as any) }]
      );
    } catch (error: any) {
      console.error('Scan error:', error);
      
      if (error.message?.includes('already')) {
        Alert.alert('Déjà enregistré', 'Votre présence a déjà été enregistrée pour cette session.');
      } else if (error.message === 'QR code invalide') {
        Alert.alert('QR invalide', 'Ce QR code n\'est pas valide.');
      } else {
        Alert.alert('Erreur', 'Une erreur est survenue lors de l\'enregistrement.');
      }
      setScanned(false);
    } finally {
      setProcessing(false);
    }
  };

  if (!permission) {
    return (
      <LinearGradient colors={['#070b17', '#0e1629', '#111f3c']} style={[styles.gradient, styles.centered]}>
        <ActivityIndicator size="large" color="#10b981" />
      </LinearGradient>
    );
  }

  if (!permission.granted) {
    return (
      <LinearGradient colors={['#070b17', '#0e1629', '#111f3c']} style={styles.gradient}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionIcon}>📷</Text>
          <Text style={styles.permissionTitle}>Accès à la caméra requis</Text>
          <Text style={styles.permissionText}>
            Pour scanner les QR codes de présence, nous avons besoin d'accéder à votre caméra.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Autoriser l'accès</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backLink} onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('StudentHome' as any)}>
            <Text style={styles.backLinkText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />
      {/* Overlay with absolute positioning */}
      <LinearGradient
        colors={['rgba(7, 11, 23, 0.9)', 'transparent', 'transparent', 'rgba(7, 11, 23, 0.9)']}
        style={styles.overlay}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('StudentHome' as any)} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Scanner le QR code</Text>
        </View>

        {/* Scanner Frame */}
        <View style={styles.scannerFrame}>
          <View style={styles.corner} />
          <View style={[styles.corner, styles.cornerTopRight]} />
          <View style={[styles.corner, styles.cornerBottomLeft]} />
          <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>

          {/* Instructions */}
          <View style={styles.instructions}>
            {processing ? (
              <>
                <ActivityIndicator color="#10b981" size="large" />
                <Text style={styles.processingText}>Enregistrement en cours...</Text>
              </>
            ) : (
              <>
                <Text style={styles.instructionText}>
                  Placez le QR code dans le cadre
                </Text>
                {scanned && (
                  <TouchableOpacity
                    style={styles.rescanButton}
                    onPress={() => setScanned(false)}
                  >
                    <Text style={styles.rescanButtonText}>Scanner à nouveau</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070b17',
  },
  gradient: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  backButtonText: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f8fafc',
    textAlign: 'center',
  },
  scannerFrame: {
    width: 280,
    height: 280,
    alignSelf: 'center',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#10b981',
    borderTopWidth: 4,
    borderLeftWidth: 4,
    top: 0,
    left: 0,
  },
  cornerTopRight: {
    right: 0,
    left: undefined,
    borderLeftWidth: 0,
    borderRightWidth: 4,
  },
  cornerBottomLeft: {
    bottom: 0,
    top: undefined,
    borderTopWidth: 0,
    borderBottomWidth: 4,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    top: undefined,
    left: undefined,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  instructions: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  instructionText: {
    color: '#94a3b8',
    fontSize: 16,
    textAlign: 'center',
  },
  processingText: {
    color: '#10b981',
    fontSize: 16,
    marginTop: 16,
  },
  rescanButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#10b981',
    borderRadius: 12,
  },
  rescanButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  permissionIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  backLink: {
    marginTop: 20,
  },
  backLinkText: {
    color: '#64748b',
    fontSize: 16,
  },
});

export default ScanQrScreen;
