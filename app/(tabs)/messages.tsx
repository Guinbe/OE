import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { Text } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import { supabase, Message, ChatGroup, User } from '@/lib/supabase';
import { useUser } from '../contexts/UserContext';


export default function MessagesScreen() {
  const router = useRouter();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'chats' | 'groups'>('chats');
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [searchText, setSearchText] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  
  const [chats, setChats] = useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadChats();
      loadAvailableUsers();
    }
  }, [user]);

  useEffect(() => {
    if (selectedChat) {
      loadMessages();
    }
  }, [selectedChat]);

  const loadChats = async () => {
    try {
      // Load groups where user is a member
      const { data: groups, error: groupsError } = await supabase
        .from('chat_groups')
        .select(`
          *,
          group_members!inner(user_id)
        `)
        .eq('group_members.user_id', user?.id);

      if (groupsError) {
        console.error('Error loading groups:', groupsError);
        return;
      }

      // Transform groups to chat format
      const groupChats = (groups || []).map(group => ({
        id: group.id,
        name: group.name,
        lastMessage: 'Groupe créé',
        timestamp: new Date(group.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        unread: 0,
        type: 'group',
        avatar: 'https://via.placeholder.com/50',
      }));

      setChats(groupChats);
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .neq('id', user?.id);

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
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey(full_name)
        `)
        .eq('group_id', selectedChat)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      const formattedMessages = (data || []).map(msg => ({
        id: msg.id,
        sender: msg.sender?.full_name || 'Utilisateur',
        content: msg.content,
        timestamp: new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        isOwn: msg.sender_id === user?.id,
        type: msg.message_type,
        file_url: msg.file_url,
      }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };
  const handleSendMessage = async () => {
    if (messageText.trim()) {
      try {
        const { error } = await supabase
          .from('messages')
          .insert({
            sender_id: user?.id,
            group_id: selectedChat,
            content: messageText,
            message_type: 'text',
          });

        if (error) {
          console.error('Error sending message:', error);
          Alert.alert('Erreur', 'Impossible d\'envoyer le message');
          return;
        }

        setMessageText('');
        loadMessages(); // Reload messages
      } catch (error) {
        console.error('Error sending message:', error);
        Alert.alert('Erreur', 'Une erreur est survenue');
      }
    }
  };

  const uploadFile = async (uri: string, type: 'image' | 'file' | 'voice') => {
    try {
      const fileExt = uri.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from('message-files')
        .upload(filePath, {
          uri,
          type: type === 'image' ? 'image/jpeg' : 'application/octet-stream',
          name: fileName,
        } as any);

      if (error) {
        console.error('Error uploading file:', error);
        return null;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('message-files')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    }
  };

  const sendFileMessage = async (fileUrl: string, messageType: 'image' | 'file' | 'voice', content: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user?.id,
          group_id: selectedChat,
          content,
          message_type: messageType,
          file_url: fileUrl,
        });

      if (error) {
        console.error('Error sending file message:', error);
        Alert.alert('Erreur', 'Impossible d\'envoyer le fichier');
        return;
      }

      loadMessages(); // Reload messages
    } catch (error) {
      console.error('Error sending file message:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    }
  };

  const handleImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        const fileUrl = await uploadFile(result.assets[0].uri, 'image');
        if (fileUrl) {
          await sendFileMessage(fileUrl, 'image', 'Image partagée');
        }
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
    setShowActionModal(false);
  };

  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
      });

      if (result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const fileUrl = await uploadFile(file.uri, 'file');
        if (fileUrl) {
          await sendFileMessage(fileUrl, 'file', file.name || 'Fichier');
        }
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sélectionner le fichier');
    }
    setShowActionModal(false);
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      if (uri) {
        const fileUrl = await uploadFile(uri, 'voice');
        if (fileUrl) {
          await sendFileMessage(fileUrl, 'voice', 'Message vocal');
        }
      }
      
      setRecording(null);
      setIsRecording(false);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'arrêter l\'enregistrement');
    }
  };

  const handleCreateGroup = async () => {
    if (groupName.trim() && selectedUsers.length > 0) {
      try {
        // Create group
        const { data: group, error: groupError } = await supabase
          .from('chat_groups')
          .insert({
            name: groupName,
            description: groupDescription,
            created_by: user?.id,
          })
          .select()
          .single();

        if (groupError) {
          console.error('Error creating group:', groupError);
          Alert.alert('Erreur', 'Impossible de créer le groupe');
          return;
        }

        // Add members to group
        const members = selectedUsers.map(userId => ({
          group_id: group.id,
          user_id: userId,
        }));

        // Add creator to group
        members.push({
          group_id: group.id,
          user_id: user?.id!,
        });

        const { error: membersError } = await supabase
          .from('group_members')
          .insert(members);

        if (membersError) {
          console.error('Error adding members:', membersError);
          Alert.alert('Erreur', 'Impossible d\'ajouter les membres');
          return;
        }

        setGroupName('');
        setGroupDescription('');
        setSelectedUsers([]);
        setShowNewGroupModal(false);
        loadChats(); // Reload chats
      } catch (error) {
        console.error('Error creating group:', error);
        Alert.alert('Erreur', 'Une erreur est survenue');
      }
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const renderMessage = ({ item }: { item: any }) => (
    <View style={[styles.messageContainer, item.isOwn && styles.ownMessageContainer]}>
      {!item.isOwn && (
        <Image
          source={{ uri: 'https://via.placeholder.com/30' }}
          style={styles.messageAvatar}
        />
      )}
      <View style={[styles.messageBubble, item.isOwn && styles.ownMessageBubble]}>
        {!item.isOwn && <Text style={styles.senderName}>{item.sender}</Text>}
        
        {item.type === 'text' && (
          <Text style={[styles.messageText, item.isOwn && styles.ownMessageText]}>
            {item.content}
          </Text>
        )}
        
        {item.type === 'image' && (
          <Image source={{ uri: item.file_url }} style={styles.messageImage} />
        )}
        
        {item.type === 'file' && (
          <TouchableOpacity 
            style={styles.fileContainer}
            onPress={() => {
              // Open file URL
              if (item.file_url) {
                // You can implement file opening logic here
              }
            }}
          >
            <Ionicons name="document" size={20} color={item.isOwn ? '#ffffff' : '#007bff'} />
            <Text style={[styles.fileText, item.isOwn && styles.ownFileText]}>
              {item.content}
            </Text>
          </TouchableOpacity>
        )}
        
        {item.type === 'voice' && (
          <TouchableOpacity 
            style={styles.voiceContainer}
            onPress={() => {
              // Play voice message
              if (item.file_url) {
                // You can implement audio playback logic here
              }
            }}
          >
            <Ionicons name="play" size={20} color={item.isOwn ? '#ffffff' : '#007bff'} />
            <Text style={[styles.voiceText, item.isOwn && styles.ownVoiceText]}>
              Message vocal
            </Text>
          </TouchableOpacity>
        )}
        
        <Text style={[styles.messageTime, item.isOwn && styles.ownMessageTime]}>
          {item.timestamp}
        </Text>
      </View>
    </View>
  );

  const renderChatItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => setSelectedChat(item.id)}
    >
      <Image source={{ uri: item.avatar }} style={styles.avatar} />
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName}>
            {item.name}
          </Text>
          <Text style={styles.chatTime}>{item.timestamp}</Text>
        </View>
        <View style={styles.chatFooter}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage}
          </Text>
          {item.unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const filteredUsers = availableUsers.filter(user =>
    user.full_name.toLowerCase().includes(searchText.toLowerCase()) ||
    (user.agency && user.agency.toLowerCase().includes(searchText.toLowerCase()))
  );

  const renderChatList = () => (
    <View style={styles.chatListContainer}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6c757d" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par nom ou groupe..."
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'chats' && styles.activeTab]}
          onPress={() => setActiveTab('chats')}
        >
          <Text style={[styles.tabText, activeTab === 'chats' && styles.activeTabText]}>
            Discussions
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'groups' && styles.activeTab]}
          onPress={() => setActiveTab('groups')}
        >
          <Text style={[styles.tabText, activeTab === 'groups' && styles.activeTabText]}>
            Groupes
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredChats}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={styles.newChatButton}
        onPress={() => setShowNewGroupModal(true)}
      >
        <Ionicons name="add" size={24} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );

  const renderChatView = () => {
    const currentChat = chats.find(chat => chat.id === selectedChat);
    
    return (
      <KeyboardAvoidingView
        style={styles.chatViewContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.chatViewHeader}>
          <TouchableOpacity onPress={() => setSelectedChat(null)}>
            <Ionicons name="arrow-back" size={24} color="#007bff" />
          </TouchableOpacity>
          <Image source={{ uri: currentChat?.avatar || '' }} style={styles.chatHeaderAvatar} />
          <View style={styles.chatHeaderInfo}>
            <Text style={styles.chatHeaderName}>{currentChat?.name}</Text>
            <Text style={styles.chatHeaderStatus}>En ligne</Text>
          </View>
        </View>

        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.attachmentButton}
            onPress={() => setShowActionModal(true)}
          >
            <Ionicons name="attach" size={24} color="#6c757d" />
          </TouchableOpacity>
          <TextInput
            style={styles.messageInput}
            placeholder="Écrire un message..."
            value={messageText}
            onChangeText={setMessageText}
            multiline
          />
          {isRecording ? (
            <TouchableOpacity
              style={styles.recordingContainer}
              onPress={stopRecording}
            >
              <Ionicons name="stop" size={20} color="#ffffff" />
              <Text style={styles.recordingText}>Enregistrement...</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.voiceButton}
              onPress={startRecording}
            >
              <Ionicons name="mic" size={24} color="#6c757d" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.sendButton, messageText.trim() && styles.sendButtonActive]}
            onPress={handleSendMessage}
            disabled={!messageText.trim()}
          >
            <Ionicons name="send" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Action Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showActionModal}
          onRequestClose={() => setShowActionModal(false)}
        >
          <View style={styles.actionModalContainer}>
            <View style={styles.actionModalContent}>
              <TouchableOpacity style={styles.actionButton} onPress={handleImagePick}>
                <Ionicons name="image" size={24} color="#007bff" />
                <Text style={styles.actionButtonText}>Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleFilePick}>
                <Ionicons name="document" size={24} color="#007bff" />
                <Text style={styles.actionButtonText}>Fichier</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => setShowActionModal(false)}
              >
                <Ionicons name="close" size={24} color="#dc3545" />
                <Text style={styles.actionButtonText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    );
  };

  return (
    <>
      {selectedChat ? renderChatView() : renderChatList()}
      
      <Modal
        animationType="slide"
        transparent={true}
        visible={showNewGroupModal}
        onRequestClose={() => {
          setShowNewGroupModal(false);
          setGroupName('');
          setGroupDescription('');
          setSelectedUsers([]);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Créer un nouveau groupe</Text>
            
            <TextInput
              style={[styles.input, styles.groupNameInput]}
              placeholder="Nom du groupe"
              value={groupName}
              onChangeText={setGroupName}
              maxLength={50}
            />
            
            <TextInput
              style={[styles.input, styles.groupDescriptionInput]}
              placeholder="Description du groupe (optionnel)"
              value={groupDescription}
              onChangeText={setGroupDescription}
              multiline
              numberOfLines={3}
              maxLength={200}
              textAlignVertical="top"
            />
            
            <Text style={styles.sectionTitle}>
              Sélectionner des membres ({selectedUsers.length} sélectionné{selectedUsers.length > 1 ? 's' : ''})
            </Text>
            
            <ScrollView style={styles.userList}>
              {availableUsers.map((availableUser) => (
                <TouchableOpacity
                  key={availableUser.id}
                  style={[
                    styles.userItem,
                    selectedUsers.includes(availableUser.id) && styles.selectedUserItem
                  ]}
                  onPress={() => toggleUserSelection(availableUser.id)}
                >
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>
                      {availableUser.full_name.charAt(0)}
                    </Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{availableUser.full_name}</Text>
                    <Text style={styles.userCity}>{availableUser.agency || 'Aucune agence'}</Text>
                  </View>
                  <View style={[
                    styles.checkbox,
                    selectedUsers.includes(availableUser.id) && styles.checkboxSelected
                  ]}>
                    {selectedUsers.includes(availableUser.id) && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setShowNewGroupModal(false);
                  setGroupName('');
                  setGroupDescription('');
                  setSelectedUsers([]);
                }}
              >
                <Text style={styles.buttonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.createButton,
                  (!groupName.trim() || selectedUsers.length === 0) && styles.disabledButton
                ]}
                onPress={handleCreateGroup}
                disabled={!groupName.trim() || selectedUsers.length === 0}
              >
                <Text style={[
                  styles.buttonText,
                  (!groupName.trim() || selectedUsers.length === 0) && styles.disabledButtonText
                ]}>
                  Créer le groupe
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  chatListContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: 75,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginBottom: 8,
    marginTop: 0,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007bff',
  },
  tabText: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
    paddingVertical: 12,
  },
  activeTabText: {
    color: '#007bff',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#212529',
  },
  chatItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  chatTime: {
    fontSize: 12,
    color: '#6c757d',
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: '#6c757d',
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: '#007bff',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  newChatButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  chatViewContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  chatViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingTop: 60,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  chatHeaderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 12,
    marginRight: 12,
  },
  chatHeaderInfo: {
    flex: 1,
  },
  chatHeaderName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  chatHeaderStatus: {
    fontSize: 12,
    color: '#28a745',
  },
  messagesList: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  ownMessageContainer: {
    flexDirection: 'row-reverse',
  },
  messageAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '70%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  ownMessageBubble: {
    backgroundColor: '#007bff',
  },
  senderName: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  ownMessageText: {
    color: '#ffffff',
  },
  messageTime: {
    fontSize: 11,
    color: '#6c757d',
    marginTop: 4,
    textAlign: 'right',
  },
  ownMessageTime: {
    color: '#ffffff',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  attachmentButton: {
    padding: 8,
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 8,
    maxHeight: 100,
  },
  voiceButton: {
    padding: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#007bff',
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginVertical: 4,
  },
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  fileText: {
    fontSize: 16,
    color: '#007bff',
  },
  ownFileText: {
    color: '#ffffff',
  },
  voiceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  voiceText: {
    fontSize: 16,
    color: '#007bff',
  },
  ownVoiceText: {
    color: '#ffffff',
  },
  actionModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  actionModalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  actionButtonText: {
    fontSize: 16,
    marginLeft: 15,
  },
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  recordingText: {
    color: '#ffffff',
    marginLeft: 8,
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#1a1a1a',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  groupNameInput: {
    fontSize: 16,
  },
  groupDescriptionInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#1a1a1a',
  },
  userList: {
    maxHeight: 300,
    marginBottom: 20,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 5,
  },
  selectedUserItem: {
    backgroundColor: '#e3f2fd',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  userCity: {
    fontSize: 14,
    color: '#6c757d',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#007bff',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#e9ecef',
  },
  createButton: {
    backgroundColor: '#007bff',
  },
  disabledButton: {
    backgroundColor: '#e9ecef',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  cancelButtonText: {
    color: '#1a1a1a',
  },
  disabledButtonText: {
    color: '#6c757d',
  },
});
        content: messageText,
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        isOwn: true,
        type: 'text',
      };
      setMessages([...messages, newMessage]);
      setMessageText('');
    }
  };

  const handleImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        const newMessage: Message = {
          id: Date.now().toString(),
          sender: 'Moi',
          content: result.assets[0].uri,
          timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          isOwn: true,
          type: 'image',
        };
        setMessages([...messages, newMessage]);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
    setShowActionModal(false);
  };

  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
      });

      if (result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const newMessage: Message = {
          id: Date.now().toString(),
          sender: 'Moi',
          content: file.name || 'Fichier',
          timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          isOwn: true,
          type: 'file',
        };
        setMessages([...messages, newMessage]);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sélectionner le fichier');
    }
    setShowActionModal(false);
  };

  const startRecording = async () => {
    try {
      if (permissionResponse?.status !== 'granted') {
        await requestPermission();
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
      Alert.alert('Erreur', 'Impossible de démarrer l\'enregistrement');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      if (uri) {
        const newMessage: Message = {
          id: Date.now().toString(),
          sender: 'Moi',
          content: uri,
          timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          isOwn: true,
          type: 'voice',
        };
        setMessages([...messages, newMessage]);
      }
      
      setRecording(null);
      setIsRecording(false);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'arrêter l\'enregistrement');
    }
  };

  const renderChatItem = ({ item }: { item: Chat }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => setSelectedChat(item.id)}
    >
      <Image source={{ uri: item.avatar }} style={styles.avatar} />
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName}>
            {item.type === 'private' && item.city
              ? `${item.name} (${item.city})`
              : item.name
            }
          </Text>
          <Text style={styles.chatTime}>{item.timestamp}</Text>
        </View>
        <View style={styles.chatFooter}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage}
          </Text>
          {item.unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const filteredUsers = availableUsers.filter(user =>
    user.name.toLowerCase().includes(searchText.toLowerCase()) ||
    user.city.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleCreateGroup = () => {
    if (groupName.trim() && selectedUsers.length > 0) {
      const newGroup: Chat = {
        id: Date.now().toString(),
        name: groupName,
        lastMessage: groupDescription || 'Nouveau groupe créé',
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        unread: 0,
        type: 'group',
        avatar: 'https://via.placeholder.com/50',
      };
      setChats([...chats, newGroup]);
      setGroupName('');
      setGroupDescription('');
      setSelectedUsers([]);
      setShowNewGroupModal(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.messageContainer, item.isOwn && styles.ownMessageContainer]}>
      {!item.isOwn && (
        <Image
          source={{ uri: 'https://via.placeholder.com/30' }}
          style={styles.messageAvatar}
        />
      )}
      <View style={[styles.messageBubble, item.isOwn && styles.ownMessageBubble]}>
        {!item.isOwn && <Text style={styles.senderName}>{item.sender}</Text>}
        
        {item.type === 'text' && (
          <Text style={[styles.messageText, item.isOwn && styles.ownMessageText]}>
            {item.content}
          </Text>
        )}
        
        {item.type === 'image' && (
          <Image source={{ uri: item.content }} style={styles.messageImage} />
        )}
        
        {item.type === 'file' && (
          <View style={styles.fileContainer}>
            <Ionicons name="document" size={20} color={item.isOwn ? '#ffffff' : '#007bff'} />
            <Text style={[styles.fileText, item.isOwn && styles.ownFileText]}>
              {item.content}
            </Text>
          </View>
        )}
        
        {item.type === 'voice' && (
          <TouchableOpacity style={styles.voiceContainer}>
            <Ionicons name="play" size={20} color={item.isOwn ? '#ffffff' : '#007bff'} />
            <Text style={[styles.voiceText, item.isOwn && styles.ownVoiceText]}>
              Message vocal
            </Text>
          </TouchableOpacity>
        )}
        
        <Text style={[styles.messageTime, item.isOwn && styles.ownMessageTime]}>
          {item.timestamp}
        </Text>
      </View>
    </View>
  );

  const renderChatList = () => (
    <View style={styles.chatListContainer}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6c757d" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par nom ou groupe..."
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'chats' && styles.activeTab]}
          onPress={() => setActiveTab('chats')}
        >
          <Text style={[styles.tabText, activeTab === 'chats' && styles.activeTabText]}>
            Discussions
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'groups' && styles.activeTab]}
          onPress={() => setActiveTab('groups')}
        >
          <Text style={[styles.tabText, activeTab === 'groups' && styles.activeTabText]}>
            Groupes
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredChats.filter(chat => activeTab === 'chats' ? chat.type === 'private' : chat.type === 'group')}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={styles.newChatButton}
        onPress={() => setShowNewGroupModal(true)}
      >
        <Ionicons name="add" size={24} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );

  const renderChatView = () => {
    const currentChat = chats.find(chat => chat.id === selectedChat);
    
    return (
      <KeyboardAvoidingView
        style={styles.chatViewContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.chatViewHeader}>
          <TouchableOpacity onPress={() => setSelectedChat(null)}>
            <Ionicons name="arrow-back" size={24} color="#007bff" />
          </TouchableOpacity>
          <Image source={{ uri: currentChat?.avatar || '' }} style={styles.chatHeaderAvatar} />
          <View style={styles.chatHeaderInfo}>
            <Text style={styles.chatHeaderName}>{currentChat?.name}</Text>
            <Text style={styles.chatHeaderStatus}>En ligne</Text>
          </View>
          <TouchableOpacity onPress={() => {
            const chat = chats.find(c => c.id === selectedChat);
            if (chat) {
              router.push({
                pathname: '/CallScreen',
                params: {
                  type: 'audio',
                  contactName: chat.name,
                  contactAvatar: chat.avatar
                }
              });
            }
          }}>
            <Ionicons name="call" size={24} color="#007bff" style={{ marginRight: 16 }} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => {
            const chat = chats.find(c => c.id === selectedChat);
            if (chat) {
              router.push({
                pathname: '/CallScreen',
                params: {
                  type: 'video',
                  contactName: chat.name,
                  contactAvatar: chat.avatar
                }
              });
            }
          }}>
            <Ionicons name="videocam" size={24} color="#007bff" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.attachmentButton}
            onPress={() => setShowActionModal(true)}
          >
            <Ionicons name="attach" size={24} color="#6c757d" />
          </TouchableOpacity>
          <TextInput
            style={styles.messageInput}
            placeholder="Écrire un message..."
            value={messageText}
            onChangeText={setMessageText}
            multiline
          />
          {isRecording ? (
            <TouchableOpacity
              style={styles.recordingContainer}
              onPress={stopRecording}
            >
              <Ionicons name="stop" size={20} color="#ffffff" />
              <Text style={styles.recordingText}>Enregistrement...</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.voiceButton}
              onPress={startRecording}
            >
              <Ionicons name="mic" size={24} color="#6c757d" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.sendButton, messageText.trim() && styles.sendButtonActive]}
            onPress={handleSendMessage}
            disabled={!messageText.trim()}
          >
            <Ionicons name="send" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  };

  return (
    <>
      {selectedChat ? renderChatView() : renderChatList()}
      
      <Modal
        animationType="slide"
        transparent={true}
        visible={showNewGroupModal}
        onRequestClose={() => {
          setShowNewGroupModal(false);
          setGroupName('');
          setGroupDescription('');
          setSelectedUsers([]);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Créer un nouveau groupe</Text>
            
            <TextInput
              style={[styles.input, styles.groupNameInput]}
              placeholder="Nom du groupe"
              value={groupName}
              onChangeText={setGroupName}
              maxLength={50}
            />
            
            <TextInput
              style={[styles.input, styles.groupDescriptionInput]}
              placeholder="Description du groupe (optionnel)"
              value={groupDescription}
              onChangeText={setGroupDescription}
              multiline
              numberOfLines={3}
              maxLength={200}
              textAlignVertical="top"
            />
            
            <Text style={styles.sectionTitle}>
              Sélectionner des membres ({selectedUsers.length} sélectionné{selectedUsers.length > 1 ? 's' : ''})
            </Text>
            
            <ScrollView style={styles.userList}>
              {availableUsers.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  style={[
                    styles.userItem,
                    selectedUsers.includes(user.id) && styles.selectedUserItem
                  ]}
                  onPress={() => toggleUserSelection(user.id)}
                >
                  <Image source={{ uri: user.avatar }} style={styles.userAvatar} />
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.name}</Text>
                    <Text style={styles.userCity}>{user.city}</Text>
                  </View>
                  <View style={[
                    styles.checkbox,
                    selectedUsers.includes(user.id) && styles.checkboxSelected
                  ]}>
                    {selectedUsers.includes(user.id) && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setShowNewGroupModal(false);
                  setGroupName('');
                  setGroupDescription('');
                  setSelectedUsers([]);
                }}
              >
                <Text style={styles.buttonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.createButton,
                  (!groupName.trim() || selectedUsers.length === 0) && styles.disabledButton
                ]}
                onPress={handleCreateGroup}
                disabled={!groupName.trim() || selectedUsers.length === 0}
              >
                <Text style={[
                  styles.buttonText,
                  (!groupName.trim() || selectedUsers.length === 0) && styles.disabledButtonText
                ]}>
                  Créer le groupe
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Incoming Call Modal */}
      <Modal
        visible={showIncomingCallModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.incomingCallModal}>
          <View style={styles.incomingCallContent}>
            <Image
              source={{ uri: incomingCallData?.callerAvatar || 'https://via.placeholder.com/100' }}
              style={styles.callerAvatar}
            />
            <Text style={styles.callerName}>{incomingCallData?.callerName || 'Appel entrant'}</Text>
            <Text style={styles.callType}>
              {incomingCallData?.type === 'audio' ? 'Appel audio' : 'Appel vidéo'}
            </Text>
            
            <View style={styles.incomingCallButtons}>
              <TouchableOpacity
                style={[styles.callActionButton, styles.rejectButton]}
                onPress={() => {
                  setShowIncomingCallModal(false);
                  setIncomingCallData(null);
                }}
              >
                <Ionicons name="close" size={32} color="#fff" />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.callActionButton, styles.acceptButton]}
                onPress={() => {
                  if (incomingCallData) {
                    setShowIncomingCallModal(false);
                    router.push({
                      pathname: '/CallScreen',
                      params: {
                        type: incomingCallData.type,
                        contactName: incomingCallData.callerName,
                        contactAvatar: incomingCallData.callerAvatar
                      }
                    });
                  }
                }}
              >
                <Ionicons name="call" size={32} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  chatListContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: 75, // Increased from 10 to 35 (25mm down)
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginBottom: 8,
    marginTop: 0, // Added margin to move tabs down by 25mm
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007bff',
  },
  tabText: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
    paddingVertical: 12,
  },
  activeTabText: {
    color: '#007bff',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#212529',
  },
  chatItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  chatTime: {
    fontSize: 12,
    color: '#6c757d',
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: '#6c757d',
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: '#007bff',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  newChatButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  chatViewContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  chatViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingTop: 60,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  chatHeaderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 12,
    marginRight: 12,
  },
  chatHeaderInfo: {
    flex: 1,
  },
  chatHeaderName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  chatHeaderStatus: {
    fontSize: 12,
    color: '#28a745',
  },
  callButton: {
    padding: 8,
    marginLeft: 8,
  },
  messagesList: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  ownMessageContainer: {
    flexDirection: 'row-reverse',
  },
  messageAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '70%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  ownMessageBubble: {
    backgroundColor: '#007bff',
  },
  senderName: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  ownMessageText: {
    color: '#ffffff',
  },
  messageTime: {
    fontSize: 11,
    color: '#6c757d',
    marginTop: 4,
    textAlign: 'right',
  },
  ownMessageTime: {
    color: '#ffffff',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  attachmentButton: {
    padding: 8,
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 8,
    maxHeight: 100,
  },
  voiceButton: {
    padding: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#007bff',
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginVertical: 4,
  },
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  fileText: {
    fontSize: 16,
    color: '#007bff',
  },
  ownFileText: {
    color: '#ffffff',
  },
  voiceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  voiceText: {
    fontSize: 16,
    color: '#007bff',
  },
  ownVoiceText: {
    color: '#ffffff',
  },
  actionModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  actionModalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  actionButtonText: {
    fontSize: 16,
    marginLeft: 15,
  },
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  recordingText: {
    color: '#ffffff',
    marginLeft: 8,
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#1a1a1a',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  groupNameInput: {
    fontSize: 16,
  },
  groupDescriptionInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#1a1a1a',
  },
  userList: {
    maxHeight: 300,
    marginBottom: 20,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 5,
  },
  selectedUserItem: {
    backgroundColor: '#e3f2fd',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  userCity: {
    fontSize: 14,
    color: '#6c757d',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#007bff',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#e9ecef',
  },
  createButton: {
    backgroundColor: '#007bff',
  },
  disabledButton: {
    backgroundColor: '#e9ecef',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  cancelButtonText: {
    color: '#1a1a1a',
  },
  disabledButtonText: {
    color: '#6c757d',
  },
  incomingCallModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  incomingCallContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: '80%',
    maxWidth: 300,
  },
  callerAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
  },
  callerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  callType: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 30,
  },
  incomingCallButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  callActionButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
  },
  rejectButton: {
    backgroundColor: '#ff4444',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
});