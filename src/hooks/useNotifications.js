import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, getDocs, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { useAuth } from './useAuth';

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!user?.uid) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef,
        where('receiverId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const notificationsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));

      setNotifications(notificationsData);
      setUnreadCount(notificationsData.filter(n => !n.read).length);
    } catch (err) {
      console.error('Erro ao carregar notificações:', err);
      setError('Não foi possível carregar as notificações');
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  const markAsRead = async (notificationId) => {
    if (!user?.uid || !notificationId) return;

    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        read: true
      });

      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Erro ao marcar notificação como lida:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.uid) return;

    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      const updatePromises = unreadNotifications.map(notification =>
        updateDoc(doc(db, 'notifications', notification.id), {
          read: true
        })
      );

      await Promise.all(updatePromises);

      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Erro ao marcar todas as notificações como lidas:', err);
    }
  };

  // Carregar notificações quando o usuário mudar
  useEffect(() => {
    fetchNotifications();

    // Configurar listener em tempo real para novas notificações
    if (user?.uid) {
      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef,
        where('receiverId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const notificationsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()
        }));

        setNotifications(notificationsData);
        setUnreadCount(notificationsData.filter(n => !n.read).length);
      });

      return () => unsubscribe();
    }
  }, [user?.uid, fetchNotifications]);

  return {
    notifications,
    loading,
    error,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refreshNotifications: fetchNotifications
  };
} 