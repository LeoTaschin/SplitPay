import { db } from '../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export const getUserGroups = async (userId) => {
  try {
    const groupsRef = collection(db, 'groups');
    const q = query(groupsRef, where('members', 'array-contains', userId));
    const querySnapshot = await getDocs(q);
    
    const groups = [];
    querySnapshot.forEach((doc) => {
      groups.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return groups;
  } catch (error) {
    console.error('Erro ao buscar grupos do usuário:', error);
    throw error;
  }
}; 