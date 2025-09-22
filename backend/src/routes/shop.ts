import { Router, Request, Response } from 'express';
import { gameStore } from '../data/store';
import { applyTitleToCard } from '../utils/gameUtils';

const router = Router();

router.get('/packs', (req: Request, res: Response) => {
  const packs = gameStore.getPacks();
  res.json(packs);
});

router.post('/buy-pack', (req: Request, res: Response) => {
  const { playerId, packId } = req.body;

  const player = gameStore.getPlayer(playerId);
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }

  const pack = gameStore.getPack(packId);
  if (!pack) {
    return res.status(404).json({ error: 'Pack not found' });
  }

  if (player.coins < pack.price) {
    return res.status(400).json({ error: 'Insufficient coins' });
  }

  const packCards = gameStore.generatePackCards(packId);

  if (packCards.length === 0) {
    return res.status(400).json({ error: 'No cards available in pool' });
  }

  // Apply titles to all cards from the pack
  const titledCards = packCards.map(card => {
    // Create a new card instance with title
    const titledCard = applyTitleToCard({ ...card });
    // Give it a new unique ID since this is a new instance
    titledCard.id = `${card.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    // Save the new titled card
    gameStore.createCard(titledCard);
    return titledCard;
  });

  const newCardIds = titledCards.map(card => card.id);

  gameStore.updatePlayer(playerId, {
    coins: player.coins - pack.price,
    cards: [...player.cards, ...newCardIds]
  });

  res.json({
    cards: titledCards,
    remainingCoins: player.coins - pack.price
  });
});

export default router;