import { Router, Request, Response } from 'express';
import { gameStore } from '../data/store';

const router = Router();

// Get all tools
router.get('/', (_req: Request, res: Response) => {
  try {
    const tools = gameStore.getAllTools();
    res.json(tools);
  } catch (error) {
    console.error('[Tools API] Error fetching tools:', error);
    res.status(500).json({ error: 'Failed to fetch tools' });
  }
});

// Get player's tools
router.get('/player/:playerId', (req: Request, res: Response) => {
  const { playerId } = req.params;

  try {
    const player = gameStore.getPlayer(playerId);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const tools = gameStore.getPlayerTools(playerId);
    res.json(tools);
  } catch (error) {
    console.error('[Tools API] Error fetching player tools:', error);
    res.status(500).json({ error: 'Failed to fetch player tools' });
  }
});

// Apply tool to battle card
router.post('/apply', (req: Request, res: Response) => {
  const { battleId, playerId, toolId, cardId, cardPosition } = req.body;

  try {
    // Validate player has the tool
    const playerTools = gameStore.getPlayerTools(playerId);
    const hasTool = playerTools.some(pt => pt.toolId === toolId && pt.cooldownRemaining === 0);

    if (!hasTool) {
      return res.status(400).json({ error: 'Tool not available or on cooldown' });
    }

    // Apply tool to battle
    const success = gameStore.applyToolToBattle(battleId, playerId, toolId, cardId, cardPosition);

    if (success) {
      res.json({ success: true, message: 'Tool applied successfully' });
    } else {
      res.status(500).json({ error: 'Failed to apply tool' });
    }
  } catch (error) {
    console.error('[Tools API] Error applying tool:', error);
    res.status(500).json({ error: 'Failed to apply tool' });
  }
});

export default router;