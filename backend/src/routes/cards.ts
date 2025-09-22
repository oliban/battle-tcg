import { Router, Request, Response } from 'express';
import { gameStore } from '../data/store';
import { generateCardStats, generateCardId } from '../utils/gameUtils';
import { Ability, Card } from '../models/types';

const router = Router();

// Generate stats preview without creating a card
router.post('/preview-stats', (req: Request, res: Response) => {
  const { primaryAbility } = req.body;

  if (!primaryAbility) {
    return res.status(400).json({ error: 'Primary ability required' });
  }

  const { abilities, rarity } = generateCardStats(primaryAbility as Ability);

  res.json({ abilities, rarity });
});

router.post('/create', (req: Request, res: Response) => {
  console.log('[Card Create] Request received:', req.body);
  const { playerId, name, description, imageUrl, abilities, rarity, totalCost } = req.body;

  if (!playerId || !name || !abilities || !rarity) {
    console.log('[Card Create] Missing required fields');
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const player = gameStore.getPlayer(playerId);
  if (!player) {
    console.log('[Card Create] Player not found:', playerId);
    return res.status(404).json({ error: 'Player not found' });
  }

  // Use totalCost if provided (includes reroll costs), otherwise default to 50
  const cost = totalCost || 50;

  if (player.coins < cost) {
    console.log('[Card Create] Insufficient coins:', player.coins, 'need:', cost);
    return res.status(400).json({ error: `Insufficient coins (need ${cost})` });
  }

  const card: Card = {
    id: generateCardId(),
    name,
    description: description || '',
    imageUrl,
    abilities,
    rarity,
    createdAt: new Date(),
    createdBy: playerId
  };

  console.log('[Card Create] Creating card:', card.id);

  try {
    gameStore.createCard(card);
    console.log('[Card Create] Card created successfully');

    gameStore.updatePlayer(playerId, {
      coins: player.coins - cost,
      cards: [...player.cards, card.id]
    });
    console.log('[Card Create] Player updated successfully');

    res.json({ card, remainingCoins: player.coins - cost });
    console.log('[Card Create] Response sent successfully');
  } catch (error) {
    console.error('[Card Create] Error:', error);
    res.status(500).json({ error: 'Failed to create card' });
  }
});


router.get('/', (req: Request, res: Response) => {
  const cards = gameStore.getAllCards();
  res.json(cards);
});

router.get('/:id', (req: Request, res: Response) => {
  const card = gameStore.getCard(req.params.id);

  if (!card) {
    return res.status(404).json({ error: 'Card not found' });
  }

  res.json(card);
});

// Delete a card and remove it from all player inventories
router.delete('/:id', (req: Request, res: Response) => {
  const cardId = req.params.id;
  const card = gameStore.getCard(cardId);

  if (!card) {
    return res.status(404).json({ error: 'Card not found' });
  }

  // Remove card from all players who own it
  const allPlayers = gameStore.getAllPlayers();
  for (const player of allPlayers) {
    if (player.cards.includes(cardId)) {
      gameStore.updatePlayer(player.id, {
        cards: player.cards.filter(id => id !== cardId)
      });
    }
  }

  // Delete the card
  gameStore.deleteCard(cardId);

  res.json({ message: 'Card deleted successfully', cardId });
});

// Cleanup test cards
router.post('/cleanup-test-cards', (req: Request, res: Response) => {
  const allCards = gameStore.getAllCards();
  const testCards = allCards.filter(card =>
    card.name.toLowerCase() === 'test' ||
    card.description.toLowerCase() === 'test'
  );

  let deletedCount = 0;
  for (const card of testCards) {
    // Remove from all players
    const allPlayers = gameStore.getAllPlayers();
    for (const player of allPlayers) {
      if (player.cards.includes(card.id)) {
        gameStore.updatePlayer(player.id, {
          cards: player.cards.filter(id => id !== card.id)
        });
      }
    }

    // Delete the card
    gameStore.deleteCard(card.id);
    deletedCount++;
  }

  res.json({ message: `Deleted ${deletedCount} test cards` });
});

export default router;