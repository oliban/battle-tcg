import React, { useState, useEffect, useRef } from 'react';
import { notificationAPI } from '../services/api';
import { Notification } from '../types';
import './NotificationBell.css';

interface NotificationBellProps {
  playerId: string;
  onChallengeClick?: (challengeId: string) => void;
  onBattleClick?: (battleId: string) => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({
  playerId,
  onChallengeClick,
  onBattleClick
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications every 10 seconds
  useEffect(() => {
    if (!playerId) return;

    const fetchNotifications = async () => {
      try {
        const unreadData = await notificationAPI.getUnreadNotifications(playerId);
        setUnreadCount(unreadData.count);

        // Only fetch full list if dropdown is open
        if (showDropdown) {
          const allNotifications = await notificationAPI.getNotifications(playerId);
          setNotifications(allNotifications.slice(0, 10)); // Show latest 10
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [playerId, showDropdown]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBellClick = async () => {
    setShowDropdown(!showDropdown);

    if (!showDropdown) {
      setLoading(true);
      try {
        const allNotifications = await notificationAPI.getNotifications(playerId);
        setNotifications(allNotifications.slice(0, 10));
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    await notificationAPI.markAsRead(notification.id);
    setUnreadCount(prev => Math.max(0, prev - (notification.read ? 0 : 1)));

    // Update local state
    setNotifications(prev =>
      prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
    );

    // Handle different notification types
    if (notification.type === 'challenge_received' || notification.type === 'challenge_accepted') {
      if (onChallengeClick && notification.data?.challengeId) {
        onChallengeClick(notification.data.challengeId);
        setShowDropdown(false);
      }
    } else if (notification.type === 'battle_complete') {
      if (onBattleClick && notification.data?.battleId) {
        onBattleClick(notification.data.battleId);
        setShowDropdown(false);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead(playerId);
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'challenge_received':
        return '⚔️';
      case 'challenge_accepted':
        return '✅';
      case 'challenge_declined':
        return '❌';
      case 'battle_complete':
        return '🏆';
      case 'achievement':
        return '🎖️';
      case 'reward':
        return '💎';
      default:
        return '📬';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button
        className="notification-bell"
        onClick={handleBellClick}
        aria-label="Notifications"
      >
        <span className="bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button
                className="mark-all-read"
                onClick={handleMarkAllAsRead}
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="notification-list">
            {loading ? (
              <div className="notification-loading">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">No notifications</div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <span className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </span>
                  <div className="notification-content">
                    <div className="notification-title">{notification.title}</div>
                    <div className="notification-message">{notification.message}</div>
                    <div className="notification-time">
                      {formatTime(notification.createdAt)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;