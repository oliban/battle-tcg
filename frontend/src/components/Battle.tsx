import React, { useState, useEffect } from 'react';
import { Battle as BattleType, Card, Player } from '../types';
import { battleAPI } from '../services/api';
import CardComponent from './Card';
import BattleAnimation from './BattleAnimation';
import './Battle.css';

interface BattleProps {
  player: Player;
  playerCards: Card[];
  specificBattleId?: string | null;
  onBattleComplete?: () => void;
}

const Battle: React.FC<BattleProps> = ({ player, playerCards, specificBattleId, onBattleComplete }) => {
  const [currentBattle, setCurrentBattle] = useState<BattleType | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<number[]>([]);
  const [battleCards, setBattleCards] = useState<Card[]>([]);
  const [opponentCards, setOpponentCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [battleHistory, setBattleHistory] = useState<BattleType[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'ai' | 'pvp'>('all');
  const [showAnimation, setShowAnimation] = useState(false);
  const [completedBattle, setCompletedBattle] = useState<BattleType | null>(null);

  useEffect(() => {
    loadBattleHistory();
  }, [player.id]);

  useEffect(() => {
    if (specificBattleId) {
      // Reset any existing battle state before loading specific battle
      setCurrentBattle(null);
      setCompletedBattle(null);
      setShowAnimation(false);
      loadSpecificBattle(specificBattleId);
    }
  }, [specificBattleId]);

  const loadSpecificBattle = async (battleId: string) => {
    try {
      const battle = await battleAPI.getBattle(battleId);

      // Load card details for both players
      if (battle.player1CardDetails) {
        setBattleCards(battle.player1CardDetails);
      }
      if (battle.player2CardDetails) {
        setOpponentCards(battle.player2CardDetails);
      }

      // If battle is completed, show animation first
      if (battle.status === 'completed') {
        setCompletedBattle(battle);
        setShowAnimation(true);
        // Don't set currentBattle yet - let animation complete handler do it
      } else {
        setCurrentBattle(battle);
      }
    } catch (err) {
      console.error('Failed to load specific battle:', err);
    }
  };

  const loadBattleHistory = async () => {
    try {
      const battles = await battleAPI.getPlayerBattles(player.id);
      setBattleHistory(battles);
    } catch (err) {
      console.error('Failed to load battle history:', err);
    }
  };

  const startSimulationBattle = async () => {
    if (!player.deck || player.deck.length !== 10) {
      setError('You need a deck of exactly 10 cards to battle!');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const battle = await battleAPI.createBattle(player.id, undefined, true);
      setCurrentBattle(battle);

      // Use the card details directly from the battle response
      if (battle.player1CardDetails) {
        setBattleCards(battle.player1CardDetails);
      }

      // For simulation, opponent cards will be loaded from the battle details
      if (battle.player2CardDetails) {
        setOpponentCards(battle.player2CardDetails);
      }

      // Reset order selection
      setSelectedOrder([]);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start battle');
    } finally {
      setLoading(false);
    }
  };

  const handleCardSelect = (index: number) => {
    if (!currentBattle || currentBattle.status !== 'waiting-for-order') return;

    const newOrder = [...selectedOrder];
    const existingIndex = newOrder.indexOf(index);

    if (existingIndex !== -1) {
      // Remove from order
      newOrder.splice(existingIndex, 1);
    } else if (newOrder.length < 3) {
      // Add to order
      newOrder.push(index);
    }

    setSelectedOrder(newOrder);
  };

  const submitCardOrder = async () => {
    if (!currentBattle || selectedOrder.length !== 3) {
      setError('Please select the order for all 3 cards');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const updatedBattle = await battleAPI.setCardOrder(
        currentBattle.id,
        player.id,
        selectedOrder
      );

      // If battle is ready (AI has set order), execute immediately
      if (updatedBattle.status === 'ready') {
        setCurrentBattle(updatedBattle);
        // Execute battle immediately
        await executeBattle();
      } else {
        setCurrentBattle(updatedBattle);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to set card order');
    } finally {
      setLoading(false);
    }
  };

  const executeBattle = async () => {
    if (!currentBattle) return;

    setLoading(true);
    setError('');

    try {
      const completedBattle = await battleAPI.executeBattle(currentBattle.id);
      setCompletedBattle(completedBattle);
      setShowAnimation(true);
      setCurrentBattle(null); // Clear current battle state
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to execute battle');
    } finally {
      setLoading(false);
    }
  };

  const handleAnimationComplete = () => {
    setShowAnimation(false);
    if (completedBattle) {
      setCurrentBattle(completedBattle);
      loadBattleHistory(); // Reload history to include this battle
      // Clear the specific battle ID so it doesn't replay
      if (specificBattleId && onBattleComplete) {
        onBattleComplete();
      }
    }
  };

  const resetBattle = () => {
    setCurrentBattle(null);
    setCompletedBattle(null);
    setSelectedOrder([]);
    setBattleCards([]);
    setOpponentCards([]);
    setError('');
    setShowAnimation(false);
    if (onBattleComplete) {
      onBattleComplete();
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

  const renderBattleResults = () => {
    if (!currentBattle || currentBattle.status !== 'completed') return null;

    const isWinner = currentBattle.winner === player.id;

    return (
      <div className="battle-results">
        <h2 className={`result-title ${isWinner ? 'winner' : 'loser'}`}>
          {isWinner ? '🎉 VICTORY! 🎉' : '😔 DEFEAT 😔'}
        </h2>

        <div className="final-score">
          <div className="score-display">
            <span className="player-name">{player.name}</span>
            <span className="points">{currentBattle.player1Points}</span>
          </div>
          <span className="vs">VS</span>
          <div className="score-display">
            <span className="player-name">{currentBattle.player2Name || 'AI Opponent'}</span>
            <span className="points">{currentBattle.player2Points}</span>
          </div>
        </div>

        {currentBattle.winReason && (
          <p className="win-reason">
            Won by: {currentBattle.winReason === 'coin-toss' ? 'Coin Toss' :
                     currentBattle.winReason === 'damage' ? 'Total Damage' : 'Points'}
          </p>
        )}

        <div className="rounds-summary">
          <h3>Battle Summary</h3>
          {currentBattle.rounds.map((round, index) => (
            <div key={index} className={`round-summary ${round.winner === 'player1' ? 'won' : round.winner === 'player2' ? 'lost' : 'draw'}`}>
              <div className="round-header">
                Round {round.roundNumber} - {getAbilityIcon(round.ability)} {round.ability.toUpperCase()}
              </div>
              <div className="round-details">
                <div className="player-result">
                  <span className="card-name">{round.player1CardName}</span>
                  <span className="calculation">
                    {round.player1StatValue} + 🎲{round.player1Roll} = {round.player1Total}
                    {(() => {
                      // Check if this card had modifiers for this ability
                      const card = battleCards.find(c =>
                        c.id === round.player1CardId ||
                        c.id.split('_')[0] === round.player1CardId?.split('_')[0]
                      );
                      const modifier = card?.titleModifiers?.[round.ability as keyof typeof card.titleModifiers];
                      if (modifier && modifier !== 0) {
                        return (
                          <span style={{ color: '#4CAF50', fontSize: '0.8em', marginLeft: '4px' }}>
                            (incl. {modifier > 0 ? '+' : ''}{modifier})
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </span>
                </div>
                <div className="round-outcome">
                  {round.winner === 'player1' ? '✓' : round.winner === 'player2' ? '✗' : '='}
                </div>
                <div className="player-result">
                  <span className="card-name">{round.player2CardName}</span>
                  <span className="calculation">
                    {round.player2StatValue} + 🎲{round.player2Roll} = {round.player2Total}
                    {(() => {
                      // Check if this card had modifiers for this ability
                      const card = opponentCards.find(c =>
                        c.id === round.player2CardId ||
                        c.id.split('_')[0] === round.player2CardId?.split('_')[0]
                      );
                      const modifier = card?.titleModifiers?.[round.ability as keyof typeof card.titleModifiers];
                      if (modifier && modifier !== 0) {
                        return (
                          <span style={{ color: '#4CAF50', fontSize: '0.8em', marginLeft: '4px' }}>
                            (incl. {modifier > 0 ? '+' : ''}{modifier})
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </span>
                </div>
              </div>
              {round.damageDealt > 0 && (
                <div className="damage-dealt">
                  Damage: {round.damageDealt}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="rewards">
          {isWinner && currentBattle.isSimulation && <p>+30 coins earned!</p>}
          {isWinner && !currentBattle.isSimulation && <p>+50 coins earned!</p>}
        </div>

        <button onClick={resetBattle} className="new-battle-btn">
          Start New Battle
        </button>
      </div>
    );
  };

  const renderCardSelection = () => {
    if (!currentBattle || currentBattle.status !== 'waiting-for-order') return null;

    return (
      <div className="card-selection">
        <h3>Select the order to play your cards (click cards in order)</h3>
        <div className="battle-cards">
          {battleCards.map((card, index) => {
            const orderPosition = selectedOrder.indexOf(index);
            return (
              <div
                key={card.id}
                className={`battle-card-wrapper ${orderPosition !== -1 ? 'selected' : ''}`}
                onClick={() => handleCardSelect(index)}
              >
                {orderPosition !== -1 && (
                  <div className="order-badge">{orderPosition + 1}</div>
                )}
                <CardComponent card={card} onClick={() => {}} />
              </div>
            );
          })}
        </div>

        <div className="order-display">
          <p>Play Order: {selectedOrder.length === 3 ?
            selectedOrder.map((idx, pos) => `${pos + 1}. ${battleCards[idx]?.name}`).join(', ') :
            'Select all 3 cards'
          }</p>
        </div>

        <button
          onClick={submitCardOrder}
          disabled={selectedOrder.length !== 3 || loading}
          className="submit-order-btn"
        >
          Start Battle
        </button>
      </div>
    );
  };

  return (
    <>
      {showAnimation && completedBattle && (
        <BattleAnimation
          battle={completedBattle}
          playerCards={playerCards}
          onComplete={handleAnimationComplete}
        />
      )}

      <div className="battle-container">
        {!currentBattle ? (
        <div className="battle-menu">
          <h2>Battle Arena</h2>

          {(!player.deck || player.deck.length < 10) ? (
            <div className="no-deck-warning">
              <p>⚠️ You need a deck of exactly 10 cards to battle!</p>
              <p>Current deck: {player.deck?.length || 0}/10 cards</p>
            </div>
          ) : (
            <>
              <div className="battle-options">
                <div className="battle-mode">
                  <h3>Simulation Battle</h3>
                  <p>Fight against AI opponents with random decks</p>
                  <p className="reward">Reward: 30 coins</p>
                  <button
                    onClick={startSimulationBattle}
                    disabled={loading}
                    className="start-battle-btn"
                  >
                    Start Simulation
                  </button>
                </div>

                <div className="battle-mode disabled">
                  <h3>PvP Battle</h3>
                  <p>Challenge other players</p>
                  <p className="reward">Reward: 50 coins</p>
                  <button disabled className="start-battle-btn">
                    Coming Soon
                  </button>
                </div>
              </div>

              <div className="battle-stats">
                <h3>Your Record</h3>
                <div className="stats-display">
                  <span className="wins">Wins: {player.wins}</span>
                  <span className="losses">Losses: {player.losses}</span>
                  <span className="winrate">
                    Win Rate: {player.wins + player.losses > 0 ?
                      Math.round((player.wins / (player.wins + player.losses)) * 100) : 0}%
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowHistory(!showHistory)}
                className="history-toggle"
              >
                {showHistory ? 'Hide' : 'Show'} Battle History
              </button>

              {showHistory && (
                <div className="battle-history">
                  <h3>Recent Battles</h3>
                  <div className="history-filter">
                    <button
                      className={historyFilter === 'all' ? 'active' : ''}
                      onClick={() => setHistoryFilter('all')}
                    >
                      All
                    </button>
                    <button
                      className={historyFilter === 'ai' ? 'active' : ''}
                      onClick={() => setHistoryFilter('ai')}
                    >
                      AI Battles
                    </button>
                    <button
                      className={historyFilter === 'pvp' ? 'active' : ''}
                      onClick={() => setHistoryFilter('pvp')}
                    >
                      PvP Battles
                    </button>
                  </div>
                  {battleHistory.length === 0 ? (
                    <p>No battles yet</p>
                  ) : (
                    <div className="history-list">
                      {battleHistory
                        .filter(battle => {
                          if (historyFilter === 'ai') return battle.isSimulation;
                          if (historyFilter === 'pvp') return !battle.isSimulation;
                          return true;
                        })
                        .slice(0, 10)
                        .map(battle => (
                        <div
                          key={battle.id}
                          className={`history-item ${battle.winner === player.id ? 'won' : 'lost'}`}
                        >
                          <span className="history-result">
                            {battle.winner === player.id ? 'WIN' : 'LOSS'}
                          </span>
                          <span className="history-opponent">
                            vs {battle.isSimulation ? 'AI Opponent' : (battle.player1Id === player.id ? battle.player2Name : battle.player1Name) || 'Unknown'}
                          </span>
                          <span className="history-score">
                            {battle.player1Id === player.id
                              ? `${battle.player1Points} - ${battle.player2Points}`
                              : `${battle.player2Points} - ${battle.player1Points}`
                            }
                          </span>
                          <span className="history-type">
                            {battle.isSimulation ? '🤖' : '⚔️'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <>
          {currentBattle.status === 'waiting-for-order' && renderCardSelection()}
          {currentBattle.status === 'completed' && renderBattleResults()}
        </>
      )}

      {error && <div className="error-message">{error}</div>}
    </div>
    </>
  );
};

export default Battle;