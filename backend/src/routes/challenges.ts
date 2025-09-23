import { Router, Request, Response } from 'express';
import { gameStore } from '../data/store';

const router = Router();

// Get all players available to challenge
router.get('/players', (req: Request, res: Response) => {
  const allPlayers = gameStore.getAllPlayers();

  // Return simplified player data for challenge selection
  const players = allPlayers.map(p => ({
    id: p.id,
    name: p.name,
    wins: p.pvpWins || 0,
    losses: p.pvpLosses || 0,
    rating: p.rating || 1000,
    lastActive: p.lastActive
  }));

  res.json(players);
});

// Get all challenges for a player
router.get('/player/:playerId', (req: Request, res: Response) => {
  const { playerId } = req.params;
  const { incoming, outgoing } = gameStore.getPlayerChallenges(playerId);
  // Return a combined array of all challenges
  const allChallenges = [...incoming, ...outgoing]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(allChallenges);
});

// Get active challenges for a player
router.get('/active/:playerId', (req: Request, res: Response) => {
  const { playerId } = req.params;
  const activeChallenges = gameStore.getActiveChallenges(playerId);
  res.json(activeChallenges);
});

// Create a new challenge
router.post('/create', (req: Request, res: Response) => {
  const { challengerId, challengedId } = req.body;

  // Validate players exist
  const challenger = gameStore.getPlayer(challengerId);
  const challenged = gameStore.getPlayer(challengedId);

  if (!challenger) {
    return res.status(404).json({ error: 'Challenger not found' });
  }

  if (!challenged) {
    return res.status(404).json({ error: 'Challenged player not found' });
  }

  if (challengerId === challengedId) {
    return res.status(400).json({ error: 'Cannot challenge yourself' });
  }

  // Check if challenger has a valid deck
  if (!challenger.deck || challenger.deck.length !== 10) {
    return res.status(400).json({ error: 'You need a deck of exactly 10 cards to challenge others' });
  }

  // Create the challenge
  const challenge = gameStore.createChallenge({
    challengerId,
    challengerName: challenger.name,
    challengedId,
    challengedName: challenged.name,
    status: 'pending'
  });

  // Send notification to challenged player
  gameStore.sendNotification(
    challengedId,
    'challenge_received',
    'New Challenge!',
    `${challenger.name} has challenged you to a battle!`,
    { challengeId: challenge.id }
  );

  res.json(challenge);
});

// Set challenger's cards and order
router.post('/:challengeId/setup', (req: Request, res: Response) => {
  const { challengeId } = req.params;
  const { cards, order } = req.body;

  const challenge = gameStore.getChallenge(challengeId);
  if (!challenge) {
    return res.status(404).json({ error: 'Challenge not found' });
  }

  if (challenge.status !== 'pending') {
    return res.status(400).json({ error: 'Challenge is not in pending state' });
  }

  // Validate cards and order
  if (!Array.isArray(cards) || cards.length !== 3) {
    return res.status(400).json({ error: 'Must select exactly 3 cards' });
  }

  if (!Array.isArray(order) || order.length !== 3 ||
      !order.every(i => typeof i === 'number' && i >= 0 && i <= 2) ||
      new Set(order).size !== 3) {
    return res.status(400).json({ error: 'Invalid order. Must be array of [0,1,2] in desired order' });
  }

  // Update challenge with cards and order
  const updated = gameStore.updateChallenge(challengeId, {
    challengerCards: cards,
    challengerOrder: order
  });

  res.json(updated);
});

// Accept a challenge
router.post('/:challengeId/accept', (req: Request, res: Response) => {
  const { challengeId } = req.params;
  const { playerId } = req.body;

  const challenge = gameStore.getChallenge(challengeId);
  if (!challenge) {
    return res.status(404).json({ error: 'Challenge not found' });
  }

  if (challenge.challengedId !== playerId) {
    return res.status(403).json({ error: 'You cannot accept this challenge' });
  }

  if (challenge.status !== 'pending') {
    return res.status(400).json({ error: 'Challenge is not pending' });
  }

  // Check if challenged player has a valid deck
  const challenged = gameStore.getPlayer(playerId);
  if (!challenged || !challenged.deck || challenged.deck.length !== 10) {
    return res.status(400).json({ error: 'You need a deck of exactly 10 cards to accept challenges' });
  }

  // Update challenge status
  const updated = gameStore.updateChallenge(challengeId, {
    status: 'accepted'
  });

  // Send notification to challenger
  gameStore.sendNotification(
    challenge.challengerId,
    'challenge_accepted',
    'Challenge Accepted!',
    `${challenge.challengedName} has accepted your challenge!`,
    { challengeId: challenge.id }
  );

  res.json(updated);
});

// Set defender's cards and order (and execute battle)
router.post('/:challengeId/setup-defense', (req: Request, res: Response) => {
  const { challengeId } = req.params;
  const { cards, order } = req.body;

  const challenge = gameStore.getChallenge(challengeId);
  if (!challenge) {
    return res.status(404).json({ error: 'Challenge not found' });
  }

  if (challenge.status !== 'accepted') {
    return res.status(400).json({ error: 'Challenge must be accepted first' });
  }

  // Validate cards and order
  if (!Array.isArray(cards) || cards.length !== 3) {
    return res.status(400).json({ error: 'Must select exactly 3 cards' });
  }

  if (!Array.isArray(order) || order.length !== 3 ||
      !order.every(i => typeof i === 'number' && i >= 0 && i <= 2) ||
      new Set(order).size !== 3) {
    return res.status(400).json({ error: 'Invalid order. Must be array of [0,1,2] in desired order' });
  }

  // Update challenge with defender's cards and order
  gameStore.updateChallenge(challengeId, {
    challengedCards: cards,
    challengedOrder: order,
    status: 'ready'
  });

  // Create and execute the battle
  const battle = gameStore.createBattle({
    id: `battle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    player1Id: challenge.challengerId,
    player2Id: challenge.challengedId,
    player1Name: challenge.challengerName,
    player2Name: challenge.challengedName,
    isSimulation: false,
    player1Deck: gameStore.getPlayer(challenge.challengerId)!.deck,
    player2Deck: gameStore.getPlayer(challenge.challengedId)!.deck,
    player1Cards: challenge.challengerCards!,
    player2Cards: cards,
    player1Order: challenge.challengerOrder,
    player2Order: order,
    rounds: [],
    currentRound: 0,
    player1Points: 0,
    player2Points: 0,
    player1TotalDamage: 0,
    player2TotalDamage: 0,
    status: 'ready',
    createdAt: new Date()
  });

  // Execute battle immediately
  const executeResult = executeBattleLogic(battle);

  // Update challenge with battle ID
  const updatedChallenge = gameStore.updateChallenge(challengeId, {
    battleId: battle.id,
    status: 'completed'
  });

  // Send notifications to both players
  gameStore.sendNotification(
    challenge.challengerId,
    'battle_complete',
    'Battle Complete!',
    `Your battle against ${challenge.challengedName} is ready to view!`,
    { challengeId: challenge.id, battleId: battle.id }
  );

  gameStore.sendNotification(
    challenge.challengedId,
    'battle_complete',
    'Battle Complete!',
    `Your battle against ${challenge.challengerName} is ready to view!`,
    { challengeId: challenge.id, battleId: battle.id }
  );

  res.json({
    challenge: updatedChallenge,
    battle: executeResult
  });
});

// Decline a challenge
router.post('/:challengeId/decline', (req: Request, res: Response) => {
  const { challengeId } = req.params;
  const { playerId } = req.body;

  const challenge = gameStore.getChallenge(challengeId);
  if (!challenge) {
    return res.status(404).json({ error: 'Challenge not found' });
  }

  if (challenge.challengedId !== playerId) {
    return res.status(403).json({ error: 'You cannot decline this challenge' });
  }

  if (challenge.status !== 'pending') {
    return res.status(400).json({ error: 'Challenge is not pending' });
  }

  // Update challenge status
  const updated = gameStore.updateChallenge(challengeId, {
    status: 'declined'
  });

  // Send notification to challenger
  gameStore.sendNotification(
    challenge.challengerId,
    'challenge_declined',
    'Challenge Declined',
    `${challenge.challengedName} has declined your challenge.`,
    { challengeId: challenge.id }
  );

  res.json(updated);
});

// Helper function to execute battle logic (copied from battles.ts)
function executeBattleLogic(battle: any) {
  const rollD6 = (): number => Math.floor(Math.random() * 6) + 1;
  const selectRandomAbility = (): 'strength' | 'speed' | 'agility' => {
    const abilities: ('strength' | 'speed' | 'agility')[] = ['strength', 'speed', 'agility'];
    return abilities[Math.floor(Math.random() * abilities.length)];
  };

  const rounds: any[] = [];
  let player1TotalDamage = 0;
  let player2TotalDamage = 0;
  let player1Points = 0;
  let player2Points = 0;

  for (let i = 0; i < 3; i++) {
    const player1CardId = battle.player1Cards[battle.player1Order![i]];
    const player2CardId = battle.player2Cards[battle.player2Order![i]];

    const player1Card = gameStore.getCard(player1CardId);
    const player2Card = gameStore.getCard(player2CardId);

    if (!player1Card || !player2Card) {
      continue; // Skip if card not found
    }

    const ability = selectRandomAbility();
    const player1Stat = player1Card.abilities[ability];
    const player2Stat = player2Card.abilities[ability];
    const player1Roll = rollD6();
    const player2Roll = rollD6();
    const player1Total = player1Stat + player1Roll;
    const player2Total = player2Stat + player2Roll;

    let roundWinner: 'player1' | 'player2' | 'draw';
    let damageDealt = 0;

    if (player1Total > player2Total) {
      roundWinner = 'player1';
      damageDealt = player1Total - player2Total;
      player1TotalDamage += damageDealt;
      player1Points++;
    } else if (player2Total > player1Total) {
      roundWinner = 'player2';
      damageDealt = player2Total - player1Total;
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
      damageDealt,
      winner: roundWinner
    });
  }

  // Determine overall winner
  let winner: string;
  let winReason: 'points' | 'damage' | 'coin-toss';

  if (player1Points > player2Points) {
    winner = battle.player1Id;
    winReason = 'points';
  } else if (player2Points > player1Points) {
    winner = battle.player2Id;
    winReason = 'points';
  } else {
    if (player1TotalDamage > player2TotalDamage) {
      winner = battle.player1Id;
      winReason = 'damage';
    } else if (player2TotalDamage > player1TotalDamage) {
      winner = battle.player2Id;
      winReason = 'damage';
    } else {
      winner = Math.random() < 0.5 ? battle.player1Id : battle.player2Id;
      winReason = 'coin-toss';
    }
  }

  // Update battle with results
  const updatedBattle = gameStore.updateBattle(battle.id, {
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

  // Update player statistics
  const player1 = gameStore.getPlayer(battle.player1Id);
  const player2 = gameStore.getPlayer(battle.player2Id);

  if (player1) {
    if (winner === battle.player1Id) {
      gameStore.updatePlayer(battle.player1Id, {
        wins: player1.wins + 1,
        pvpWins: (player1.pvpWins || 0) + 1,
        coins: player1.coins + 50,
        rating: calculateNewRating(player1.rating || 1000, player2?.rating || 1000, true)
      });
    } else {
      gameStore.updatePlayer(battle.player1Id, {
        losses: player1.losses + 1,
        pvpLosses: (player1.pvpLosses || 0) + 1,
        rating: calculateNewRating(player1.rating || 1000, player2?.rating || 1000, false)
      });
    }
  }

  if (player2) {
    if (winner === battle.player2Id) {
      gameStore.updatePlayer(battle.player2Id, {
        wins: player2.wins + 1,
        pvpWins: (player2.pvpWins || 0) + 1,
        coins: player2.coins + 50,
        rating: calculateNewRating(player2.rating || 1000, player1?.rating || 1000, true)
      });
    } else {
      gameStore.updatePlayer(battle.player2Id, {
        losses: player2.losses + 1,
        pvpLosses: (player2.pvpLosses || 0) + 1,
        rating: calculateNewRating(player2.rating || 1000, player1?.rating || 1000, false)
      });
    }
  }

  return updatedBattle;
}

// Simple ELO rating calculation
function calculateNewRating(playerRating: number, opponentRating: number, won: boolean): number {
  const K = 32; // K-factor for rating volatility
  const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  const actualScore = won ? 1 : 0;
  return Math.round(playerRating + K * (actualScore - expectedScore));
}

export default router;