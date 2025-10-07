import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bluetooth, Edit2, Save, X } from 'lucide-react-native';
import { useHealthData } from '@/contexts/HealthDataContext';
import colors from '@/constants/colors';

type TabType = 'profile' | 'medical';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { userProfile, updateUserProfile } = useHealthData();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedProfile, setEditedProfile] = useState(userProfile);

  const handleSave = () => {
    updateUserProfile(editedProfile);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedProfile(userProfile);
    setIsEditing(false);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => (isEditing ? handleSave() : setIsEditing(true))}
          >
            {isEditing ? <Save size={20} color={colors.primary} /> : <Edit2 size={20} color={colors.primary} />}
          </TouchableOpacity>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'profile' && styles.tabActive]}
            onPress={() => setActiveTab('profile')}
          >
            <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'medical' && styles.tabActive]}
            onPress={() => setActiveTab('medical')}
          >
            <Text style={[styles.tabText, activeTab === 'medical' && styles.tabTextActive]}>Medical Info</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'profile' ? (
          <View style={styles.content}>
            <View style={styles.profileCard}>
              <Image source={{ uri: userProfile.photoUrl }} style={styles.avatar} />
              <Text style={styles.name}>{userProfile.name}</Text>
              <Text style={styles.info}>
                {userProfile.age} years • {userProfile.gender}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Connected Devices</Text>
              <View style={styles.deviceCard}>
                <View style={styles.deviceIcon}>
                  <Bluetooth size={24} color={colors.primary} />
                </View>
                <View style={styles.deviceInfo}>
                  <Text style={styles.deviceName}>MedBand Pro X</Text>
                  <Text style={styles.deviceStatus}>Connected • Battery 87%</Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.content}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Blood Type</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={editedProfile.bloodType}
                  onChangeText={(text) => setEditedProfile({ ...editedProfile, bloodType: text })}
                  placeholder="Blood Type"
                />
              ) : (
                <View style={styles.infoCard}>
                  <Text style={styles.infoValue}>{userProfile.bloodType}</Text>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Medical Conditions</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editedProfile.conditions.join(', ')}
                  onChangeText={(text) =>
                    setEditedProfile({ ...editedProfile, conditions: text.split(',').map((s) => s.trim()) })
                  }
                  placeholder="Conditions (comma separated)"
                  multiline
                />
              ) : (
                <View style={styles.infoCard}>
                  {userProfile.conditions.map((condition, index) => (
                    <View key={index} style={styles.badge}>
                      <Text style={styles.badgeText}>{condition}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Allergies</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editedProfile.allergies.join(', ')}
                  onChangeText={(text) =>
                    setEditedProfile({ ...editedProfile, allergies: text.split(',').map((s) => s.trim()) })
                  }
                  placeholder="Allergies (comma separated)"
                  multiline
                />
              ) : (
                <View style={styles.infoCard}>
                  {userProfile.allergies.map((allergy, index) => (
                    <View key={index} style={[styles.badge, styles.badgeDanger]}>
                      <Text style={[styles.badgeText, styles.badgeTextDanger]}>{allergy}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Current Medications</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editedProfile.medications.join(', ')}
                  onChangeText={(text) =>
                    setEditedProfile({ ...editedProfile, medications: text.split(',').map((s) => s.trim()) })
                  }
                  placeholder="Medications (comma separated)"
                  multiline
                />
              ) : (
                <View style={styles.infoCard}>
                  {userProfile.medications.map((medication, index) => (
                    <Text key={index} style={styles.medicationText}>
                      • {medication}
                    </Text>
                  ))}
                </View>
              )}
            </View>

            {isEditing && (
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                <X size={20} color={colors.danger} />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: colors.text,
  },
  editButton: {
    padding: 8,
    backgroundColor: colors.white,
    borderRadius: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.white,
  },
  content: {
    paddingHorizontal: 20,
  },
  profileCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 4,
  },
  info: {
    fontSize: 14,
    color: colors.textMuted,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 12,
  },
  deviceCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  deviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 4,
  },
  deviceStatus: {
    fontSize: 12,
    color: colors.success,
  },
  infoCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text,
  },
  badge: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  badgeDanger: {
    backgroundColor: '#FFEBEE',
  },
  badgeTextDanger: {
    color: colors.danger,
  },
  medicationText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.danger,
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.danger,
  },
});
