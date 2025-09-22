import React, { useState, useEffect } from 'react';
import { Battle as BattleType, Card, BattleRound } from '../types';
import DiceRoll from './DiceRoll';
import voiceService from '../services/voice';
import './BattleAnimation.css';

interface BattleAnimationProps {
  battle: BattleType;
  playerCards: Card[];
  onComplete: () => void;
}

interface RoundState {
  phase: 'intro' | 'cards' | 'ability' | 'rolling' | 'result' | 'complete';
  player1DiceRolling: boolean;
  player2DiceRolling: boolean;
  showResult: boolean;
}

const BattleAnimation: React.FC<BattleAnimationProps> = ({
  battle,
  playerCards,
  onComplete
}) => {
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [roundState, setRoundState] = useState<RoundState>({
    phase: 'intro',
    player1DiceRolling: false,
    player2DiceRolling: false,
    showResult: false
  });
  const [player1Score, setPlayer1Score] = useState(0);
  const [player2Score, setPlayer2Score] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const currentRound = battle.rounds[currentRoundIndex];
  const isLastRound = currentRoundIndex === battle.rounds.length - 1;

  // Get card details for current round - match by base ID (without instance suffix)
  const getBaseId = (id: string) => id.split('_')[0];

  const player1Card = battle.player1CardDetails?.find(c =>
    c.id === currentRound?.player1CardId || getBaseId(c.id) === getBaseId(currentRound?.player1CardId || '')
  ) || playerCards.find(c =>
    c.id === currentRound?.player1CardId || getBaseId(c.id) === getBaseId(currentRound?.player1CardId || '')
  );

  const player2Card = battle.player2CardDetails?.find(c =>
    c.id === currentRound?.player2CardId || getBaseId(c.id) === getBaseId(currentRound?.player2CardId || '')
  );

  useEffect(() => {
    if (currentRound && !isAnimating) {
      // Use a timeout to ensure state updates have propagated
      const timeoutId = setTimeout(() => {
        runRoundAnimation();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [currentRoundIndex, isAnimating]);

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
      phase: 'intro',
      player1DiceRolling: false,
      player2DiceRolling: false,
      showResult: false
    });

    // Intro phase - show round number
    console.log(`Round ${currentRoundIndex + 1}: Showing intro`);
    await delay(1500);

    // Show cards and announce the matchup
    console.log(`Round ${currentRoundIndex + 1}: Showing cards`);
    setRoundState(prev => ({ ...prev, phase: 'cards' }));

    // Get fresh card details for voice announcement
    const p1Card = battle.player1CardDetails?.find(c =>
      c.id === round.player1CardId || getBaseId(c.id) === getBaseId(round.player1CardId || '')
    );
    const p2Card = battle.player2CardDetails?.find(c =>
      c.id === round.player2CardId || getBaseId(c.id) === getBaseId(round.player2CardId || '')
    );

    if (p1Card && p2Card) {
      voiceService.speakRoundIntro(
        currentRoundIndex + 1,
        p1Card.fullName || p1Card.name,
        p2Card.fullName || p2Card.name,
        round.ability
      );
    }

    await delay(3500); // Extra time for voice announcement

    // Show ability being tested
    console.log(`Round ${currentRoundIndex + 1}: Showing ability - ${round.ability}`);
    setRoundState(prev => ({ ...prev, phase: 'ability' }));
    await delay(2000);

    // Roll dice - longer for excitement!
    console.log(`Round ${currentRoundIndex + 1}: Rolling dice`);
    setRoundState(prev => ({
      ...prev,
      phase: 'rolling',
      player1DiceRolling: true,
      player2DiceRolling: true
    }));
    await delay(3000); // Longer dice roll for suspense

    // Stop rolling and show values
    console.log(`Round ${currentRoundIndex + 1}: Showing dice values`);
    setRoundState(prev => ({
      ...prev,
      player1DiceRolling: false,
      player2DiceRolling: false
    }));
    await delay(1500);

    // Show result
    console.log(`Round ${currentRoundIndex + 1}: Showing result - winner: ${round.winner}`);
    setRoundState(prev => ({ ...prev, phase: 'result', showResult: true }));

    // Update scores and announce the result
    if (round.winner === 'player1') {
      setPlayer1Score(prev => prev + 1);
      if (p1Card) {
        voiceService.speakRoundResult(
          round.player1Total,
          round.player2Total,
          p1Card.fullName || p1Card.name
        );
      }
    } else if (round.winner === 'player2') {
      setPlayer2Score(prev => prev + 1);
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

    await delay(3500); // Extra time for voice announcement

    // Move to next round or complete
    if (!lastRound) {
      console.log(`Round ${currentRoundIndex + 1} complete, moving to round ${currentRoundIndex + 2}`);
      // Reset animation flag before moving to next round
      setIsAnimating(false);
      setCurrentRoundIndex(prev => prev + 1);
    } else {
      console.log(`Round ${currentRoundIndex + 1} complete, battle finished`);
      setRoundState(prev => ({ ...prev, phase: 'complete' }));
      await delay(3000);
      onComplete();
    }
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

  if (!currentRound || !player1Card || !player2Card) {
    return <div>Loading battle...</div>;
  }

  return (
    <div className="battle-animation-container">
      {/* Score Display */}
      <div className="battle-score-display">
        <div className="player-score">
          <span className="player-name">{battle.player1Name}</span>
          <span className="score">{player1Score}</span>
        </div>
        <div className="round-indicator">
          Round {currentRoundIndex + 1} / 3
        </div>
        <div className="player-score">
          <span className="player-name">{battle.player2Name || 'AI Opponent'}</span>
          <span className="score">{player2Score}</span>
        </div>
      </div>

      {/* Round Animation */}
      <div className="battle-arena">
        {roundState.phase === 'intro' && (
          <div className="round-intro animated-fade-in">
            <h1>ROUND {currentRoundIndex + 1}</h1>
          </div>
        )}

        {(roundState.phase === 'cards' || roundState.phase === 'ability' ||
          roundState.phase === 'rolling' || roundState.phase === 'result') && (
          <div className="battle-field">
            <div className={`player-side ${roundState.phase === 'cards' ? 'slide-in-left' : ''}`}>
              <h3>{battle.player1Name}</h3>
              <div className="battle-card-container">
                {player1Card.imageUrl && (
                  <div className="card-battle-image">
                    <img src={player1Card.imageUrl} alt={player1Card.name} />
                  </div>
                )}
                <div className="card-name-display">{player1Card.fullName || player1Card.name}</div>
                <div className="card-stats-display">
                  <div className={`stat-item ${currentRound.ability === 'strength' ? 'active-stat' : ''}`}>
                    <span className="stat-icon">💪</span>
                    <span className="stat-label">STR</span>
                    <span className="stat-value">{player1Card.abilities.strength}</span>
                  </div>
                  <div className={`stat-item ${currentRound.ability === 'speed' ? 'active-stat' : ''}`}>
                    <span className="stat-icon">⚡</span>
                    <span className="stat-label">SPD</span>
                    <span className="stat-value">{player1Card.abilities.speed}</span>
                  </div>
                  <div className={`stat-item ${currentRound.ability === 'agility' ? 'active-stat' : ''}`}>
                    <span className="stat-icon">🎯</span>
                    <span className="stat-label">AGL</span>
                    <span className="stat-value">{player1Card.abilities.agility}</span>
                  </div>
                </div>
              </div>
              {(roundState.phase === 'rolling' || roundState.phase === 'result') && (
                <div className="dice-area">
                  <div className="stat-display-large">
                    <span className="stat-label-large">{currentRound.ability.toUpperCase()}</span>
                    <span className="stat-value-large">{currentRound.player1StatValue}</span>
                  </div>
                  <div className="dice-roll-area">
                    <DiceRoll
                      value={currentRound.player1Roll}
                      isRolling={roundState.player1DiceRolling}
                      size="large"
                      color="#3498db"
                    />
                  </div>
                  {!roundState.player1DiceRolling && roundState.phase === 'result' && (
                    <div className="total-score animated-pop-in">
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
              <h3>{battle.player2Name || 'AI Opponent'}</h3>
              <div className="battle-card-container">
                {player2Card.imageUrl && (
                  <div className="card-battle-image">
                    <img src={player2Card.imageUrl} alt={player2Card.name} />
                  </div>
                )}
                <div className="card-name-display">{player2Card.fullName || player2Card.name}</div>
                <div className="card-stats-display">
                  <div className={`stat-item ${currentRound.ability === 'strength' ? 'active-stat' : ''}`}>
                    <span className="stat-icon">💪</span>
                    <span className="stat-label">STR</span>
                    <span className="stat-value">{player2Card.abilities.strength}</span>
                  </div>
                  <div className={`stat-item ${currentRound.ability === 'speed' ? 'active-stat' : ''}`}>
                    <span className="stat-icon">⚡</span>
                    <span className="stat-label">SPD</span>
                    <span className="stat-value">{player2Card.abilities.speed}</span>
                  </div>
                  <div className={`stat-item ${currentRound.ability === 'agility' ? 'active-stat' : ''}`}>
                    <span className="stat-icon">🎯</span>
                    <span className="stat-label">AGL</span>
                    <span className="stat-value">{player2Card.abilities.agility}</span>
                  </div>
                </div>
              </div>
              {(roundState.phase === 'rolling' || roundState.phase === 'result') && (
                <div className="dice-area">
                  <div className="stat-display-large">
                    <span className="stat-label-large">{currentRound.ability.toUpperCase()}</span>
                    <span className="stat-value-large">{currentRound.player2StatValue}</span>
                  </div>
                  <div className="dice-roll-area">
                    <DiceRoll
                      value={currentRound.player2Roll}
                      isRolling={roundState.player2DiceRolling}
                      size="large"
                      color="#e74c3c"
                    />
                  </div>
                  {!roundState.player2DiceRolling && roundState.phase === 'result' && (
                    <div className="total-score animated-pop-in">
                      = {currentRound.player2Total}
                    </div>
                  )}
                </div>
              )}
            </div>
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
                `${battle.player1Name} WINS!` :
                `${battle.player2Name || 'AI Opponent'} WINS!`}
            </h2>
            {/* Announce winner */}
            {(() => {
              const winnerName = battle.winner === battle.player1Id ?
                (battle.player1Name || 'Player 1') :
                (battle.player2Name || 'AI Opponent');
              voiceService.speakBattleComplete(winnerName);
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