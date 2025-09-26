import React, { useState, useEffect } from 'react';
import { challengeAPI, cardAPI, battleAPI } from '../services/api';
import { Player, Card, Challenge as ChallengeType, Battle } from '../types';
import CardComponent from './Card';
import BattleAnimation from './BattleAnimation';
import './Challenge.css';

interface ChallengeProps {
  player: Player;
  onUpdate?: () => void;
}

type ChallengeView =
  | 'list'
  | 'select-opponent'
  | 'select-cards'
  | 'incoming'
  | 'accept-cards'
  | 'view-battle'
  | 'battle-animation'
  | 'battle-results';

const Challenge: React.FC<ChallengeProps> = ({ player, onUpdate }) => {
  const [view, setView] = useState<ChallengeView>('list');
  const [availablePlayers, setAvailablePlayers] = useState<any[]>([]);
  const [myChallenges, setMyChallenges] = useState<ChallengeType[]>([]);
  const [selectedOpponent, setSelectedOpponent] = useState<any>(null);
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeType | null>(null);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<number[]>([]);
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentBattle, setCurrentBattle] = useState<Battle | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [completedBattle, setCompletedBattle] = useState<Battle | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [battleResults, setBattleResults] = useState<Map<string, Battle>>(new Map());

  // Load player's cards
  useEffect(() => {
    const loadCards = async () => {
      try {
        const cards = await cardAPI.getAllCards();
        const myCards = cards.filter(c => player.cards.includes(c.id));
        setPlayerCards(myCards);
      } catch (err) {
        console.error('Failed to load cards:', err);
      }
    };

    loadCards();
  }, [player]);

  // Load challenges
  const loadChallenges = async () => {
    try {
      const challenges = await challengeAPI.getPlayerChallenges(player.id);
      setMyChallenges(Array.isArray(challenges) ? challenges : []);
    } catch (err) {
      console.error('Failed to load challenges:', err);
      setMyChallenges([]);
    }
  };

  useEffect(() => {
    loadChallenges();
    const interval = setInterval(loadChallenges, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [player.id]);

  const loadAvailablePlayers = async () => {
    setLoading(true);
    try {
      const players = await challengeAPI.getAvailablePlayers();
      // Filter out current player
      setAvailablePlayers(players.filter(p => p.id !== player.id));
    } catch (err) {
      setError('Failed to load players');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChallenge = () => {
    setView('select-opponent');
    loadAvailablePlayers();
  };

  const handleChallengeAI = () => {
    // For AI challenges, go directly to card selection
    setSelectedOpponent({ id: 'ai', name: 'AI Opponent' });
    setView('select-cards');
    // Get 3 random cards from the deck for the challenge
    const deckCards = playerCards.filter(c => player.deck.includes(c.id));
    const shuffled = [...deckCards].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 3).map(c => c.id);
    setSelectedCards(selected);
    setSelectedOrder([]);
  };

  const handleSelectOpponent = (opponent: any) => {
    setSelectedOpponent(opponent);
    setView('select-cards');
    // Get 3 random cards from the deck for the challenge
    const deckCards = playerCards.filter(c => player.deck.includes(c.id));
    const shuffled = [...deckCards].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 3).map(c => c.id);
    setSelectedCards(selected);
    setSelectedOrder([]);
  };

  const handleCardSelect = (index: number) => {
    const newOrder = [...selectedOrder];
    const existingIndex = newOrder.indexOf(index);

    if (existingIndex !== -1) {
      // Remove if already selected
      newOrder.splice(existingIndex, 1);
    } else if (newOrder.length < 3) {
      // Add if not at limit
      newOrder.push(index);
    }

    setSelectedOrder(newOrder);
  };

  const handleSendChallenge = async () => {
    if (selectedOrder.length !== 3) {
      setError('Please select the order for all 3 cards');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (selectedOpponent.id === 'ai') {
        // For AI challenges, use special endpoint
        const challenge = await challengeAPI.createAIChallenge(player.id);

        // Set up the cards and order, which will automatically trigger the battle
        const result = await challengeAPI.setupChallenge(challenge.id, selectedCards, selectedOrder);

        // Navigate to battle view immediately
        if ('battle' in result && result.battle && result.battle.id) {
          await loadBattleAndAnimate(result.battle.id);
          // Don't set loading to false here - let the animation handle it
          return;
        } else {
          // If no battle returned, go back to list
          setView('list');
          loadChallenges();
        }
      } else {
        // Regular PvP challenge
        const challenge = await challengeAPI.createChallenge(player.id, selectedOpponent.id);

        // Set up the cards and order
        await challengeAPI.setupChallenge(challenge.id, selectedCards, selectedOrder);

        // Return to challenge list for PvP challenges
        setView('list');
        loadChallenges();
      }

      if (onUpdate) onUpdate();
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create challenge');
      setLoading(false);
    }
  };

  const handleViewIncoming = (challenge: ChallengeType) => {
    setSelectedChallenge(challenge);

    if (challenge.status === 'pending') {
      setView('incoming');
    } else if (challenge.status === 'accepted') {
      setView('accept-cards');
      // Get 3 random cards from the deck for defense
      const deckCards = playerCards.filter(c => player.deck.includes(c.id));
      const shuffled = [...deckCards].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, 3).map(c => c.id);
      setSelectedCards(selected);
      setSelectedOrder([]);
    }
  };

  const handleAcceptChallenge = async () => {
    if (!selectedChallenge) return;

    setLoading(true);
    try {
      await challengeAPI.acceptChallenge(selectedChallenge.id, player.id);
      setView('accept-cards');
      // Get 3 random cards from the deck for defense
      const deckCards = playerCards.filter(c => player.deck.includes(c.id));
      const shuffled = [...deckCards].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, 3).map(c => c.id);
      setSelectedCards(selected);
      setSelectedOrder([]);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to accept challenge');
    } finally {
      setLoading(false);
    }
  };

  const loadBattleAndAnimate = async (battleId: string) => {
    try {
      const battle = await battleAPI.getBattle(battleId);
      setCurrentBattle(battle);

      // If battle is completed, show animation
      if (battle.status === 'completed') {
        setCompletedBattle(battle);
        setShowAnimation(true);
        setView('battle-animation');
      }
    } catch (err) {
      console.error('Failed to load battle:', err);
    }
  };

  const loadBattleResults = async () => {
    const results = new Map<string, Battle>();

    for (const challenge of myChallenges.filter(c => c.status === 'completed' && c.battleId)) {
      try {
        const battle = await battleAPI.getBattle(challenge.battleId!);
        results.set(challenge.id, battle);
      } catch (err) {
        console.error('Failed to load battle result:', err);
      }
    }

    setBattleResults(results);
  };

  // Load battle results when toggled
  useEffect(() => {
    if (showResults && battleResults.size === 0) {
      loadBattleResults();
    }
  }, [showResults]);

  const handleAnimationComplete = () => {
    setShowAnimation(false);
    setLoading(false); // Reset loading state after animation
    if (completedBattle) {
      setView('battle-results');
      loadChallenges(); // Reload challenges to update status
    }
  };

  const handleViewBattle = (battleId: string) => {
    loadBattleAndAnimate(battleId);
  };

  const getAbilityIcon = (ability: string) => {
    switch (ability) {
      case 'strength': return '💪';
      case 'speed': return '⚡';
      case 'agility': return '🎯';
      default: return '❓';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString();
  };

  const handleDeclineChallenge = async () => {
    if (!selectedChallenge) return;

    setLoading(true);
    try {
      await challengeAPI.declineChallenge(selectedChallenge.id, player.id);
      setView('list');
      loadChallenges();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to decline challenge');
    } finally {
      setLoading(false);
    }
  };

  const handleSetupDefense = async () => {
    if (!selectedChallenge || selectedOrder.length !== 3) {
      setError('Please select the order for all 3 cards');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await challengeAPI.setupDefense(
        selectedChallenge.id,
        selectedCards,
        selectedOrder
      );

      // Navigate to battle view
      if (result.battle.id) {
        loadBattleAndAnimate(result.battle.id);
      }

      setView('list');
      loadChallenges();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to setup defense');
    } finally {
      setLoading(false);
    }
  };

  const renderChallengeList = () => {
    const pendingChallenges = myChallenges.filter(
      c => c.challengedId === player.id && c.status === 'pending'
    );
    const acceptedChallenges = myChallenges.filter(
      c => c.challengedId === player.id && c.status === 'accepted'
    );
    const sentChallenges = myChallenges.filter(
      c => c.challengerId === player.id && (c.status === 'pending' || c.status === 'accepted')
    );
    const completedChallenges = myChallenges.filter(
      c => c.status === 'completed'
    );
    const declinedChallenges = myChallenges.filter(
      c => c.status === 'declined'
    );

    return (
      <div className="challenge-list">
        <div className="challenge-header">
          <h2>Battle Arena</h2>
          <div className="challenge-controls">
            <div className="challenge-buttons">
            <button
              className="btn btn-primary"
              onClick={handleCreateChallenge}
              disabled={!player.deck || player.deck.length !== 10}
            >
              Challenge Player
            </button>
            <button
              className="btn btn-ai"
              onClick={handleChallengeAI}
              disabled={!player.deck || player.deck.length !== 10}
            >
              Challenge AI Opponent
            </button>
            </div>
            <div className="challenge-toggle">
              <label className="toggle-switch">
                <span className="toggle-label">Show results</span>
                <input
                  type="checkbox"
                  checked={showResults}
                  onChange={(e) => setShowResults(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        {(!player.deck || player.deck.length !== 10) && (
          <div className="warning-message">
            You need a deck of exactly 10 cards to challenge other players
          </div>
        )}

        {pendingChallenges.length > 0 && (
          <div className="challenge-section">
            <h3>📨 Incoming Challenges</h3>
            {pendingChallenges.map(challenge => (
              <div key={challenge.id} className="challenge-item incoming">
                <span className="challenger-name">{challenge.challengerName}</span>
                <span className="challenge-status">wants to battle!</span>
                <button
                  className="btn btn-sm btn-accept"
                  onClick={() => handleViewIncoming(challenge)}
                >
                  View
                </button>
              </div>
            ))}
          </div>
        )}

        {acceptedChallenges.length > 0 && (
          <div className="challenge-section">
            <h3>⚔️ Ready to Battle</h3>
            {acceptedChallenges.map(challenge => (
              <div key={challenge.id} className="challenge-item accepted">
                <span className="challenger-name">{challenge.challengerName}</span>
                <span className="challenge-status">waiting for your cards</span>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => handleViewIncoming(challenge)}
                >
                  Select Cards
                </button>
              </div>
            ))}
          </div>
        )}

        {sentChallenges.length > 0 && (
          <div className="challenge-section">
            <h3>📤 Sent Challenges</h3>
            {sentChallenges.map(challenge => (
              <div key={challenge.id} className="challenge-item sent">
                <span className="challenger-name">{challenge.challengedName}</span>
                <span className="challenge-status">
                  {challenge.status === 'pending' ? 'waiting for response' : 'accepted - awaiting battle'}
                </span>
              </div>
            ))}
          </div>
        )}

        {completedChallenges.length > 0 && (
          <div className="challenge-section">
            <h3>🏆 Completed Battles</h3>
            {completedChallenges.slice(0, 10).map(challenge => {
              const battle = battleResults.get(challenge.id);
              const isWinner = battle && battle.winner === player.id;

              return (
                <div key={challenge.id} className="challenge-item completed">
                  <span className="challenge-date">{formatDate(challenge.createdAt)}</span>
                  <span className="challenger-name">
                    {challenge.challengerId === player.id
                      ? `vs ${challenge.challengedName}`
                      : `vs ${challenge.challengerName}`}
                  </span>
                  {showResults && battle && (
                    <span className={`battle-result ${isWinner ? 'victory' : 'defeat'}`}>
                      {isWinner ? '✅ Victory' : '❌ Defeat'}
                      {' '}{battle.player1Points}-{battle.player2Points}
                    </span>
                  )}
                  {challenge.battleId && (
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleViewBattle(challenge.battleId!)}
                    >
                      View Battle
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {declinedChallenges.length > 0 && (
          <div className="challenge-section">
            <h3>❌ Declined Battles</h3>
            {declinedChallenges.map(challenge => (
              <div key={challenge.id} className="challenge-item declined">
                <span className="challenge-date">{formatDate(challenge.createdAt)}</span>
                <span className="challenger-name">
                  {challenge.challengerId === player.id
                    ? `Challenge to ${challenge.challengedName} was declined`
                    : `Declined challenge from ${challenge.challengerName}`}
                </span>
                <span className="challenge-status">Declined</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderOpponentSelection = () => (
    <div className="opponent-selection">
      <div className="selection-header">
        <button className="btn btn-back" onClick={() => setView('list')}>
          ← Back
        </button>
        <h2>Select Opponent</h2>
      </div>

      {loading ? (
        <div className="loading">Loading players...</div>
      ) : (
        <div className="player-grid">
          {availablePlayers.map(p => (
            <div
              key={p.id}
              className="player-card"
              onClick={() => handleSelectOpponent(p)}
            >
              <h3>{p.name}</h3>
              <div className="player-stats">
                <div className="stat">
                  <span className="label">Rating:</span>
                  <span className="value">{p.rating}</span>
                </div>
                <div className="stat">
                  <span className="label">W/L:</span>
                  <span className="value">{p.wins}/{p.losses}</span>
                </div>
                {p.lastActive && (
                  <div className="stat">
                    <span className="label">Last seen:</span>
                    <span className="value">
                      {new Date(p.lastActive).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderCardSelection = () => {
    const battleCards = selectedCards.map(id => playerCards.find(c => c.id === id)!).filter(Boolean);

    return (
      <div className="card-selection">
        <div className="selection-header">
          <button className="btn btn-back" onClick={() => setView('select-opponent')}>
            ← Back
          </button>
          <h2>Select order vs {selectedOpponent?.name}</h2>
        </div>

        {error && <div className="error-message">{error}</div>}

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
          className="submit-order-btn"
          onClick={handleSendChallenge}
          disabled={selectedOrder.length !== 3 || loading}
        >
          {loading ? 'Sending...' : 'Send Challenge'}
        </button>
      </div>
    );
  };

  const renderIncomingChallenge = () => (
    <div className="incoming-challenge">
      <div className="selection-header">
        <button className="btn btn-back" onClick={() => setView('list')}>
          ← Back
        </button>
        <h2>Challenge from {selectedChallenge?.challengerName}</h2>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="challenge-details">
        <p>{selectedChallenge?.challengerName} has challenged you to a battle!</p>
        <p>Do you accept?</p>

        <div className="action-buttons">
          <button
            className="btn btn-accept"
            onClick={handleAcceptChallenge}
            disabled={loading || !player.deck || player.deck.length !== 10}
          >
            {loading ? 'Accepting...' : 'Accept Challenge'}
          </button>
          <button
            className="btn btn-decline"
            onClick={handleDeclineChallenge}
            disabled={loading}
          >
            {loading ? 'Declining...' : 'Decline'}
          </button>
        </div>

        {(!player.deck || player.deck.length !== 10) && (
          <div className="warning-message">
            You need a deck of exactly 10 cards to accept challenges
          </div>
        )}
      </div>
    </div>
  );

  const renderDefenseSetup = () => {
    const battleCards = selectedCards.map(id => playerCards.find(c => c.id === id)!).filter(Boolean);

    return (
      <div className="defense-setup">
        <div className="selection-header">
          <button className="btn btn-back" onClick={() => setView('list')}>
            ← Back
          </button>
          <h2>Select order vs {selectedChallenge?.challengerName}</h2>
        </div>

        {error && <div className="error-message">{error}</div>}

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
          className="submit-order-btn"
          onClick={handleSetupDefense}
          disabled={selectedOrder.length !== 3 || loading}
        >
          {loading ? 'Starting Battle...' : 'Start Battle'}
        </button>
      </div>
    );
  };

  const renderBattleAnimation = () => {
    if (!completedBattle || !showAnimation) return null;

    return (
      <BattleAnimation
        battle={completedBattle}
        playerCards={playerCards}
        onComplete={handleAnimationComplete}
      />
    );
  };

  const renderBattleResults = () => {
    if (!completedBattle || completedBattle.status !== 'completed') return null;

    const isWinner = completedBattle.winner === player.id;

    return (
      <div className="battle-results">
        <div className="results-header">
          <button className="btn btn-back" onClick={() => {
            setView('list');
            setCurrentBattle(null);
            setCompletedBattle(null);
          }}>
            ← Back to Challenges
          </button>
        </div>

        <h2 className={`result-title ${isWinner ? 'winner' : 'loser'}`}>
          {isWinner ? '🎉 VICTORY! 🎉' : '😔 DEFEAT 😔'}
        </h2>

        <div className="final-score">
          <div className="score-display">
            <span className="player-name">{player.name}</span>
            <span className="points">{completedBattle.player1Points}</span>
          </div>
          <span className="vs">VS</span>
          <div className="score-display">
            <span className="player-name">{completedBattle.player2Name || 'AI Opponent'}</span>
            <span className="points">{completedBattle.player2Points}</span>
          </div>
        </div>

        {completedBattle.winReason && (
          <p className="win-reason">
            Won by: {completedBattle.winReason === 'coin-toss' ? 'Coin Toss' :
                     completedBattle.winReason === 'damage' ? 'Total Damage' : 'Points'}
          </p>
        )}

        <div className="rounds-summary">
          <h3>Battle Summary</h3>
          {completedBattle.rounds.map((round, index) => (
            <div key={index} className={`round-summary ${round.winner === 'player1' ? 'won' : round.winner === 'player2' ? 'lost' : 'draw'}`}>
              <div className="round-header">
                Round {round.roundNumber} - {getAbilityIcon(round.ability)} {round.ability.toUpperCase()}
              </div>
              <div className="round-details">
                <div className="player-result">
                  <span className="card-name">{round.player1CardName}</span>
                  {round.player1CriticalHit && <span className="critical">💥 CRITICAL!</span>}
                  <span className="total">
                    {round.player1StatValue} + {round.player1Roll} = {round.player1Total}
                  </span>
                </div>
                <div className="damage">
                  {round.damageDealt > 0 && <span className="damage-amount">⚔️ {round.damageDealt} damage</span>}
                  {round.winner === 'draw' && <span className="draw">DRAW</span>}
                </div>
                <div className="player-result">
                  <span className="card-name">{round.player2CardName}</span>
                  {round.player2CriticalHit && <span className="critical">💥 CRITICAL!</span>}
                  <span className="total">
                    {round.player2StatValue} + {round.player2Roll} = {round.player2Total}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {isWinner && completedBattle.isSimulation && (
          <p className="rewards">💰 You earned 30 coins!</p>
        )}
        {isWinner && !completedBattle.isSimulation && (
          <p className="rewards">💰 You earned 50 coins!</p>
        )}
      </div>
    );
  };

  return (
    <div className="challenge-container">
      {view === 'list' && renderChallengeList()}
      {view === 'select-opponent' && renderOpponentSelection()}
      {view === 'select-cards' && renderCardSelection()}
      {view === 'incoming' && renderIncomingChallenge()}
      {view === 'accept-cards' && renderDefenseSetup()}
      {view === 'battle-animation' && renderBattleAnimation()}
      {view === 'battle-results' && renderBattleResults()}
    </div>
  );
};

export default Challenge;