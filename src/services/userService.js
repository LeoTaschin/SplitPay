import { db } from '../config/firebase';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';

// Inicializar ou atualizar dados do usuário
export const initializeUser = async (user) => {
  try {
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      // Criar novo usuário
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        username: user.email.split('@')[0],
        photoURL: user.photoURL || null,
        friends: [],
        debtsAsCreditor: [],
        debtsAsDebtor: [],
        totalToReceive: 0,
        totalToPay: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      // Garantir que todos os campos necessários existam
      const userData = userDoc.data();
      const updates = {};

      if (!userData.debtsAsCreditor) updates.debtsAsCreditor = [];
      if (!userData.debtsAsDebtor) updates.debtsAsDebtor = [];
      if (!userData.totalToReceive) updates.totalToReceive = 0;
      if (!userData.totalToPay) updates.totalToPay = 0;

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = serverTimestamp();
        await updateDoc(userRef, updates);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error initializing user:', error);
    throw error;
  }
};

// Buscar dados do usuário
export const getUserData = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    return {
      id: userDoc.id,
      ...userDoc.data()
    };
  } catch (error) {
    console.error('Error fetching user data:', error);
    throw error;
  }
};

// Buscar amigos do usuário
export const getUserFriends = async (userId) => {
  try {
    console.log('userService - getUserFriends - Iniciando busca para:', userId);
    
    if (!userId) {
      console.error('userService - getUserFriends - userId não fornecido');
      throw new Error('ID do usuário não fornecido');
    }

    // Primeiro, buscar o documento do usuário para obter a lista de IDs dos amigos
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      console.error('userService - getUserFriends - Usuário não encontrado:', userId);
      throw new Error('Usuário não encontrado');
    }

    const userData = userDoc.data();
    const friendsList = userData.friends || [];

    console.log('userService - getUserFriends - Lista de IDs dos amigos:', friendsList);

    if (friendsList.length === 0) {
      console.log('userService - getUserFriends - Usuário não tem amigos');
      return [];
    }

    // Buscar os dados de todos os amigos
    const usersRef = collection(db, 'users');
    const friendsQuery = query(usersRef, where('uid', 'in', friendsList));
    const friendsSnapshot = await getDocs(friendsQuery);

    const friends = friendsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: data.uid,
        username: data.username || 'Sem nome',
        email: data.email || 'Sem email',
        photoURL: data.photoURL || null,
        isVerified: data.isVerified || false
      };
    });

    console.log('userService - getUserFriends - Amigos encontrados:', friends.length);
    return friends;
  } catch (error) {
    console.error('userService - getUserFriends - Erro:', error);
    throw error;
  }
};

// Remover amigo
export const removeFriend = async (currentUserId, friendId) => {
  try {
    // Verificar se existem dívidas pendentes
    const debtsAsCreditorQuery = query(
      collection(db, 'debts'),
      where('creditorId', '==', currentUserId),
      where('debtorId', '==', friendId),
      where('paid', '==', false)
    );

    const debtsAsDebtorQuery = query(
      collection(db, 'debts'),
      where('creditorId', '==', friendId),
      where('debtorId', '==', currentUserId),
      where('paid', '==', false)
    );

    const [creditorDebts, debtorDebts] = await Promise.all([
      getDocs(debtsAsCreditorQuery),
      getDocs(debtsAsDebtorQuery)
    ]);

    const totalToReceive = creditorDebts.docs.reduce(
      (total, doc) => total + doc.data().amount,
      0
    );

    const totalToPay = debtorDebts.docs.reduce(
      (total, doc) => total + doc.data().amount,
      0
    );

    // Se existem dívidas pendentes, retorna erro
    if (totalToReceive > 0 || totalToPay > 0) {
      return {
        success: false,
        error: 'PENDING_DEBTS',
        totalToReceive,
        totalToPay
      };
    }

    // Remove friend from current user's friends list
    const userRef = doc(db, 'users', currentUserId);
    const userDoc = await getDoc(userRef);
    const updatedFriends = userDoc.data().friends.filter(id => id !== friendId);
    await updateDoc(userRef, { friends: updatedFriends });

    // Remove current user from friend's friends list
    const friendRef = doc(db, 'users', friendId);
    const friendDoc = await getDoc(friendRef);
    const updatedFriendFriends = friendDoc.data().friends.filter(id => id !== currentUserId);
    await updateDoc(friendRef, { friends: updatedFriendFriends });

    return { success: true };
  } catch (error) {
    console.error('userService - removeFriend - Erro:', error);
    return { success: false, error: error.message };
  }
}; 