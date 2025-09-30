import { Router, Request, Response } from 'express';
import { gameStore } from '../data/store';
import { executeBattle } from '../services/battleExecutor';

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

  // Determine first round ability
  const abilities: ('strength' | 'speed' | 'agility')[] = ['strength', 'speed', 'agility'];
  const firstRoundAbility = abilities[Math.floor(Math.random() * 3)];

  // Create the challenge
  const challenge = gameStore.createChallenge({
    challengerId,
    challengerName: challenger.name,
    challengedId,
    challengedName: challenged.name,
    status: 'pending',
    firstRoundAbility
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

// Create an AI challenge
router.post('/create-ai', (req: Request, res: Response) => {
  const { challengerId } = req.body;

  // Validate player exists
  const challenger = gameStore.getPlayer(challengerId);
  if (!challenger) {
    return res.status(404).json({ error: 'Challenger not found' });
  }

  // Check if challenger has a valid deck
  if (!challenger.deck || challenger.deck.length !== 10) {
    return res.status(400).json({ error: 'You need a deck of exactly 10 cards to challenge the AI' });
  }

  // Determine first round ability
  const abilities: ('strength' | 'speed' | 'agility')[] = ['strength', 'speed', 'agility'];
  const firstRoundAbility = abilities[Math.floor(Math.random() * 3)];

  // Create the AI challenge
  const challenge = gameStore.createChallenge({
    challengerId,
    challengerName: challenger.name,
    challengedId: null, // NULL for AI challenges
    challengedName: 'AI Opponent',
    status: 'accepted', // AI automatically accepts
    isAI: true,
    firstRoundAbility
  });

  res.json(challenge);
});

// Set challenger's cards and order
router.post('/:challengeId/setup', (req: Request, res: Response) => {
  const { challengeId } = req.params;
  const { cards, order, tools } = req.body;

  const challenge = gameStore.getChallenge(challengeId);
  if (!challenge) {
    return res.status(404).json({ error: 'Challenge not found' });
  }

  // For AI challenges, accept both 'pending' and 'accepted' status
  const isAIChallenge = challenge.challengedId === null;
  if (!isAIChallenge && challenge.status !== 'pending') {
    return res.status(400).json({ error: 'Challenge is not in pending state' });
  }
  if (isAIChallenge && challenge.status !== 'accepted') {
    return res.status(400).json({ error: 'AI challenge is not in accepted state' });
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

  // Validate tools are not on cooldown
  if (tools && typeof tools === 'object') {
    const playerTools = gameStore.getPlayerTools(challenge.challengerId);
    for (const toolId of Object.values(tools)) {
      if (toolId) {
        const playerTool = playerTools.find(pt => pt.toolId === toolId);
        if (!playerTool) {
          return res.status(400).json({ error: `Tool ${toolId} not found in player's inventory` });
        }
        if (playerTool.cooldownRemaining > 0) {
          return res.status(400).json({ error: `Tool is on cooldown for ${playerTool.cooldownRemaining} more battle(s)` });
        }
      }
    }
  }

  // Update challenge with cards, order, and tools
  const updated = gameStore.updateChallenge(challengeId, {
    challengerCards: cards,
    challengerOrder: order,
    challengerTools: tools || {}
  });

  // Apply cooldown immediately for challenger's tools (prevents using same tool in parallel challenges)
  if (tools && typeof tools === 'object') {
    for (const toolId of Object.values(tools)) {
      if (toolId) {
        const tool = gameStore.getAllTools().find(t => t.id === toolId);
        if (tool && tool.cooldown > 0) {
          // Set cooldown directly on player_tools
          gameStore.setToolCooldown(challenge.challengerId, toolId as string, tool.cooldown);
          console.log(`[Challenge Setup] Applied cooldown of ${tool.cooldown} to tool ${toolId} for challenger ${challenge.challengerId}`);
        }
      }
    }
  }

  // If it's an AI challenge, immediately set up the AI's cards and execute the battle
  if (isAIChallenge) {
    // Generate random AI deck from all available cards
    const allCards = gameStore.getAllCards();
    if (allCards.length < 10) {
      return res.status(400).json({ error: 'Not enough cards available for AI battle' });
    }

    // Create AI deck
    const aiDeck = [...allCards]
      .sort(() => Math.random() - 0.5)
      .slice(0, 10)
      .map(c => c.id);

    // Select 3 random cards from AI deck
    const aiCards = [...aiDeck]
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    // Generate random order for AI
    const aiOrder = [0, 1, 2].sort(() => Math.random() - 0.5);

    // Update challenge with AI's cards
    gameStore.updateChallenge(challengeId, {
      challengedCards: aiCards,
      challengedOrder: aiOrder,
      status: 'ready'
    });

    // Process tool usage if provided
    const toolUsages: any[] = [];
    console.log('[Challenge Setup] Processing tools:', tools);
    if (tools && typeof tools === 'object') {
      for (const [position, toolId] of Object.entries(tools)) {
        const cardPosition = parseInt(position);
        if (!isNaN(cardPosition) && toolId) {
          toolUsages.push({
            playerId: challenge.challengerId,
            toolId: toolId as string,
            cardId: cards[cardPosition],
            cardPosition
          });
        }
      }
    }

    // Generate random AI tool usage - assign based on play order, not card array order
    const aiTools = ['running-shoes', 'sledge-hammer', 'lube-tube'];
    for (let playOrder = 0; playOrder < 3; playOrder++) {
      // AI always gets a tool on each card
      const randomTool = aiTools[Math.floor(Math.random() * aiTools.length)];
      const cardArrayIndex = aiOrder[playOrder]; // Use the play order to get correct card
      toolUsages.push({
        playerId: null, // AI player ID is null
        toolId: randomTool,
        cardId: aiCards[cardArrayIndex],
        cardPosition: cardArrayIndex // This should match the battle executor lookup
      });
    }

    console.log('[Challenge Setup] Tool usages (including AI):', toolUsages);

    // Use the challenge's firstRoundAbility instead of generating a new random one
    const firstRoundAbility = challenge.firstRoundAbility;

    // Create and execute the battle
    const battle = gameStore.createBattle({
      id: `battle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      player1Id: challenge.challengerId,
      player2Id: null as any, // AI battles have null player2Id
      player1Name: challenge.challengerName,
      player2Name: 'AI Opponent',
      isSimulation: true,
      firstRoundAbility,
      player1Deck: gameStore.getPlayer(challenge.challengerId)!.deck,
      player2Deck: aiDeck,
      player1Cards: cards,
      player2Cards: aiCards,
      player1Order: order,
      player2Order: aiOrder,
      toolUsages,
      rounds: [],
      currentRound: 0,
      player1Points: 0,
      player2Points: 0,
      player1TotalDamage: 0,
      player2TotalDamage: 0,
      status: 'ready',
      createdAt: new Date()
    });

    // Execute battle immediately using shared battleExecutor service
    const executeResult = executeBattle(battle);

    // Update challenge with battle ID
    const finalChallenge = gameStore.updateChallenge(challengeId, {
      battleId: battle.id,
      status: 'completed'
    });

    return res.json({
      challenge: finalChallenge,
      battle: executeResult
    });
  }

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
  const { cards, order, tools } = req.body;

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

  // Update challenge with defender's cards, order, and tools
  gameStore.updateChallenge(challengeId, {
    challengedCards: cards,
    challengedOrder: order,
    challengedTools: tools || {},
    status: 'ready'
  });

  // Process tool usage for both players
  const toolUsages: any[] = [];
  console.log('[Challenge Defense Setup] Processing defender tools:', tools);
  console.log('[Challenge Defense Setup] Challenger tools from challenge:', challenge.challengerTools);

  // Process challenger's tools (stored from when they set up)
  if (challenge.challengerTools && challenge.challengerCards) {
    for (const [position, toolId] of Object.entries(challenge.challengerTools)) {
      const cardPosition = parseInt(position);
      if (!isNaN(cardPosition) && toolId) {
        toolUsages.push({
          playerId: challenge.challengerId,
          toolId: toolId as string,
          cardId: challenge.challengerCards[cardPosition],
          cardPosition
        });
      }
    }
  }

  // Process defender's tools
  if (tools && typeof tools === 'object') {
    for (const [position, toolId] of Object.entries(tools)) {
      const cardPosition = parseInt(position);
      if (!isNaN(cardPosition) && toolId) {
        toolUsages.push({
          playerId: challenge.challengedId,
          toolId: toolId as string,
          cardId: cards[cardPosition],
          cardPosition
        });
      }
    }
  }

  console.log('[Challenge Defense Setup] Combined tool usages:', toolUsages);

  // Create the battle
  const battleId = `battle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const battle = gameStore.createBattle({
    id: battleId,
    player1Id: challenge.challengerId,
    player2Id: challenge.challengedId,
    player1Name: challenge.challengerName,
    player2Name: challenge.challengedName,
    isSimulation: false,
    firstRoundAbility: challenge.firstRoundAbility, // Use the challenge's firstRoundAbility
    player1Deck: gameStore.getPlayer(challenge.challengerId)!.deck,
    player2Deck: challenge.challengedId ? gameStore.getPlayer(challenge.challengedId)!.deck : [], // Empty for AI, will be set later
    player1Cards: challenge.challengerCards!,
    player2Cards: cards,
    player1Order: challenge.challengerOrder,
    player2Order: order,
    toolUsages,
    rounds: [],
    currentRound: 0,
    player1Points: 0,
    player2Points: 0,
    player1TotalDamage: 0,
    player2TotalDamage: 0,
    status: 'ready',
    createdAt: new Date()
  });

  // Apply each tool to the battle (this sets cooldowns immediately)
  for (const usage of toolUsages) {
    gameStore.applyToolToBattle(battleId, usage.playerId, usage.toolId, usage.cardId, usage.cardPosition);
  }

  // Execute battle immediately using shared battleExecutor service
  const executeResult = executeBattle(battle);

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

  // Only send notification to real players, not AI
  if (challenge.challengedId) {
    gameStore.sendNotification(
      challenge.challengedId,
      'battle_complete',
      'Battle Complete!',
      `Your battle against ${challenge.challengerName} is ready to view!`,
      { challengeId: challenge.id, battleId: battle.id }
    );
  }

  res.json({
    challenge: updatedChallenge,
    battle: executeResult
  });
});

// Use binoculars to reveal opponent cards (defender only)
router.post('/:challengeId/use-binoculars', (req: Request, res: Response) => {
  const { challengeId } = req.params;
  const { playerId } = req.body;

  const challenge = gameStore.getChallenge(challengeId);
  if (!challenge) {
    return res.status(404).json({ error: 'Challenge not found' });
  }

  // Validate that the player is the defender
  if (challenge.challengedId !== playerId) {
    return res.status(403).json({ error: 'Only the defender can use binoculars' });
  }

  // Validate challenge is in accepted state
  if (challenge.status !== 'accepted') {
    return res.status(400).json({ error: 'Challenge must be accepted to use binoculars' });
  }

  // Validate player has binoculars tool
  const playerTools = gameStore.getPlayerTools(playerId);
  const binocularsTool = playerTools.find(pt => pt.toolId === 'binoculars');

  if (!binocularsTool) {
    return res.status(400).json({ error: 'Player does not have binoculars' });
  }

  if (binocularsTool.cooldownRemaining > 0) {
    return res.status(400).json({ error: `Binoculars is on cooldown for ${binocularsTool.cooldownRemaining} more battle(s)` });
  }

  // Get tool details
  const tool = gameStore.getAllTools().find(t => t.id === 'binoculars');
  if (!tool) {
    return res.status(500).json({ error: 'Binoculars tool not found in game data' });
  }

  // Validate challenger has selected their cards
  if (!challenge.challengerCards || challenge.challengerCards.length === 0) {
    return res.status(400).json({ error: 'Challenger has not selected cards yet' });
  }

  // Randomly select N cards to reveal (where N = tool.effectValue, default 2)
  const numToReveal = tool.effectValue || 2;
  const revealedCards = [...challenge.challengerCards]
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.min(numToReveal, challenge.challengerCards.length));

  // Apply cooldown immediately
  gameStore.setToolCooldown(playerId, 'binoculars', tool.cooldown);
  console.log(`[Use Binoculars] Applied cooldown of ${tool.cooldown} to binoculars for player ${playerId}`);

  // Update challenge with revealed cards
  const updatedChallenge = gameStore.updateChallenge(challengeId, {
    revealedCards
  });

  res.json({
    challenge: updatedChallenge,
    revealedCards
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

// Simple ELO rating calculation
function calculateNewRating(playerRating: number, opponentRating: number, won: boolean): number {
  const K = 32; // K-factor for rating volatility
  const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  const actualScore = won ? 1 : 0;
  return Math.round(playerRating + K * (actualScore - expectedScore));
}

export default router;