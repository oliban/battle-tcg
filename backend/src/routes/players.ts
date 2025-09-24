import { Router, Request, Response } from 'express';
import { gameStore } from '../data/store';
import { dbStore } from '../data/dbStore';

const router = Router();

router.post('/register', (req: Request, res: Response) => {
  const { name } = req.body;

  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required' });
  }

  // Check if player already exists
  const existingPlayer = gameStore.getPlayerByName(name.trim());
  if (existingPlayer) {
    // Return existing player (login)
    res.json({ player: existingPlayer, isNewPlayer: false });
  } else {
    // Create new player (register)
    const player = gameStore.createPlayer(name.trim());

    // Grant initial voice rewards to new player
    const initialVoices = dbStore.grantInitialVoices(player.id);
    console.log(`[Players] Granted ${initialVoices.length} initial voices to ${player.name}`);

    res.json({
      player,
      isNewPlayer: true,
      rewards: initialVoices
    });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  const player = gameStore.getPlayer(req.params.id);

  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }

  res.json(player);
});

router.get('/:id/cards', (req: Request, res: Response) => {
  const cards = gameStore.getPlayerCards(req.params.id);
  res.json(cards);
});

router.put('/:id/deck', (req: Request, res: Response) => {
  const { cardIds } = req.body;

  if (!Array.isArray(cardIds) || cardIds.length > 10) {
    return res.status(400).json({ error: 'Deck must contain up to 10 cards' });
  }

  const player = gameStore.updatePlayer(req.params.id, { deck: cardIds });

  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }

  res.json(player);
});

router.post('/:id/add-coins', (req: Request, res: Response) => {
  const { amount } = req.body;
  const player = gameStore.getPlayer(req.params.id);

  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }

  const updatedPlayer = gameStore.updatePlayer(req.params.id, {
    coins: player.coins + (amount || 1000)
  });

  res.json(updatedPlayer);
});

export default router;