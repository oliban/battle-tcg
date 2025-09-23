import { Router, Request, Response } from 'express';
import { gameStore } from '../data/store';

const router = Router();

// Get all notifications for a player
router.get('/:playerId', (req: Request, res: Response) => {
  const { playerId } = req.params;
  const notifications = gameStore.getPlayerNotifications(playerId);
  res.json(notifications);
});

// Get unread notifications count and list
router.get('/:playerId/unread', (req: Request, res: Response) => {
  const { playerId } = req.params;
  const unread = gameStore.getUnreadNotifications(playerId);
  res.json({
    count: unread.length,
    notifications: unread
  });
});

// Mark notification as read
router.post('/:notificationId/read', (req: Request, res: Response) => {
  const { notificationId } = req.params;
  const success = gameStore.markNotificationAsRead(notificationId);

  if (success) {
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Notification not found' });
  }
});

// Mark all notifications as read for a player
router.post('/:playerId/read-all', (req: Request, res: Response) => {
  const { playerId } = req.params;
  gameStore.markAllNotificationsAsRead(playerId);
  res.json({ success: true });
});

// Delete a notification
router.delete('/:notificationId', (req: Request, res: Response) => {
  const { notificationId } = req.params;
  const success = gameStore.deleteNotification(notificationId);

  if (success) {
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Notification not found' });
  }
});

export default router;