import React, { useState, useEffect } from 'react';
import { challengeAPI, cardAPI } from '../services/api';
import { Player, Card, Challenge as ChallengeType } from '../types';
import CardComponent from './Card';
import './Challenge.css';

interface ChallengeProps {
  player: Player;
  onBattleStart?: (battleId: string) => void;
  onUpdate?: () => void;
}

type ChallengeView =
  | 'list'
  | 'select-opponent'
  | 'select-cards'
  | 'incoming'
  | 'accept-cards'
  | 'view-battle';

const Challenge: React.FC<ChallengeProps> = ({ player, onBattleStart, onUpdate }) => {
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
      // Create the challenge
      const challenge = await challengeAPI.createChallenge(player.id, selectedOpponent.id);

      // Set up the cards and order
      await challengeAPI.setupChallenge(challenge.id, selectedCards, selectedOrder);

      // Return to challenge list
      setView('list');
      loadChallenges();

      if (onUpdate) onUpdate();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create challenge');
    } finally {
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
      if (onBattleStart && result.battle.id) {
        onBattleStart(result.battle.id);
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

    return (
      <div className="challenge-list">
        <div className="challenge-header">
          <h2>Challenges</h2>
          <button
            className="btn btn-primary"
            onClick={handleCreateChallenge}
            disabled={!player.deck || player.deck.length !== 10}
          >
            Challenge Player
          </button>
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
            {completedChallenges.slice(0, 5).map(challenge => (
              <div key={challenge.id} className="challenge-item completed">
                <span className="challenger-name">
                  {challenge.challengerId === player.id
                    ? `vs ${challenge.challengedName}`
                    : `vs ${challenge.challengerName}`}
                </span>
                {challenge.battleId && (
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => onBattleStart && onBattleStart(challenge.battleId!)}
                  >
                    View Battle
                  </button>
                )}
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

  return (
    <div className="challenge-container">
      {view === 'list' && renderChallengeList()}
      {view === 'select-opponent' && renderOpponentSelection()}
      {view === 'select-cards' && renderCardSelection()}
      {view === 'incoming' && renderIncomingChallenge()}
      {view === 'accept-cards' && renderDefenseSetup()}
    </div>
  );
};

export default Challenge;