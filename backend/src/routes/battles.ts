import { Router, Request, Response } from 'express';
import { gameStore } from '../data/store';
import { Battle, BattleRound, Card, Ability } from '../models/types';
import { executeBattle } from '../services/battleExecutor';

const router = Router();

// Helper function to roll a D6
const rollD6 = (): number => Math.floor(Math.random() * 6) + 1;

// Helper function to randomly select ability
const selectRandomAbility = (): Ability => {
  const abilities: Ability[] = ['strength', 'speed', 'agility'];
  return abilities[Math.floor(Math.random() * abilities.length)];
};

// Helper function to select 3 random cards from deck
const selectBattleCards = (deck: string[]): string[] => {
  if (deck.length <= 3) return [...deck];

  const selected: string[] = [];
  const available = [...deck];

  for (let i = 0; i < 3; i++) {
    const index = Math.floor(Math.random() * available.length);
    selected.push(available[index]);
    available.splice(index, 1);
  }

  return selected;
};

// Create a new battle (PvP or Simulation)
router.post('/create', (req: Request, res: Response) => {
  try {
    const { player1Id, player2Id, isSimulation } = req.body;

    const player1 = gameStore.getPlayer(player1Id);
    if (!player1) {
      return res.status(404).json({ error: 'Player 1 not found' });
    }

    if (!player1.deck || player1.deck.length !== 10) {
      return res.status(400).json({ error: 'Player 1 must have a deck of exactly 10 cards' });
    }

    let player2Deck: string[];
    let player2Name: string;

    if (isSimulation) {
      // Generate random opponent deck from all available cards
      const allCards = gameStore.getAllCards();

      // If no cards available, can't create simulation
      if (allCards.length < 10) {
        return res.status(400).json({ error: 'Not enough cards available for simulation. Create more cards first!' });
      }

      const randomCards = [...allCards]
        .sort(() => Math.random() - 0.5)
        .slice(0, 10)
        .map(c => c.id);
      player2Deck = randomCards;
      player2Name = 'AI Opponent';
    } else {
      const player2 = gameStore.getPlayer(player2Id);
      if (!player2) {
        return res.status(404).json({ error: 'Player 2 not found' });
      }
      if (!player2.deck || player2.deck.length !== 10) {
        return res.status(400).json({ error: 'Player 2 must have a deck of exactly 10 cards' });
      }
      player2Deck = player2.deck;
      player2Name = player2.name;
    }

    // Select 3 random cards for each player
    const player1Cards = selectBattleCards(player1.deck);
    const player2Cards = selectBattleCards(player2Deck);

    const battle: Battle = {
      id: `battle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      player1Id,
      player2Id: isSimulation ? null : player2Id,  // Use null for simulation battles
      player1Name: player1.name,
      player2Name,
      isSimulation,
      player1Deck: player1.deck,
      player2Deck,
      player1Cards,
      player2Cards,
      rounds: [],
      currentRound: 0,
      player1Points: 0,
      player2Points: 0,
      player1TotalDamage: 0,
      player2TotalDamage: 0,
      status: 'waiting-for-order',
      createdAt: new Date()
    };

    const createdBattle = gameStore.createBattle(battle);

    // If simulation, auto-set AI order and save it
    if (isSimulation) {
      const aiOrder = [0, 1, 2].sort(() => Math.random() - 0.5);

      // Update the battle with AI's order (but keep status as waiting-for-order)
      const battleWithAiOrder = gameStore.updateBattle(createdBattle.id, {
        player2Order: aiOrder
      });

      if (battleWithAiOrder) {
        Object.assign(createdBattle, battleWithAiOrder);
      }
    }

    // Include card details for display
    const player1CardDetails = createdBattle.player1Cards.map(id => gameStore.getCard(id));
    const player2CardDetails = createdBattle.player2Cards.map(id => gameStore.getCard(id));

    res.json({
      ...createdBattle,
      player1CardDetails,
      player2CardDetails
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create battle: ' + (error as any).message });
  }
});

// Set card order for battle
router.post('/:battleId/set-order', (req: Request, res: Response) => {
  const { battleId } = req.params;
  const { playerId, order } = req.body;

  console.log('=====================================');
  console.log('SET-ORDER ENDPOINT HIT!');
  console.log('Battle ID:', battleId);
  console.log('Player ID:', playerId);
  console.log('Order:', order);
  console.log('=====================================');

  const battle = gameStore.getBattle(battleId);
  if (!battle) {
    return res.status(404).json({ error: 'Battle not found' });
  }

  if (battle.status !== 'waiting-for-order') {
    return res.status(400).json({ error: 'Battle is not waiting for card orders' });
  }

  // Validate order array
  if (!Array.isArray(order) || order.length !== 3 ||
      !order.every(i => typeof i === 'number' && i >= 0 && i <= 2) ||
      new Set(order).size !== 3) {
    return res.status(400).json({ error: 'Invalid order. Must be array of [0,1,2] in desired order' });
  }

  // Set the order for the appropriate player
  if (playerId === battle.player1Id) {
    battle.player1Order = order;
  } else if (playerId === battle.player2Id) {
    battle.player2Order = order;
  } else {
    return res.status(403).json({ error: 'Player not in this battle' });
  }

  // Check if both players have set their orders
  if (battle.player1Order && battle.player2Order) {
    battle.status = 'ready';
  }

  const updatedBattle = gameStore.updateBattle(battleId, battle);

  if (!updatedBattle) {
    return res.status(500).json({ error: 'Failed to update battle' });
  }

  // Include card details for display
  const player1CardDetails = updatedBattle.player1Cards.map(id => gameStore.getCard(id));
  const player2CardDetails = updatedBattle.player2Cards.map(id => gameStore.getCard(id));

  res.json({
    ...updatedBattle,
    player1CardDetails,
    player2CardDetails
  });
});

// Execute battle rounds
router.post('/:battleId/execute', (req: Request, res: Response) => {
  const { battleId } = req.params;

  console.log('=====================================');
  console.log('EXECUTE ENDPOINT HIT!');
  console.log('Battle ID:', battleId);
  console.log('=====================================');

  try {
    console.log(`[Battle Execute] Starting execution for battle ${battleId}`);
    const battle = gameStore.getBattle(battleId);
    if (!battle) {
      console.log(`[Battle Execute] Battle not found: ${battleId}`);
      return res.status(404).json({ error: 'Battle not found' });
    }

    console.log(`[Battle Execute] Battle status: ${battle.status}`);
    console.log(`[Battle Execute] Player1 order:`, battle.player1Order);
    console.log(`[Battle Execute] Player2 order:`, battle.player2Order);

    if (battle.status !== 'ready') {
      return res.status(400).json({ error: 'Battle is not ready to execute' });
    }

    if (!battle.player1Order || !battle.player2Order) {
      return res.status(400).json({ error: 'Both players must set their card orders' });
    }

    // Use the battleExecutor service which includes tool support
    const completedBattle = executeBattle(battle);

    // Include card details for display
    const player1CardDetails = completedBattle.player1Cards.map(id => gameStore.getCard(id));
    const player2CardDetails = completedBattle.player2Cards.map(id => gameStore.getCard(id));

    res.json({
      ...completedBattle,
      player1CardDetails,
      player2CardDetails
    });
  } catch (error) {
    console.error('[Battle Execute] Error:', error);
    res.status(500).json({ error: 'Failed to execute battle: ' + (error as any).message });
  }
});

// Get battle by ID
router.get('/:battleId', (req: Request, res: Response) => {
  const battle = gameStore.getBattle(req.params.battleId);

  if (!battle) {
    return res.status(404).json({ error: 'Battle not found' });
  }

  // Include card details for display
  const player1CardDetails = battle.player1Cards.map(id => gameStore.getCard(id));
  const player2CardDetails = battle.player2Cards.map(id => gameStore.getCard(id));

  res.json({
    ...battle,
    player1CardDetails,
    player2CardDetails
  });
});

// Get player's battle history
router.get('/player/:playerId', (req: Request, res: Response) => {
  const battles = gameStore.getPlayerBattles(req.params.playerId);
  res.json(battles);
});

export default router;