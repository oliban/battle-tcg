import { Router, Request, Response } from 'express';
import { gameStore } from '../data/store';
import { Battle, BattleRound, Card, Ability } from '../models/types';

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

  // Execute all 3 rounds
  const rounds: BattleRound[] = [];
  let player1TotalDamage = 0;
  let player2TotalDamage = 0;
  let player1Points = 0;
  let player2Points = 0;

  for (let i = 0; i < 3; i++) {
    const player1CardId = battle.player1Cards[battle.player1Order[i]];
    const player2CardId = battle.player2Cards[battle.player2Order[i]];

    const player1Card = gameStore.getCard(player1CardId);
    const player2Card = gameStore.getCard(player2CardId);

    if (!player1Card || !player2Card) {
      return res.status(400).json({ error: `Card not found for round ${i + 1}` });
    }

    // Select random ability for this round
    const ability = selectRandomAbility();

    // Get stat values
    const player1Stat = player1Card.abilities[ability];
    const player2Stat = player2Card.abilities[ability];

    // Roll D6 for each player
    const player1Roll = rollD6();
    const player2Roll = rollD6();

    // Calculate totals
    const player1Total = player1Stat + player1Roll;
    const player2Total = player2Stat + player2Roll;

    // Check for critical hits
    const player1CriticalHit = player1Card.criticalHitChance
      ? Math.random() * 100 < player1Card.criticalHitChance
      : false;
    const player2CriticalHit = player2Card.criticalHitChance
      ? Math.random() * 100 < player2Card.criticalHitChance
      : false;

    // Determine round winner
    let roundWinner: 'player1' | 'player2' | 'draw';
    let damageDealt = 0;

    if (player1Total > player2Total) {
      roundWinner = 'player1';
      damageDealt = player1Total - player2Total;
      // Double damage on critical hit
      if (player1CriticalHit) {
        damageDealt *= 2;
      }
      player1TotalDamage += damageDealt;
      player1Points++;
    } else if (player2Total > player1Total) {
      roundWinner = 'player2';
      damageDealt = player2Total - player1Total;
      // Double damage on critical hit
      if (player2CriticalHit) {
        damageDealt *= 2;
      }
      player2TotalDamage += damageDealt;
      player2Points++;
    } else {
      roundWinner = 'draw';
      damageDealt = 0;
    }

    rounds.push({
      roundNumber: i + 1,
      player1CardId,
      player2CardId,
      player1CardName: player1Card.fullName || player1Card.name,
      player2CardName: player2Card.fullName || player2Card.name,
      ability,
      player1Roll,
      player2Roll,
      player1StatValue: player1Stat,
      player2StatValue: player2Stat,
      player1Total,
      player2Total,
      player1CriticalHit,
      player2CriticalHit,
      damageDealt,
      winner: roundWinner
    });
  }

  // Determine overall winner
  let winner: string | null;
  let winReason: 'points' | 'damage' | 'coin-toss';

  if (player1Points > player2Points) {
    winner = battle.player1Id;
    winReason = 'points';
  } else if (player2Points > player1Points) {
    winner = battle.player2Id || 'ai';  // Use 'ai' for display if player2Id is null
    winReason = 'points';
  } else {
    // Points are tied, check damage
    if (player1TotalDamage > player2TotalDamage) {
      winner = battle.player1Id;
      winReason = 'damage';
    } else if (player2TotalDamage > player1TotalDamage) {
      winner = battle.player2Id || 'ai';  // Use 'ai' for display if player2Id is null
      winReason = 'damage';
    } else {
      // Damage is also tied, coin toss
      winner = Math.random() < 0.5 ? battle.player1Id : (battle.player2Id || 'ai');
      winReason = 'coin-toss';
    }
  }

  // Update battle with results
  const updatedBattle = gameStore.updateBattle(battleId, {
    rounds,
    currentRound: 3,
    player1Points,
    player2Points,
    player1TotalDamage,
    player2TotalDamage,
    winner,
    winReason,
    status: 'completed',
    completedAt: new Date()
  });

  // Update player statistics (only for real PvP battles)
  if (!battle.isSimulation && battle.player2Id) {
    const player1 = gameStore.getPlayer(battle.player1Id);
    const player2 = gameStore.getPlayer(battle.player2Id);

    if (player1) {
      if (winner === battle.player1Id) {
        gameStore.updatePlayer(battle.player1Id, {
          wins: player1.wins + 1,
          coins: player1.coins + 50 // Reward for winning
        });
      } else {
        gameStore.updatePlayer(battle.player1Id, {
          losses: player1.losses + 1
        });
      }
    }

    if (player2) {
      if (winner === battle.player2Id) {
        gameStore.updatePlayer(battle.player2Id, {
          wins: player2.wins + 1,
          coins: player2.coins + 50 // Reward for winning
        });
      } else {
        gameStore.updatePlayer(battle.player2Id, {
          losses: player2.losses + 1
        });
      }
    }
  } else {
    // For simulation, only update player1's stats
    const player1 = gameStore.getPlayer(battle.player1Id);
    if (player1) {
      if (winner === battle.player1Id) {
        gameStore.updatePlayer(battle.player1Id, {
          wins: player1.wins + 1,
          coins: player1.coins + 30 // Smaller reward for simulation
        });
      } else {
        gameStore.updatePlayer(battle.player1Id, {
          losses: player1.losses + 1
        });
      }
    }
  }

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