import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';

interface CallScreenProps {
  route?: {
    params?: {
      type: 'audio' | 'video';
      contactName: string;
      contactAvatar: string;
    };
  };
  onEndCall?: () => void;
}

export default function CallScreen({ route, onEndCall }: CallScreenProps) {
  const router = useRouter();
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isCallConnected, setIsCallConnected] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [cameraType, setCameraType] = useState<CameraType>('front');
  const [isCameraOn, setIsCameraOn] = useState(true);

  const type = route?.params?.type || 'audio';
  const contactName = route?.params?.contactName || 'Contact';
  const contactAvatar = route?.params?.contactAvatar || 'https://via.placeholder.com/150';

  useEffect(() => {
    // Request camera permission for video calls
    if (type === 'video' && cameraPermission && !cameraPermission.granted) {
      requestCameraPermission();
    }

    // Simulate call connection
    const connectionTimer = setTimeout(() => {
      setIsCallConnected(true);
    }, 2000);

    // Start call duration timer when connected
    let durationTimer: NodeJS.Timeout | number;
    if (isCallConnected) {
      durationTimer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }

    return () => {
      clearTimeout(connectionTimer);
      if (durationTimer) clearInterval(durationTimer as NodeJS.Timeout);
    };
  }, [isCallConnected, type, cameraPermission]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    if (onEndCall) {
      onEndCall();
    }
    router.back();
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
  };

  const toggleCamera = () => {
    setIsCameraOn(!isCameraOn);
  };

  const switchCamera = () => {
    setCameraType(cameraType === 'back' ? 'front' : 'back');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      <View style={styles.header}>
        <Text style={styles.contactName}>{contactName}</Text>
        <Text style={styles.callStatus}>
          {isCallConnected ? formatDuration(callDuration) : 'Appel en cours...'}
        </Text>
      </View>

      {type === 'video' && (
        <View style={styles.videoContainer}>
          <Image source={{ uri: contactAvatar }} style={styles.remoteVideo} />
          <View style={styles.localVideoContainer}>
            {cameraPermission?.granted && isCameraOn ? (
              <CameraView
                style={styles.camera}
                facing={cameraType}
              />
            ) : (
              <Image
                source={{ uri: 'https://via.placeholder.com/100' }}
                style={styles.localVideo}
              />
            )}
          </View>
        </View>
      )}

      {type === 'audio' && (
        <View style={styles.audioContainer}>
          <Image source={{ uri: contactAvatar }} style={styles.contactAvatar} />
          <Text style={styles.callingText}>
            {isCallConnected ? 'Appel en cours' : 'Appel en cours...'}
          </Text>
        </View>
      )}

      <View style={styles.controlsContainer}>
        <View style={styles.controlsRow}>
          {type === 'audio' && (
            <TouchableOpacity
              style={[styles.controlButton, isMuted && styles.activeControl]}
              onPress={toggleMute}
            >
              <Ionicons 
                name={isMuted ? "mic-off" : "mic"} 
                size={24} 
                color="#fff" 
              />
            </TouchableOpacity>
          )}

          {type === 'video' && (
            <>
              <TouchableOpacity
                style={[styles.controlButton, isMuted && styles.activeControl]}
                onPress={toggleMute}
              >
                <Ionicons 
                  name={isMuted ? "mic-off" : "mic"} 
                  size={24} 
                  color="#fff" 
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlButton, !isCameraOn && styles.activeControl]}
                onPress={toggleCamera}
              >
                <Ionicons name={isCameraOn ? "videocam" : "videocam-off"} size={24} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlButton}
                onPress={switchCamera}
              >
                <Ionicons name="camera-reverse" size={24} color="#fff" />
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={[styles.controlButton, isSpeakerOn && styles.activeControl]}
            onPress={toggleSpeaker}
          >
            <Ionicons 
              name={isSpeakerOn ? "volume-high" : "volume-medium"} 
              size={24} 
              color="#fff" 
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.controlButton, styles.endCallButton]}
          onPress={handleEndCall}
        >
          <Ionicons name="call" size={32} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
  },
  contactName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  callStatus: {
    fontSize: 16,
    color: '#8e8e93',
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  remoteVideo: {
    flex: 1,
    resizeMode: 'cover',
  },
  localVideoContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 100,
    height: 150,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
  },
  localVideo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
camera: {
    width: '100%',
    height: '100%',
  },
  },
  audioContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactAvatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 20,
  },
  callingText: {
    fontSize: 18,
    color: '#8e8e93',
  },
  controlsContainer: {
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingHorizontal: 20,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeControl: {
    backgroundColor: '#007AFF',
  },
  endCallButton: {
    backgroundColor: '#FF3B30',
    alignSelf: 'center',
    transform: [{ rotate: '135deg' }],
  },
});