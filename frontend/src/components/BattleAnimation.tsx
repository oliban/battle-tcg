import React, { useState, useEffect } from 'react';
import { Battle as BattleType, Card, BattleRound } from '../types';
import SimpleDice from './SimpleDice';
import voiceService from '../services/voice';
import './BattleAnimation.css';
import './PlayerName.css';

interface BattleAnimationProps {
  battle: BattleType;
  playerCards: Card[];
  onComplete: () => void;
}

interface RoundState {
  phase: 'battle-intro' | 'intro' | 'cards' | 'cards-flex' | 'ability' | 'rolling' | 'result' | 'damage-victory' | 'complete' | 'coin-toss' | 'final-results';
  player1DiceRolling: boolean;
  player2DiceRolling: boolean;
  showResult: boolean;
  player1StrongestStat?: 'strength' | 'speed' | 'agility';
  player2StrongestStat?: 'strength' | 'speed' | 'agility';
}

// Helper to get tool image URL
const getToolImageUrl = (toolName?: string): string | null => {
  if (!toolName) return null;
  const toolImageMap: Record<string, string> = {
    'Running Shoes': '/images/tools/running-shoes.png',
    'Sledge Hammer': '/images/tools/sledge-hammer.png',
    'Lube Tube': '/images/tools/lube-tube.png',
    'Spear': '/images/tools/spear.png',
    'Binoculars': '/images/tools/binoculars.png'
  };
  return toolImageMap[toolName] || null;
};

// Helper to check if a tool is active for the current ability
const isToolActiveForAbility = (toolName: string | undefined, ability: string): boolean => {
  if (!toolName) return false;

  const toolAbilityMap: Record<string, string[]> = {
    'Running Shoes': ['speed'],
    'Sledge Hammer': ['strength'],
    'Lube Tube': ['agility'],
    'Spear': ['strength', 'speed', 'agility'], // Works for any ability
    'Binoculars': [] // Special tool, not ability-based
  };

  const validAbilities = toolAbilityMap[toolName] || [];
  return validAbilities.includes(ability.toLowerCase());
};

const BattleAnimation: React.FC<BattleAnimationProps> = ({
  battle,
  playerCards,
  onComplete
}) => {
  const [currentRoundIndex, setCurrentRoundIndex] = useState(-1); // Start at -1 for battle intro
  const [roundState, setRoundState] = useState<RoundState>({
    phase: 'battle-intro',
    player1DiceRolling: false,
    player2DiceRolling: false,
    showResult: false
  });
  const [player1Score, setPlayer1Score] = useState(0);
  const [player2Score, setPlayer2Score] = useState(0);
  const [showToolBonus, setShowToolBonus] = useState(false);
  const [player1Damage, setPlayer1Damage] = useState(0);
  const [player2Damage, setPlayer2Damage] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [battleStarted, setBattleStarted] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [waitingForDebugContinue, setWaitingForDebugContinue] = useState(false);

  const currentRound = battle.rounds[currentRoundIndex];
  const isLastRound = currentRoundIndex === battle.rounds.length - 1;

  // Get card details for current round - match by exact ID from the round data
  const player1Card = battle.player1CardDetails?.find(c =>
    c.id === currentRound?.player1CardId
  ) || playerCards.find(c =>
    c.id === currentRound?.player1CardId
  );

  const player2Card = battle.player2CardDetails?.find(c =>
    c.id === currentRound?.player2CardId
  );

  // Debug mode delay function
  const delay = (ms: number) => {
    if (!debugMode) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
    // In debug mode, wait for manual continue
    setWaitingForDebugContinue(true);
    return new Promise<void>(resolve => {
      const checkInterval = setInterval(() => {
        // Check a ref or use a different approach since state might be stale
        const element = document.getElementById('debug-continue-flag');
        if (element && element.dataset.continue === 'true') {
          element.dataset.continue = 'false';
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  };

  const continueDebug = () => {
    const element = document.getElementById('debug-continue-flag');
    if (element) {
      element.dataset.continue = 'true';
    }
    setWaitingForDebugContinue(false);
  };

  useEffect(() => {
    // Start battle intro on mount
    const initBattle = async () => {
      console.log('Starting battle intro');

      // Announce the battle
      voiceService.speak(
        `${battle.player1Name} versus ${battle.player2Name || 'AI Opponent'}`,
        { rate: 0.8, pitch: 1.1, volume: 1.0 }
      );

      await delay(3000);

      // Start the first round
      setBattleStarted(true);
      setCurrentRoundIndex(0);
    };

    if (!battleStarted) {
      initBattle();
    }
  }, []); // Run only once on mount

  useEffect(() => {
    if (battleStarted && currentRound && !isAnimating) {
      // Use a timeout to ensure state updates have propagated
      const timeoutId = setTimeout(() => {
        runRoundAnimation();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [currentRoundIndex, isAnimating, battleStarted]);

  const runRoundAnimation = async () => {
    // Re-calculate these values inside the function to get fresh values
    const round = battle.rounds[currentRoundIndex];
    const lastRound = currentRoundIndex === battle.rounds.length - 1;

    console.log(`Starting animation for round ${currentRoundIndex + 1}`, {
      roundIndex: currentRoundIndex,
      round: round,
      isLastRound: lastRound,
      isAnimating
    });

    if (!round) {
      console.error(`No round found at index ${currentRoundIndex}`);
      return;
    }

    // Prevent concurrent animations
    setIsAnimating(true);

    // Reset state
    setRoundState({
      phase: 'intro' as RoundState['phase'],
      player1DiceRolling: false,
      player2DiceRolling: false,
      showResult: false
    });

    // Intro phase - show round number and announce it
    console.log(`[PHASE 1] Round ${currentRoundIndex + 1}: INTRO - Showing round number`);
    voiceService.speak(`Round ${currentRoundIndex + 1}`, {
      rate: 0.9,
      pitch: 1.2,
      volume: 1.0
    });
    await delay(1500);

    // Show cards first
    console.log(`[PHASE 2] Round ${currentRoundIndex + 1}: CARDS - Displaying player cards`);
    setRoundState(prev => ({ ...prev, phase: 'cards' }));

    // Get fresh card details
    const p1Card = battle.player1CardDetails?.find(c =>
      c.id === round.player1CardId
    );
    const p2Card = battle.player2CardDetails?.find(c =>
      c.id === round.player2CardId
    );

    // Determine strongest stats for each card
    let p1Strongest: 'strength' | 'speed' | 'agility' = 'strength';
    let p2Strongest: 'strength' | 'speed' | 'agility' = 'strength';

    if (p1Card) {
      const p1Max = Math.max(p1Card.abilities.strength, p1Card.abilities.speed, p1Card.abilities.agility);
      if (p1Card.abilities.speed === p1Max) p1Strongest = 'speed';
      else if (p1Card.abilities.agility === p1Max) p1Strongest = 'agility';
    }

    if (p2Card) {
      const p2Max = Math.max(p2Card.abilities.strength, p2Card.abilities.speed, p2Card.abilities.agility);
      if (p2Card.abilities.speed === p2Max) p2Strongest = 'speed';
      else if (p2Card.abilities.agility === p2Max) p2Strongest = 'agility';
    }

    // Announce card names
    if (p1Card && p2Card) {
      voiceService.speak(
        `${p1Card.fullName || p1Card.name} contro ${p2Card.fullName || p2Card.name}`,
        { rate: 0.9, pitch: 1.0, volume: 1.0 }
      );
    }

    await delay(2500);

    // Show cards flexing their strongest skill
    console.log(`[PHASE 3] Round ${currentRoundIndex + 1}: CARDS-FLEX - Cards showing strongest stats`);
    setRoundState(prev => ({
      ...prev,
      phase: 'cards-flex',
      player1StrongestStat: p1Strongest,
      player2StrongestStat: p2Strongest
    }));
    await delay(3000); // Extended flex time

    // Show ability being tested
    console.log(`[PHASE 4] Round ${currentRoundIndex + 1}: ABILITY - Revealing ability: ${round.ability}`);
    console.log(`  - Player 1 Tool: ${round.player1ToolName || 'None'} (Active for ${round.ability}? ${isToolActiveForAbility(round.player1ToolName, round.ability)})`);
    console.log(`  - Player 2 Tool: ${round.player2ToolName || 'None'} (Active for ${round.ability}? ${isToolActiveForAbility(round.player2ToolName, round.ability)})`);
    setRoundState(prev => ({ ...prev, phase: 'ability' }));

    // Announce the actual ability being tested
    if (p1Card && p2Card) {
      const abilityText = round.ability === 'strength' ? 'forza' :
                         round.ability === 'speed' ? 'velocità' :
                         round.ability === 'agility' ? 'agilità' : round.ability;
      voiceService.speak(`Prova di ${abilityText}`, {
        rate: 0.75,
        pitch: 1.1,
        volume: 1.0
      });

      // Announce tools that apply to this ability
      await delay(1000);

      // Reset tool bonus display, then animate it
      console.log(`[PHASE 5] Round ${currentRoundIndex + 1}: TOOL-ANNOUNCE - Announcing and applying tool bonuses`);
      console.log(`  - P1 Tool Bonus: ${round.player1ToolBonus || 0}, P2 Tool Bonus: ${round.player2ToolBonus || 0}`);
      setShowToolBonus(false);

      // In debug mode, skip micro-delays to avoid excessive clicking
      if (!debugMode) {
        await delay(200);
      }

      const toolAnnouncements = [];
      if (round.player1ToolName && round.player1ToolBonus) {
        toolAnnouncements.push(round.player1ToolName);
      }
      if (round.player2ToolName && round.player2ToolBonus) {
        toolAnnouncements.push(round.player2ToolName);
      }

      // Announce all tools at once to reduce debug clicks
      if (toolAnnouncements.length > 0) {
        const toolMessage = toolAnnouncements.length === 1
          ? `${toolAnnouncements[0]} applied!`
          : `${toolAnnouncements.join(' and ')} applied!`;

        voiceService.speak(toolMessage, {
          rate: 0.8,
          pitch: 1.2,
          volume: 0.9
        });

        // Animate tool bonus application
        setShowToolBonus(true);
        await delay(debugMode ? 100 : 800);
      }
    }

    await delay(2000);

    // Roll dice - longer for excitement!
    console.log(`[PHASE 6] Round ${currentRoundIndex + 1}: ROLLING - Rolling dice`);
    setRoundState(prev => ({
      ...prev,
      phase: 'rolling',
      player1DiceRolling: true,
      player2DiceRolling: true
    }));
    await delay(3000); // Longer dice roll for suspense

    // Stop rolling and show values
    console.log(`[PHASE 7] Round ${currentRoundIndex + 1}: DICE-VALUES - Showing dice results`);
    console.log(`  - P1 Roll: ${round.player1Roll}, P2 Roll: ${round.player2Roll}`);
    setRoundState(prev => ({
      ...prev,
      player1DiceRolling: false,
      player2DiceRolling: false
    }));
    await delay(1500);

    // Show result
    console.log(`[PHASE 8] Round ${currentRoundIndex + 1}: RESULT - Showing winner: ${round.winner}`);
    console.log(`  - P1 Total: ${round.player1Total} (${round.player1StatValue} + ${round.player1Roll})`);
    console.log(`  - P2 Total: ${round.player2Total} (${round.player2StatValue} + ${round.player2Roll})`);
    console.log(`  - Critical hits: P1=${round.player1CriticalHit}, P2=${round.player2CriticalHit}`);
    setRoundState(prev => ({ ...prev, phase: 'result', showResult: true }));

    // Announce critical hits first (only once if both players crit)
    if (round.player1CriticalHit || round.player2CriticalHit) {
      voiceService.speak('Critical hit!', { rate: 1.0, pitch: 1.5, volume: 1.2 });
      await delay(800);
    }

    // Wait 2 seconds before announcing the winner
    await delay(2000);

    // Update scores and damage, announce the result
    if (round.winner === 'player1') {
      setPlayer1Score(prev => prev + 1);
      // Update damage if any was dealt
      if (round.damageDealt > 0) {
        setPlayer1Damage(prev => prev + round.damageDealt);
      }
      if (p1Card) {
        voiceService.speakRoundResult(
          round.player1Total,
          round.player2Total,
          p1Card.fullName || p1Card.name
        );
      }
    } else if (round.winner === 'player2') {
      setPlayer2Score(prev => prev + 1);
      // Update damage if any was dealt
      if (round.damageDealt > 0) {
        setPlayer2Damage(prev => prev + round.damageDealt);
      }
      if (p2Card) {
        voiceService.speakRoundResult(
          round.player1Total,
          round.player2Total,
          p2Card.fullName || p2Card.name
        );
      }
    } else {
      // Draw
      voiceService.speak('Pareggio!', { rate: 0.9, pitch: 1.0 });
    }

    // Always add 2 second delay between rounds
    await delay(5500); // 3.5s for voice + 2s extra delay

    // Move to next round or complete
    if (!lastRound) {
      console.log(`Round ${currentRoundIndex + 1} complete, moving to round ${currentRoundIndex + 2}`);
      // Reset to intro phase BEFORE changing round to prevent flash
      setRoundState({
        phase: 'intro' as RoundState['phase'],
        player1DiceRolling: false,
        player2DiceRolling: false,
        showResult: false
      });
      // Small delay to ensure phase change is applied
      await delay(100);
      // Reset animation flag before moving to next round
      setIsAnimating(false);
      setCurrentRoundIndex(prev => prev + 1);
    } else {
      console.log(`Round ${currentRoundIndex + 1} complete, battle finished`);

      // Check if damage determined the winner (not a clear points victory)
      // Only show damage victory if battle was won by damage (winReason === 'damage')
      const isDamageVictory = battle.winReason === 'damage';
      const isCoinToss = battle.winReason === 'coin-toss';

      if (isDamageVictory) {
        // Show damage victory screen first
        setRoundState(prev => ({ ...prev, phase: 'damage-victory' }));

        // Announce damage victory
        const winnerName = battle.winner === battle.player1Id ?
          (battle.player1Name || 'Player 1') :
          (battle.player2Name || 'AI Opponent');
        voiceService.speak(`Danno! ${winnerName} vince con danno!`, {
          rate: 0.8,
          pitch: 1.3,
          volume: 1.0
        });

        await delay(4000);
      }

      // Show coin toss animation if battle was decided by coin toss
      if (isCoinToss) {
        setRoundState(prev => ({ ...prev, phase: 'coin-toss' }));
        voiceService.speak('Lancio della moneta!', {
          rate: 0.9,
          pitch: 1.2,
          volume: 1.0
        });
        await delay(3500); // Wait for coin animation
      }

      // Show final results screen
      setRoundState(prev => ({ ...prev, phase: 'final-results' }));

      // Calculate actual final score from battle rounds
      const actualPlayer1Score = battle.rounds.filter(r => r.winner === 'player1').length;
      const actualPlayer2Score = battle.rounds.filter(r => r.winner === 'player2').length;

      // Announce the winner with correct score
      const winner = battle.winner === battle.player1Id ? battle.player1Name : (battle.player2Name || 'AI Opponent');
      const finalScore = `${actualPlayer1Score} a ${actualPlayer2Score}`;
      voiceService.speak(
        `${winner} vince ${finalScore}`,
        { rate: 0.8, pitch: 1.2, volume: 1.0 }
      );

      await delay(5000);
      onComplete();
    }
  };


  const getAbilityIcon = (ability: string) => {
    switch (ability) {
      case 'strength': return '💪';
      case 'speed': return '⚡';
      case 'agility': return '🎯';
      default: return '❓';
    }
  };

  const getAbilityColor = (ability: string) => {
    switch (ability) {
      case 'strength': return '#e74c3c';
      case 'speed': return '#f39c12';
      case 'agility': return '#3498db';
      default: return '#95a5a6';
    }
  };

  // Reusable component for stat display
  const StatDisplay = ({
    ability,
    statValue,
    baseStatValue,
    toolBonus,
    toolName,
    showToolBonus
  }: {
    ability: string;
    statValue: number;
    baseStatValue?: number;
    toolBonus?: number;
    toolName?: string;
    showToolBonus: boolean;
  }) => (
    <div className="stat-display-large">
      <span className="stat-label-large">{ability.toUpperCase()}</span>
      <span className="stat-value-large">
        {showToolBonus && toolBonus ?
          <>
            {baseStatValue || statValue - (toolBonus || 0)}
            <span style={{
              color: '#00ff88',
              animation: 'pulse 0.6s ease-in-out',
              marginLeft: '4px'
            }}>
              +{toolBonus}
            </span>
          </>
          : (baseStatValue || statValue)
        }
        {toolName && (
          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', marginLeft: '10px' }}>
            {getToolImageUrl(toolName) && (
              <img
                src={getToolImageUrl(toolName)!}
                alt={toolName}
                style={{
                  width: '16px',
                  height: '16px',
                  objectFit: 'contain',
                  filter: toolBonus ? 'none' : 'grayscale(100%) opacity(0.5)'
                }}
              />
            )}
            <span style={{
              fontSize: '0.3em',
              color: toolBonus ? '#00ff88' : '#666',
              marginTop: '2px',
              textAlign: 'center',
              maxWidth: '40px',
              lineHeight: '1'
            }}>
              {toolBonus ? '' : 'N/A'}
            </span>
          </div>
        )}
      </span>
    </div>
  );

  // During battle intro, we don't need cards yet
  if (currentRoundIndex >= 0 && (!currentRound || !player1Card || !player2Card)) {
    return <div>Loading battle...</div>;
  }

  return (
    <div className="battle-animation-container">
      {/* Hidden element for debug continue flag */}
      <div id="debug-continue-flag" data-continue="false" style={{ display: 'none' }} />

      {/* Debug Controls */}
      <div style={{
        position: 'fixed',
        top: '100px',
        right: '20px',
        background: 'rgba(255, 0, 0, 0.95)',
        color: 'white',
        padding: '20px',
        borderRadius: '10px',
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        minWidth: '250px',
        border: '4px solid #ffff00',
        boxShadow: '0 0 40px rgba(255, 255, 0, 0.8)',
        fontSize: '16px',
        fontWeight: 'bold'
      }}>
        <button
          onClick={() => setDebugMode(!debugMode)}
          style={{
            padding: '8px',
            background: debugMode ? '#27ae60' : '#e74c3c',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Debug Mode: {debugMode ? 'ON' : 'OFF'}
        </button>

        {debugMode && (
          <>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>
              Phase: {roundState.phase}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>
              Round: {currentRoundIndex + 1}/3
            </div>
            {waitingForDebugContinue && (
              <button
                onClick={continueDebug}
                style={{
                  padding: '10px',
                  background: '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  animation: 'pulse 1s infinite'
                }}
              >
                ▶️ Continue to Next Phase
              </button>
            )}
          </>
        )}
      </div>
      {/* Score Display */}
      <div className="battle-score-display">
        <div className="player-score">
          <span className="player-name-display medium epic">{battle.player1Name}</span>
          <span className="score">{player1Score}</span>
          {player1Damage > 0 && (
            <div style={{
              fontSize: '12px',
              color: '#ff6b6b',
              fontWeight: 'bold',
              marginTop: '5px',
              animation: player1Damage > 0 ? 'pulse 0.5s' : 'none'
            }}>
              💥 {player1Damage} damage
            </div>
          )}
        </div>
        <div className="round-indicator">
          {currentRoundIndex >= 0 ? `Round ${currentRoundIndex + 1} / 3` : 'Battle Starting'}
        </div>
        <div className="player-score">
          <span className={`player-name-display medium epic ${!battle.player2Name ? 'ai-opponent' : ''}`}>{battle.player2Name || 'AI Opponent'}</span>
          <span className="score">{player2Score}</span>
          {player2Damage > 0 && (
            <div style={{
              fontSize: '12px',
              color: '#ff6b6b',
              fontWeight: 'bold',
              marginTop: '5px',
              animation: player2Damage > 0 ? 'pulse 0.5s' : 'none'
            }}>
              💥 {player2Damage} damage
            </div>
          )}
        </div>
      </div>

      {/* Round Animation */}
      <div className="battle-arena">
        {roundState.phase === 'battle-intro' && (
          <div className="battle-intro animated-fade-in" style={{
            textAlign: 'center',
            color: 'white',
            padding: '60px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%'
          }}>
            <h1 className="player-name-display large epic" style={{ fontSize: '64px', marginBottom: '20px' }}>
              {battle.player1Name}
            </h1>
            <h2 style={{ fontSize: '48px', margin: '20px 0', color: '#f1c40f' }}>VS</h2>
            <h1 className={`player-name-display large epic ${!battle.player2Name ? 'ai-opponent' : ''}`} style={{ fontSize: '64px', marginTop: '20px' }}>
              {battle.player2Name || 'AI Opponent'}
            </h1>
          </div>
        )}

        {roundState.phase === 'intro' && (
          <div className="round-intro animated-fade-in">
            <h1>ROUND {currentRoundIndex + 1}</h1>
          </div>
        )}

        {roundState.phase === 'coin-toss' && (
          <div className="coin-toss-animation animated-fade-in" style={{
            textAlign: 'center',
            color: 'white',
            padding: '60px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%'
          }}>
            <h1 style={{
              fontSize: '48px',
              marginBottom: '40px',
              color: '#f1c40f',
              textShadow: '3px 3px 6px rgba(0,0,0,0.5)'
            }}>
              COIN TOSS!
            </h1>
            <div className="coin-flip" style={{
              width: '150px',
              height: '150px',
              margin: '40px auto',
              position: 'relative',
              transformStyle: 'preserve-3d',
              animation: 'coinFlip 1s ease-in-out 3'
            }}>
              <div style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                border: '8px solid #DAA520',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '64px',
                fontWeight: 'bold',
                color: '#8B4513'
              }}>
                🪙
              </div>
            </div>
            <h2 style={{
              fontSize: '32px',
              marginTop: '40px',
              color: '#ecf0f1'
            }}>
              Deciding the winner...
            </h2>
          </div>
        )}

        {roundState.phase === 'final-results' && (
          <div className="final-results animated-fade-in" style={{
            textAlign: 'center',
            color: 'white',
            padding: '60px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%'
          }}>
            <h1 style={{
              fontSize: '72px',
              marginBottom: '30px',
              color: battle.winner === battle.player1Id ? '#2ecc71' : '#e74c3c',
              textShadow: '4px 4px 8px rgba(0,0,0,0.5)'
            }}>
              <span className="player-name-display large epic">{battle.winner === battle.player1Id ? battle.player1Name : (battle.player2Name || 'AI Opponent')}</span> WINS!
            </h1>
            <h2 style={{
              fontSize: '56px',
              color: '#f1c40f',
              textShadow: '3px 3px 6px rgba(0,0,0,0.5)'
            }}>
              {battle.rounds.filter(r => r.winner === 'player1').length} - {battle.rounds.filter(r => r.winner === 'player2').length}
            </h2>
            {battle.winReason === 'coin-toss' && (
              <div style={{
                fontSize: '32px',
                marginTop: '20px',
                color: '#f39c12',
                textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                fontStyle: 'italic'
              }}>
                🪙 Won by Coin Toss
              </div>
            )}
            {(player1Damage > 0 || player2Damage > 0) && (
              <div style={{ fontSize: '28px', marginTop: '30px', display: 'flex', gap: '40px', justifyContent: 'center' }}>
                <div style={{ color: battle.winner === battle.player1Id ? '#2ecc71' : '#e74c3c' }}>
                  <strong className="player-name-display medium">{battle.player1Name}</strong>
                  <div style={{ color: '#ff6b6b' }}>💥 {player1Damage} damage</div>
                </div>
                <div style={{ color: battle.winner === battle.player1Id ? '#e74c3c' : '#2ecc71' }}>
                  <strong className={`player-name-display medium ${!battle.player2Name ? 'ai-opponent' : ''}`}>{battle.player2Name || 'AI Opponent'}</strong>
                  <div style={{ color: '#ff6b6b' }}>💥 {player2Damage} damage</div>
                </div>
              </div>
            )}
          </div>
        )}

        {(roundState.phase === 'cards' || roundState.phase === 'cards-flex' ||
          roundState.phase === 'ability' || roundState.phase === 'rolling' ||
          roundState.phase === 'result') && player1Card && player2Card && (
          <div className="battle-field">
            <div className={`player-side ${roundState.phase === 'cards' ? 'slide-in-left' : ''}`}>
              <div className="battle-card-container">
                {player1Card.imageUrl && (
                  <div className="card-battle-image" style={{ position: 'relative' }}>
                    <img src={player1Card.imageUrl} alt={player1Card.name} />
                    {currentRound.player1ToolName && getToolImageUrl(currentRound.player1ToolName) && (
                      <div
                        className="tool-icon-overlay"
                        style={{
                          position: 'absolute',
                          top: '8px',
                          left: '8px',
                          width: '80px',
                          height: '80px',
                          borderRadius: '50%',
                          backgroundColor: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: (roundState.phase === 'cards' || roundState.phase === 'cards-flex') ? 0.4 : (isToolActiveForAbility(currentRound.player1ToolName, currentRound.ability) ? 1 : 0.4),
                          border: (roundState.phase !== 'cards' && roundState.phase !== 'cards-flex' && isToolActiveForAbility(currentRound.player1ToolName, currentRound.ability)) ? '2px solid #00ff88' : '2px solid #666',
                          transition: 'all 0.3s ease',
                          filter: (roundState.phase === 'cards' || roundState.phase === 'cards-flex') ? 'grayscale(100%)' : (isToolActiveForAbility(currentRound.player1ToolName, currentRound.ability) ? 'none' : 'grayscale(100%)')
                        }}
                      >
                        <img
                          src={getToolImageUrl(currentRound.player1ToolName)!}
                          alt={currentRound.player1ToolName}
                          style={{
                            width: '56px',
                            height: '56px',
                            objectFit: 'contain'
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
                <div className="card-name-display">{player1Card.fullName || player1Card.name}</div>
                <div className="card-stats-display">
                  <div className={`stat-item ${(roundState.phase === 'ability' || roundState.phase === 'rolling' || roundState.phase === 'result') && currentRound.ability === 'strength' ? 'active-stat' : ''} ${roundState.phase === 'cards-flex' && roundState.player1StrongestStat === 'strength' ? 'flex-stat' : ''}`}>
                    <span className="stat-icon">💪</span>
                    <span className="stat-label">STR</span>
                    <span className="stat-value">
                      {player1Card.abilities.strength}
                      {player1Card.titleModifiers?.strength ? (
                        <span style={{ color: '#4CAF50', fontSize: '0.7em', marginLeft: '2px' }}>
                          ({player1Card.abilities.strength - player1Card.titleModifiers.strength}{player1Card.titleModifiers.strength > 0 ? '+' : ''}{player1Card.titleModifiers.strength})
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <div className={`stat-item ${(roundState.phase === 'ability' || roundState.phase === 'rolling' || roundState.phase === 'result') && currentRound.ability === 'speed' ? 'active-stat' : ''} ${roundState.phase === 'cards-flex' && roundState.player1StrongestStat === 'speed' ? 'flex-stat' : ''}`}>
                    <span className="stat-icon">⚡</span>
                    <span className="stat-label">SPD</span>
                    <span className="stat-value">
                      {player1Card.abilities.speed}
                      {player1Card.titleModifiers?.speed ? (
                        <span style={{ color: '#4CAF50', fontSize: '0.7em', marginLeft: '2px' }}>
                          ({player1Card.abilities.speed - player1Card.titleModifiers.speed}{player1Card.titleModifiers.speed > 0 ? '+' : ''}{player1Card.titleModifiers.speed})
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <div className={`stat-item ${(roundState.phase === 'ability' || roundState.phase === 'rolling' || roundState.phase === 'result') && currentRound.ability === 'agility' ? 'active-stat' : ''} ${roundState.phase === 'cards-flex' && roundState.player1StrongestStat === 'agility' ? 'flex-stat' : ''}`}>
                    <span className="stat-icon">🎯</span>
                    <span className="stat-label">AGL</span>
                    <span className="stat-value">
                      {player1Card.abilities.agility}
                      {player1Card.titleModifiers?.agility ? (
                        <span style={{ color: '#4CAF50', fontSize: '0.7em', marginLeft: '2px' }}>
                          ({player1Card.abilities.agility - player1Card.titleModifiers.agility}{player1Card.titleModifiers.agility > 0 ? '+' : ''}{player1Card.titleModifiers.agility})
                        </span>
                      ) : null}
                    </span>
                  </div>
                </div>
              </div>
              {(roundState.phase === 'rolling' || roundState.phase === 'result') && (
                <div className="dice-area">
                  <StatDisplay
                    ability={currentRound.ability}
                    statValue={currentRound.player1StatValue}
                    baseStatValue={currentRound.player1BaseStatValue}
                    toolBonus={currentRound.player1ToolBonus}
                    toolName={currentRound.player1ToolName}
                    showToolBonus={showToolBonus}
                  />
                  <div className="dice-roll-area" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <div style={{ position: 'relative', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <SimpleDice
                        value={currentRound.player1Roll}
                        isRolling={roundState.player1DiceRolling}
                        size="large"
                        color="#3498db"
                        player="Player 1"
                      />
                      {!roundState.player1DiceRolling && roundState.phase === 'result' && currentRound.player1CriticalHit && (
                        <span className="critical-multiplier" style={{ position: 'absolute', right: '-40px', top: '50%', transform: 'translateY(-50%)' }}>×2</span>
                      )}
                    </div>
                    {!roundState.player1DiceRolling && roundState.phase === 'result' && currentRound.player1CriticalHit && (
                      <div className="critical-hit-text">Critical hit! {currentRound.player1Roll} points!</div>
                    )}
                  </div>
                  {!roundState.player1DiceRolling && roundState.phase === 'result' && (
                    <div className={`battle-total-score animated-pop-in ${currentRound.player1CriticalHit ? 'critical-total' : ''}`}>
                      = {currentRound.player1Total}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="battle-center">
              {roundState.phase === 'ability' && (
                <div className="ability-reveal animated-zoom-in">
                  <div
                    className="ability-icon-large"
                    style={{ color: getAbilityColor(currentRound.ability) }}
                  >
                    {getAbilityIcon(currentRound.ability)}
                  </div>
                  <h1 className="ability-name-large">{currentRound.ability.toUpperCase()}</h1>
                  <p className="ability-test-label">SKILL TEST</p>
                </div>
              )}

              {roundState.phase === 'result' && roundState.showResult && (
                <div className="round-result animated-bounce-in">
                  {currentRound.winner === 'player1' && (
                    <>
                      <div className="winner-badge">WINNER</div>
                      <div className="winner-arrow left">←</div>
                    </>
                  )}
                  {currentRound.winner === 'player2' && (
                    <>
                      <div className="winner-badge">WINNER</div>
                      <div className="winner-arrow right">→</div>
                    </>
                  )}
                  {currentRound.winner === 'draw' && (
                    <div className="draw-badge">DRAW</div>
                  )}
                  {currentRound.damageDealt > 0 && (
                    <div className="damage-display">
                      Damage: {currentRound.damageDealt}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className={`player-side opponent ${roundState.phase === 'cards' ? 'slide-in-right' : ''}`}>
              <div className="battle-card-container">
                {player2Card.imageUrl && (
                  <div className="card-battle-image" style={{ position: 'relative' }}>
                    <img src={player2Card.imageUrl} alt={player2Card.name} />
                    {currentRound.player2ToolName && getToolImageUrl(currentRound.player2ToolName) && (
                      <div
                        className="tool-icon-overlay"
                        style={{
                          position: 'absolute',
                          top: '8px',
                          left: '8px',
                          width: '80px',
                          height: '80px',
                          borderRadius: '50%',
                          backgroundColor: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: (roundState.phase === 'cards' || roundState.phase === 'cards-flex') ? 0.4 : (isToolActiveForAbility(currentRound.player2ToolName, currentRound.ability) ? 1 : 0.4),
                          border: (roundState.phase !== 'cards' && roundState.phase !== 'cards-flex' && isToolActiveForAbility(currentRound.player2ToolName, currentRound.ability)) ? '2px solid #00ff88' : '2px solid #666',
                          transition: 'all 0.3s ease',
                          filter: (roundState.phase === 'cards' || roundState.phase === 'cards-flex') ? 'grayscale(100%)' : (isToolActiveForAbility(currentRound.player2ToolName, currentRound.ability) ? 'none' : 'grayscale(100%)')
                        }}
                      >
                        <img
                          src={getToolImageUrl(currentRound.player2ToolName)!}
                          alt={currentRound.player2ToolName}
                          style={{
                            width: '56px',
                            height: '56px',
                            objectFit: 'contain'
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
                <div className="card-name-display">{player2Card.fullName || player2Card.name}</div>
                <div className="card-stats-display">
                  <div className={`stat-item ${(roundState.phase === 'ability' || roundState.phase === 'rolling' || roundState.phase === 'result') && currentRound.ability === 'strength' ? 'active-stat' : ''} ${roundState.phase === 'cards-flex' && roundState.player2StrongestStat === 'strength' ? 'flex-stat' : ''}`}>
                    <span className="stat-icon">💪</span>
                    <span className="stat-label">STR</span>
                    <span className="stat-value">
                      {player2Card.abilities.strength}
                      {player2Card.titleModifiers?.strength ? (
                        <span style={{ color: '#4CAF50', fontSize: '0.7em', marginLeft: '2px' }}>
                          ({player2Card.abilities.strength - player2Card.titleModifiers.strength}{player2Card.titleModifiers.strength > 0 ? '+' : ''}{player2Card.titleModifiers.strength})
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <div className={`stat-item ${(roundState.phase === 'ability' || roundState.phase === 'rolling' || roundState.phase === 'result') && currentRound.ability === 'speed' ? 'active-stat' : ''} ${roundState.phase === 'cards-flex' && roundState.player2StrongestStat === 'speed' ? 'flex-stat' : ''}`}>
                    <span className="stat-icon">⚡</span>
                    <span className="stat-label">SPD</span>
                    <span className="stat-value">
                      {player2Card.abilities.speed}
                      {player2Card.titleModifiers?.speed ? (
                        <span style={{ color: '#4CAF50', fontSize: '0.7em', marginLeft: '2px' }}>
                          ({player2Card.abilities.speed - player2Card.titleModifiers.speed}{player2Card.titleModifiers.speed > 0 ? '+' : ''}{player2Card.titleModifiers.speed})
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <div className={`stat-item ${(roundState.phase === 'ability' || roundState.phase === 'rolling' || roundState.phase === 'result') && currentRound.ability === 'agility' ? 'active-stat' : ''} ${roundState.phase === 'cards-flex' && roundState.player2StrongestStat === 'agility' ? 'flex-stat' : ''}`}>
                    <span className="stat-icon">🎯</span>
                    <span className="stat-label">AGL</span>
                    <span className="stat-value">
                      {player2Card.abilities.agility}
                      {player2Card.titleModifiers?.agility ? (
                        <span style={{ color: '#4CAF50', fontSize: '0.7em', marginLeft: '2px' }}>
                          ({player2Card.abilities.agility - player2Card.titleModifiers.agility}{player2Card.titleModifiers.agility > 0 ? '+' : ''}{player2Card.titleModifiers.agility})
                        </span>
                      ) : null}
                    </span>
                  </div>
                </div>
              </div>
              {(roundState.phase === 'rolling' || roundState.phase === 'result') && (
                <div className="dice-area">
                  <StatDisplay
                    ability={currentRound.ability}
                    statValue={currentRound.player2StatValue}
                    baseStatValue={currentRound.player2BaseStatValue}
                    toolBonus={currentRound.player2ToolBonus}
                    toolName={currentRound.player2ToolName}
                    showToolBonus={showToolBonus}
                  />
                  <div className="dice-roll-area" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <div style={{ position: 'relative', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <SimpleDice
                        value={currentRound.player2Roll}
                        isRolling={roundState.player2DiceRolling}
                        size="large"
                        color="#e74c3c"
                        player="Player 2"
                      />
                      {!roundState.player2DiceRolling && roundState.phase === 'result' && currentRound.player2CriticalHit && (
                        <span className="critical-multiplier" style={{ position: 'absolute', right: '-40px', top: '50%', transform: 'translateY(-50%)' }}>×2</span>
                      )}
                    </div>
                    {!roundState.player2DiceRolling && roundState.phase === 'result' && currentRound.player2CriticalHit && (
                      <div className="critical-hit-text">Critical hit! {currentRound.player2Roll} points!</div>
                    )}
                  </div>
                  {!roundState.player2DiceRolling && roundState.phase === 'result' && (
                    <div className={`battle-total-score animated-pop-in ${currentRound.player2CriticalHit ? 'critical-total' : ''}`}>
                      = {currentRound.player2Total}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {roundState.phase === 'damage-victory' && (
          <div className="damage-victory animated-zoom-in" style={{
            textAlign: 'center',
            padding: '40px',
            background: 'linear-gradient(135deg, #ff6b6b, #ff4757)',
            borderRadius: '20px',
            boxShadow: '0 10px 30px rgba(255, 71, 87, 0.5)',
            animation: 'pulse 1.5s infinite'
          }}>
            <h1 style={{ fontSize: '4em', marginBottom: '20px', color: '#fff' }}>💥 DAMAGE VICTORY! 💥</h1>
            <div style={{ fontSize: '2.5em', marginBottom: '20px', color: '#fff' }}>
              {(() => {
                const damageRound = battle.rounds.find(r => r.damageDealt > 0);
                return damageRound ? `${damageRound.damageDealt} DAMAGE DEALT!` : '';
              })()}
            </div>
            <h2 style={{ fontSize: '3em', color: '#ffeb3b' }}>
              {battle.winner === battle.player1Id ?
                <><span className="player-name-display large epic">{battle.player1Name}</span> WINS BY DAMAGE!</> :
                <><span className={`player-name-display large epic ${!battle.player2Name ? 'ai-opponent' : ''}`}>{battle.player2Name || 'AI Opponent'}</span> WINS BY DAMAGE!</>}
            </h2>
          </div>
        )}

        {roundState.phase === 'complete' && (
          <div className="battle-complete animated-fade-in">
            <h1>BATTLE COMPLETE!</h1>
            <div className="final-scores">
              <span>{player1Score}</span>
              <span>-</span>
              <span>{player2Score}</span>
            </div>
            <h2>
              {battle.winner === battle.player1Id ?
                <><span className="player-name-display large epic">{battle.player1Name}</span> WINS!</> :
                <><span className={`player-name-display large epic ${!battle.player2Name ? 'ai-opponent' : ''}`}>{battle.player2Name || 'AI Opponent'}</span> WINS!</>}
            </h2>
            {/* Announce winner */}
            {(() => {
              const winnerName = battle.winner === battle.player1Id ?
                (battle.player1Name || 'Player 1') :
                (battle.player2Name || 'AI Opponent');
              // Only announce if not already announced in damage victory
              const damageRound = battle.rounds.find(r => r.damageDealt > 0);
              if (!damageRound) {
                voiceService.speakBattleComplete(winnerName);
              }
              return null;
            })()}
          </div>
        )}
      </div>

      {/* Skip Animation Button */}
      <button className="skip-button" onClick={() => {
        voiceService.stop();
        onComplete();
      }}>
        Skip Animation
      </button>
    </div>
  );
};

export default BattleAnimation;