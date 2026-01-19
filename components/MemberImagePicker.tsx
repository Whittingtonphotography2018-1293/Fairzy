import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Image as ImageIcon } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

interface MemberImagePickerProps {
  currentPhotoUrl?: string | null;
  onPhotoSelected: (photoUrl: string) => void;
  size?: number;
}

export function MemberImagePicker({
  currentPhotoUrl,
  onPhotoSelected,
  size = 80,
}: MemberImagePickerProps) {
  const [uploading, setUploading] = useState(false);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status: cameraStatus } =
        await ImagePicker.requestCameraPermissionsAsync();
      const { status: libraryStatus } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need camera and photo library permissions to upload photos.'
        );
        return false;
      }
    }
    return true;
  };

  const uploadImage = async (uri: string) => {
    try {
      setUploading(true);

      const response = await fetch(uri);
      const blob = await response.blob();

      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('member-photos')
        .upload(filePath, blob, {
          contentType: `image/${fileExt}`,
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('member-photos').getPublicUrl(filePath);

      onPhotoSelected(publicUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    Alert.alert('Select Photo', 'Choose an option', [
      {
        text: 'Take Photo',
        onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });

          if (!result.canceled && result.assets[0]) {
            await uploadImage(result.assets[0].uri);
          }
        },
      },
      {
        text: 'Choose from Library',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });

          if (!result.canceled && result.assets[0]) {
            await uploadImage(result.assets[0].uri);
          }
        },
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ]);
  };

  return (
    <TouchableOpacity
      style={[styles.container, { width: size, height: size }]}
      onPress={pickImage}
      disabled={uploading}
    >
      {uploading ? (
        <View style={[styles.placeholder, { borderRadius: size / 2 }]}>
          <ActivityIndicator size="small" color="#007AFF" />
        </View>
      ) : currentPhotoUrl ? (
        <Image
          source={{ uri: currentPhotoUrl }}
          style={[styles.image, { borderRadius: size / 2 }]}
        />
      ) : (
        <View style={[styles.placeholder, { borderRadius: size / 2 }]}>
          <ImageIcon size={size * 0.4} color="#999" />
          <Text style={styles.placeholderText}>Add Photo</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
  },
});
