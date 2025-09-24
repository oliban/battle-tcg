import { Router, Request, Response } from 'express';
import { dbStore } from '../data/dbStore';

const router = Router();

// Get all reward types (for admin/debug)
router.get('/types', (req: Request, res: Response) => {
  const { category } = req.query;

  if (category) {
    const rewards = dbStore.getRewardTypesByCategory(category as string);
    res.json(rewards);
  } else {
    const rewards = dbStore.getAllRewardTypes();
    res.json(rewards);
  }
});

// Get player's unlocked rewards
router.get('/player/:playerId', (req: Request, res: Response) => {
  const rewards = dbStore.getPlayerRewards(req.params.playerId);
  res.json(rewards);
});

// Get player's unlocked voices specifically
router.get('/player/:playerId/voices', (req: Request, res: Response) => {
  const rewards = dbStore.getPlayerRewards(req.params.playerId);
  const voices = rewards.filter(r => r.category === 'voice');

  // Parse metadata for easier use in frontend
  const voicesWithParsedMetadata = voices.map(v => ({
    ...v,
    metadata: JSON.parse(v.metadata || '{}')
  }));

  res.json(voicesWithParsedMetadata);
});

// Get available rewards for player (not yet unlocked)
router.get('/player/:playerId/available', (req: Request, res: Response) => {
  const { category } = req.query;
  const rewards = dbStore.getAvailableRewards(
    req.params.playerId,
    category as string | undefined
  );
  res.json(rewards);
});

// Manually grant a reward (for testing/admin)
router.post('/player/:playerId/grant', (req: Request, res: Response) => {
  const { rewardId, source = 'manual' } = req.body;

  if (!rewardId) {
    return res.status(400).json({ error: 'Reward ID required' });
  }

  const success = dbStore.grantPlayerReward(
    req.params.playerId,
    rewardId,
    source
  );

  if (success) {
    const reward = dbStore.getAllRewardTypes().find(r => r.id === rewardId);
    res.json({ success: true, reward });
  } else {
    res.status(400).json({ error: 'Failed to grant reward (may already be owned)' });
  }
});

// Grant random reward from available pool
router.post('/player/:playerId/grant-random', (req: Request, res: Response) => {
  const { category = 'voice', rarityWeights } = req.body;

  const reward = dbStore.grantRandomReward(
    req.params.playerId,
    category,
    rarityWeights
  );

  if (reward) {
    res.json({ success: true, reward });
  } else {
    res.json({ success: false, message: 'No available rewards or all rewards owned' });
  }
});

export default router;