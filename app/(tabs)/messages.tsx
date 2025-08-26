import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  SafeAreaView,
  Image,
  ScrollView,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import { useUser } from '../../contexts/UserContext';
import { supabase, Message, ChatGroup, GroupMember, User, uploadFile } from '@/lib/supabase';

interface GroupWithMembers extends ChatGroup {
  members?: User[];
  lastMessage?: Message;
}

const MessagesScreen = () => {
  const { user } = useUser();
  const [groups, setGroups] = useState<GroupWithMembers[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupWithMembers | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadGroups();
      loadUsers();
    }
  }, [user]);

  useEffect(() => {
    if (selectedGroup) {
      loadMessages();
      const subscription = subscribeToMessages();
      return () => {
        subscription?.unsubscribe();
      };
    }
  }, [selectedGroup]);

  // Dans le composant MessagesScreen
  const handleFileMessagePress = async (message: Message) => {
    if (!message.file_url) return;

    // Générer une URL signée et temporaire pour le fichier
    const { data, error } = await supabase.storage
      .from('message-files')
      .createSignedUrl(message.file_url, 60); // URL valide pendant 60 secondes

    if (error || !data) {
      Alert.alert('Erreur', 'Impossible de récupérer le fichier.');
      console.error('Error creating signed URL:', error);
      return;
    }

    const signedUrl = data.signedUrl;

    // Logique pour les messages vocaux
    if (message.message_type === 'voice') {
      try {
        if (sound) {
          await sound.unloadAsync(); // Décharger le son précédent
          if (playingMessageId === message.id) {
            setPlayingMessageId(null); // Arrêter la lecture si on clique à nouveau
            return;
          }
        }

        const { sound: newSound } = await Audio.Sound.createAsync({ uri: signedUrl });
        setSound(newSound);
        setPlayingMessageId(message.id);
        await newSound.playAsync();

        // Mettre à jour l'état quand le son est terminé
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            setPlayingMessageId(null);
          }
        });
      } catch (e) {
        console.error('Error playing sound:', e);
        Alert.alert('Erreur', 'Impossible de lire le message vocal.');
      }
    }
    // Logique pour les documents (utilise expo-linking pour ouvrir le navigateur)
    else if (message.message_type === 'file') {
      try {
        const { Linking } = require('react-native');
        const supported = await Linking.canOpenURL(signedUrl);
        if (supported) {
          await Linking.openURL(signedUrl);
        } else {
          Alert.alert('Erreur', "Impossible d'ouvrir ce lien.");
        }
      } catch (e) {
        console.error('Error opening link:', e);
      }
    }
  };

  // Sous-composant pour gérer le contenu asynchrone (images, etc.)
  const MessageContent = ({ message }: { message: Message }) => {
    const [fileUrl, setFileUrl] = useState<string | null>(null);

    useEffect(() => {
      // Générer l'URL signée pour les images
      if (message.message_type === 'image' && message.file_url) {
        supabase.storage
          .from('message-files')
          .createSignedUrl(message.file_url, 3600) // Valide 1 heure
          // .then(({ data }) => {
          //   if (data) {
          //     setFileUrl(data.signedUrl);
          //   }
          // });
          .then(({ data, error }) => {
            if (error) {
              console.error('Error creating signed URL in component:', error.message);
              return;
            }
            if (data) {
              setFileUrl(data.signedUrl);
            }
          });
      }
    }, [message]);

    if (message.message_type === 'text') {
      return <Text style={styles.messageText}>{message.content}</Text>;
    }

    if (message.message_type === 'image') {
      return fileUrl ? (
        <View>
          <Image source={{ uri: fileUrl }} style={styles.messageImage} />
          <Text style={styles.messageText}>{message.content}</Text>
        </View>
      ) : (
        <View style={styles.imagePlaceholder}>
          <Ionicons name="image-outline" size={50} color="#ccc" />
        </View>
      );
    }

    // Pour les fichiers et vocaux, on rend un bouton
    if (message.message_type === 'file' || message.message_type === 'voice') {
      const iconName = message.message_type === 'file' ? 'document' : 'mic';
      return (
        <View style={styles.fileMessage}>
          <Ionicons name={iconName} size={20} color="#007bff" />
          <Text style={styles.messageText}>{message.content}</Text>
        </View>
      );
    }

    return null;
  };
  //-- fin

  const loadGroups = async () => {
    try {
      const { data: groupsData, error } = await supabase
        .from('chat_groups')
        .select(`
          *,
          group_members!inner(user_id)
        `)
        .eq('group_members.user_id', user?.id);

      if (error) {
        console.error('Error loading groups:', error);
        return;
      }

      // Charger les membres et derniers messages pour chaque groupe
      const groupsWithDetails = await Promise.all(
        (groupsData || []).map(async (group) => {
          // Charger les membres
          const { data: membersData } = await supabase
            .from('group_members')
            .select(`
              user_id,
              users(full_name, email)
            `)
            .eq('group_id', group.id);

          // Charger le dernier message
          const { data: lastMessageData } = await supabase
            .from('messages')
            .select('*')
            .eq('group_id', group.id)
            .order('created_at', { ascending: false })
            .limit(1);

          return {
            ...group,
            members: membersData?.map(m => m.users) || [],
            lastMessage: lastMessageData?.[0] || null,
          };
        })
      );

      setGroups(groupsWithDetails);
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .neq('id', user?.id)
        .eq('status', 'active');

      if (error) {
        console.error('Error loading users:', error);
        return;
      }

      setAvailableUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadMessages = async () => {
    if (!selectedGroup) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey(full_name, email)
        `)
        .eq('group_id', selectedGroup.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const subscribeToMessages = () => {
    if (!selectedGroup) return null;

    return supabase
      .channel(`messages:${selectedGroup.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `group_id=eq.${selectedGroup.id}`,
        },
        (payload) => {
          loadMessages(); // Recharger les messages
        }
      )
      .subscribe();
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedGroup || !user) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          group_id: selectedGroup.id,
          content: newMessage.trim(),
          message_type: 'text',
        });

      if (error) {
        console.error('Error sending message:', error);
        Alert.alert('Erreur', 'Impossible d\'envoyer le message');
        return;
      }

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    }
  };

  const handleImagePicker = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        // mediaTypes: ImagePicker.MediaType.Image,
        mediaTypes: 'Images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const fileName = `image_${Date.now()}.jpg`;
        
        // Upload vers Supabase Storage
        const fileUrl = await uploadFile(asset, fileName);
        
        if (fileUrl) {
          await supabase
            .from('messages')
            .insert({
              sender_id: user?.id,
              group_id: selectedGroup?.id,
              content: 'Image partagée',
              message_type: 'image',
              file_url: fileUrl,
            });
        } else {
          Alert.alert('Erreur', 'Impossible d\'uploader l\'image');
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  const handleDocumentPicker = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const fileName = `file_${Date.now()}_${asset.name}`;
        
        // Upload vers Supabase Storage
        const fileUrl = await uploadFile(asset, fileName);
        
        if (fileUrl) {
          await supabase
            .from('messages')
            .insert({
              sender_id: user?.id,
              group_id: selectedGroup?.id,
              content: `Fichier: ${asset.name}`,
              message_type: 'file',
              file_url: fileUrl,
            });
        } else {
          Alert.alert('Erreur', 'Impossible d\'uploader le fichier');
        }
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner le fichier');
    }
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission requise', 'L\'accès au microphone est nécessaire pour enregistrer');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Erreur', 'Impossible de démarrer l\'enregistrement');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      if (uri) {
        const fileName = `voice_${Date.now()}.m4a`;
        
        // Upload vers Supabase Storage
        const fileUrl = await uploadFile({ uri, mimeType: 'audio/mp4' }, fileName);
        
        if (fileUrl) {
          await supabase
            .from('messages')
            .insert({
              sender_id: user?.id,
              group_id: selectedGroup?.id,
              content: 'Message vocal',
              message_type: 'voice',
              file_url: fileUrl,
            });
        } else {
          Alert.alert('Erreur', 'Impossible d\'uploader le message vocal');
        }
      }

      setRecording(null);
    } catch (error) {
      console.error('Error stopping recording:', error);
      Alert.alert('Erreur', 'Impossible d\'arrêter l\'enregistrement');
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom pour le groupe');
      return;
    }

    if (selectedMembers.length === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins un membre');
      return;
    }

    try {
      // Créer le groupe
      const { data: groupData, error: groupError } = await supabase
        .from('chat_groups')
        .insert({
          name: newGroupName.trim(),
          description: newGroupDescription.trim(),
          created_by: user?.id,
        })
        .select()
        .single();

      if (groupError) {
        console.error('Error creating group:', groupError);
        Alert.alert('Erreur', 'Impossible de créer le groupe');
        return;
      }

      // Ajouter les membres (y compris le créateur)
      const membersToAdd = [...selectedMembers, user?.id].map(userId => ({
        group_id: groupData.id,
        user_id: userId,
      }));

      const { error: membersError } = await supabase
        .from('group_members')
        .insert(membersToAdd);

      if (membersError) {
        console.error('Error adding members:', membersError);
        Alert.alert('Erreur', 'Impossible d\'ajouter les membres');
        return;
      }

      setNewGroupName('');
      setNewGroupDescription('');
      setSelectedMembers([]);
      setShowGroupModal(false);
      setShowMembersModal(false);
      loadGroups();

      Alert.alert('Succès', 'Groupe créé avec succès');
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    }
  };

  const renderGroupItem = ({ item }: { item: GroupWithMembers }) => (
    <TouchableOpacity
      style={styles.groupCard}
      onPress={() => setSelectedGroup(item)}
    >
      <View style={styles.groupIcon}>
        <Ionicons name="people" size={24} color="#007bff" />
      </View>
      <View style={styles.groupInfo}>
        <Text style={styles.groupName}>{item.name}</Text>
        <Text style={styles.groupDescription}>
          {item.lastMessage?.content || 'Aucun message'}
        </Text>
        <Text style={styles.groupMembers}>
          {item.members?.length || 0} membres
        </Text>
      </View>
      <View style={styles.groupTime}>
        <Text style={styles.timeText}>
          {item.lastMessage ? 
            new Date(item.lastMessage.created_at).toLocaleDateString('fr-FR') : 
            new Date(item.created_at).toLocaleDateString('fr-FR')
          }
        </Text>
      </View>
    </TouchableOpacity>
  );

  // const renderMessage = ({ item }: { item: Message }) => {
  //   const isOwnMessage = item.sender_id === user?.id;
    
  //   return (
  //     <View style={[
  //       styles.messageContainer,
  //       isOwnMessage ? styles.ownMessage : styles.otherMessage
  //     ]}>
  //       {!isOwnMessage && (
  //         <Text style={styles.senderName}>{item.sender?.full_name}</Text>
  //       )}
        
  //       {item.message_type === 'text' && (
  //         <Text style={styles.messageText}>{item.content}</Text>
  //       )}
        
  //       {item.message_type === 'image' && (
  //         <View>
  //           <Image source={{ uri: item.file_url }} style={styles.messageImage} />
  //           <Text style={styles.messageText}>{item.content}</Text>
  //         </View>
  //       )}
        
  //       {item.message_type === 'file' && (
  //         <View style={styles.fileMessage}>
  //           <Ionicons name="document" size={20} color="#007bff" />
  //           <Text style={styles.messageText}>{item.content}</Text>
  //         </View>
  //       )}
        
  //       {item.message_type === 'voice' && (
  //         <View style={styles.voiceMessage}>
  //           <Ionicons name="mic" size={20} color="#007bff" />
  //           <Text style={styles.messageText}>{item.content}</Text>
  //         </View>
  //       )}
        
  //       <Text style={styles.messageTime}>
  //         {new Date(item.created_at).toLocaleTimeString('fr-FR', {
  //           hour: '2-digit',
  //           minute: '2-digit'
  //         })}
  //       </Text>
  //     </View>
  //   );
  // };
  // Dans le composant MessagesScreen
  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.sender_id === user?.id;

    const isClickable = item.message_type === 'file' || item.message_type === 'voice';

    return (
      <TouchableOpacity
        disabled={!isClickable}
        onPress={() => handleFileMessagePress(item)}
      >
        <View style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessage : styles.otherMessage
        ]}>
          {!isOwnMessage && (
            <Text style={styles.senderName}>{item.sender?.full_name}</Text>
          )}

          <MessageContent message={item} />

          <Text style={styles.messageTime}>
            {new Date(item.created_at).toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (selectedGroup) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.chatHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedGroup(null)}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.chatHeaderInfo}>
            <Text style={styles.chatHeaderTitle}>{selectedGroup.name}</Text>
            <Text style={styles.chatHeaderSubtitle}>
              {selectedGroup.members?.length || 0} membres
            </Text>
          </View>
        </View>

        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.inputContainer}>
          <View style={styles.attachmentButtons}>
            <TouchableOpacity style={styles.attachmentButton} onPress={handleImagePicker}>
              <Ionicons name="image" size={20} color="#007bff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachmentButton} onPress={handleDocumentPicker}>
              <Ionicons name="document" size={20} color="#007bff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.attachmentButton, isRecording && styles.recordingButton]}
              onPress={isRecording ? stopRecording : startRecording}
            >
              <Ionicons name="mic" size={20} color={isRecording ? "#fff" : "#007bff"} />
            </TouchableOpacity>
          </View>
          
          <TextInput
            style={styles.messageInput}
            placeholder="Tapez votre message..."
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
          />
          
          <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity
          style={styles.newGroupButton}
          onPress={() => setShowGroupModal(true)}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.newGroupButtonText}>Nouveau groupe</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={groups}
        renderItem={renderGroupItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.groupsContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Aucun groupe de discussion</Text>
            <Text style={styles.emptySubtext}>
              Créez un nouveau groupe pour commencer à discuter
            </Text>
          </View>
        }
      />

      {/* Modal de création de groupe */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showGroupModal}
        onRequestClose={() => setShowGroupModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Créer un groupe</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Nom du groupe"
              value={newGroupName}
              onChangeText={setNewGroupName}
            />
            
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optionnel)"
              value={newGroupDescription}
              onChangeText={setNewGroupDescription}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowGroupModal(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.nextButton]}
                onPress={() => {
                  setShowGroupModal(false);
                  setShowMembersModal(true);
                }}
              >
                <Text style={styles.nextButtonText}>Suivant</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de sélection des membres */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showMembersModal}
        onRequestClose={() => setShowMembersModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sélectionner les membres</Text>
            
            <ScrollView style={styles.membersScrollView}>
              {availableUsers.map((availableUser) => (
                <TouchableOpacity
                  key={availableUser.id}
                  style={[
                    styles.memberItem,
                    selectedMembers.includes(availableUser.id) && styles.selectedMember
                  ]}
                  onPress={() => {
                    if (selectedMembers.includes(availableUser.id)) {
                      setSelectedMembers(selectedMembers.filter(id => id !== availableUser.id));
                    } else {
                      setSelectedMembers([...selectedMembers, availableUser.id]);
                    }
                  }}
                >
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>
                      {availableUser.full_name.charAt(0)}
                    </Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{availableUser.full_name}</Text>
                    <Text style={styles.memberEmail}>{availableUser.email}</Text>
                  </View>
                  {selectedMembers.includes(availableUser.id) && (
                    <Ionicons name="checkmark-circle" size={24} color="#28a745" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowMembersModal(false);
                  setSelectedMembers([]);
                }}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={handleCreateGroup}
              >
                <Text style={styles.createButtonText}>Créer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007bff',
    padding: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  newGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  newGroupButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  groupsContainer: {
    padding: 16,
  },
  groupCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  groupIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  groupDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  groupMembers: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  groupTime: {
    alignItems: 'flex-end',
  },
  timeText: {
    fontSize: 12,
    color: '#999',
  },
  chatHeader: {
    backgroundColor: '#007bff',
    padding: 40,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
  },
  chatHeaderInfo: {
    flex: 1,
  },
  chatHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  chatHeaderSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
  },
  messagesContainer: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  ownMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007bff',
    borderRadius: 18,
    borderBottomRightRadius: 4,
    padding: 12,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    padding: 12,
    elevation: 1,
  },
  senderName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '600',
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 4,
  },
  fileMessage: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voiceMessage: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageTime: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  attachmentButtons: {
    flexDirection: 'row',
    marginRight: 8,
  },
  attachmentButton: {
    padding: 8,
    marginRight: 4,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  recordingButton: {
    backgroundColor: '#dc3545',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#007bff',
    borderRadius: 20,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  nextButton: {
    backgroundColor: '#007bff',
  },
  createButton: {
    backgroundColor: '#28a745',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  membersScrollView: {
    maxHeight: 300,
    marginBottom: 20,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
  },
  selectedMember: {
    backgroundColor: '#e3f2fd',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  memberEmail: {
    fontSize: 14,
    color: '#666',
  },
});

export default MessagesScreen;