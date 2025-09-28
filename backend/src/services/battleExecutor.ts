import { Battle, BattleRound, Card, Ability } from '../models/types';
import { gameStore } from '../data/store';

// Helper function to roll a D6
const rollD6 = (): number => Math.floor(Math.random() * 6) + 1;

// Helper function to randomly select ability
const selectRandomAbility = (): Ability => {
  const abilities: Ability[] = ['strength', 'speed', 'agility'];
  return abilities[Math.floor(Math.random() * abilities.length)];
};

export function executeBattle(battle: Battle): Battle {
  console.log(`[Battle Executor] Starting execution for battle ${battle.id}`);
  console.log(`[Battle Executor] Battle status: ${battle.status}`);
  console.log(`[Battle Executor] Player1 order:`, battle.player1Order);
  console.log(`[Battle Executor] Player2 order:`, battle.player2Order);

  if (!battle.player1Order || !battle.player2Order) {
    throw new Error('Both players must set their card orders');
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
      throw new Error(`Card not found for round ${i + 1}`);
    }

    // Select random ability for this round
    const ability = selectRandomAbility();

    // Get stat values
    const player1Stat = player1Card.abilities[ability];
    const player2Stat = player2Card.abilities[ability];

    // Debug log to check actual values
    console.log(`[Round ${i + 1}] ${ability}: P1 card ${player1Card.fullName || player1Card.name} stat = ${player1Stat}, P2 card ${player2Card.fullName || player2Card.name} stat = ${player2Stat}`);
    console.log(`[Round ${i + 1}] P1 card abilities:`, player1Card.abilities);
    console.log(`[Round ${i + 1}] P1 card baseAbilities:`, player1Card.baseAbilities);
    console.log(`[Round ${i + 1}] P1 card titleModifiers:`, player1Card.titleModifiers);

    // Roll D6 for each player
    const player1BaseRoll = rollD6();
    const player2BaseRoll = rollD6();

    // Check for critical hits BEFORE calculating totals
    const player1CritRoll = Math.random() * 100;
    const player1CriticalHit = player1Card.criticalHitChance && player1CritRoll < player1Card.criticalHitChance;

    const player2CritRoll = Math.random() * 100;
    const player2CriticalHit = player2Card.criticalHitChance && player2CritRoll < player2Card.criticalHitChance;

    // Calculate effective rolls (doubled on critical hit)
    let player1EffectiveRoll = player1BaseRoll;
    let player2EffectiveRoll = player2BaseRoll;

    if (player1CriticalHit) {
      console.log(`[Round ${i + 1}] Player 1 CRITICAL HIT! Dice doubled from ${player1BaseRoll} to ${player1BaseRoll * 2}`);
      player1EffectiveRoll = player1BaseRoll * 2;
    }
    if (player2CriticalHit) {
      console.log(`[Round ${i + 1}] Player 2 CRITICAL HIT! Dice doubled from ${player2BaseRoll} to ${player2BaseRoll * 2}`);
      player2EffectiveRoll = player2BaseRoll * 2;
    }

    // Calculate totals (with potentially doubled dice)
    const player1Total = player1Stat + player1EffectiveRoll;
    const player2Total = player2Stat + player2EffectiveRoll;

    // Log critical hit rolls
    console.log(`[Round ${i + 1}] P1 Critical: ${player1Card.criticalHitChance || 0}% chance, rolled ${player1CritRoll.toFixed(2)}, hit: ${player1CriticalHit}`);
    console.log(`[Round ${i + 1}] P2 Critical: ${player2Card.criticalHitChance || 0}% chance, rolled ${player2CritRoll.toFixed(2)}, hit: ${player2CriticalHit}`);

    // Determine round winner
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
      player1Roll: player1BaseRoll,  // Store original dice roll
      player2Roll: player2BaseRoll,  // Store original dice roll
      player1StatValue: player1Stat,
      player2StatValue: player2Stat,
      player1Total,
      player2Total,
      player1CriticalHit: player1CriticalHit || false,
      player2CriticalHit: player2CriticalHit || false,
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
  const player2 = battle.player2Id ? gameStore.getPlayer(battle.player2Id) : null;

  // Helper for ELO rating calculation
  const calculateNewRating = (playerRating: number, opponentRating: number, won: boolean): number => {
    const K = 32; // K-factor for rating volatility
    const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
    const actualScore = won ? 1 : 0;
    return Math.round(playerRating + K * (actualScore - expectedScore));
  };

  if (!battle.isSimulation && battle.player2Id) {
    // Real PvP battle - update both players
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
  } else {
    // Simulation battle - only update player1's stats
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

  return updatedBattle!;
}