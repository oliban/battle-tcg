import React, { useState, useEffect } from 'react';
import { challengeAPI, cardAPI, battleAPI } from '../services/api';
import { toolsAPI, PlayerTool } from '../api/tools';
import { Player, Card, Challenge as ChallengeType, Battle } from '../types';
import CardComponent from './Card';
import BattleAnimation from './BattleAnimation';
import './Challenge.css';
import './PlayerName.css';

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
  const [currentChallenge, setCurrentChallenge] = useState<ChallengeType | null>(null);
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
  const [playerTools, setPlayerTools] = useState<PlayerTool[]>([]);
  const [appliedTools, setAppliedTools] = useState<Map<number, string>>(new Map()); // cardIndex -> toolId
  const [draggedTool, setDraggedTool] = useState<string | null>(null);
  const [dragOverCard, setDragOverCard] = useState<number | null>(null);
  const [revealedCards, setRevealedCards] = useState<Card[]>([]);
  const [binocularsUsed, setBinocularsUsed] = useState(false);

  // Function to load player tools (can be called to refresh)
  const loadTools = async () => {
    try {
      console.log('[Challenge] Loading tools for player:', player.id, player.name);
      const tools = await toolsAPI.getPlayerTools(player.id);
      console.log('[Challenge] Tools loaded:', tools);
      setPlayerTools(tools);
    } catch (err) {
      console.error('Failed to load tools:', err);
    }
  };

  // Load player's cards and tools
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
    loadTools();
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
    // Clear any previous tool assignments
    setAppliedTools(new Map());
    setView('select-opponent');
    loadAvailablePlayers();
  };

  const handleChallengeAI = async () => {
    setSelectedOpponent({ id: 'ai', name: 'AI Opponent' });
    setLoading(true);
    // Clear any previous tool assignments
    setAppliedTools(new Map());

    try {
      // Create the AI challenge immediately to get the firstRoundAbility
      const challenge = await challengeAPI.createAIChallenge(player.id);
      setCurrentChallenge(challenge);

      // Reload tools to get fresh cooldown data
      await loadTools();

      // Get 3 random cards from the deck for the challenge
      const deckCards = playerCards.filter(c => player.deck.includes(c.id));
      const shuffled = [...deckCards].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, 3).map(c => c.id);
      setSelectedCards(selected);
      setSelectedOrder([]);

      setView('select-cards');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create AI challenge');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOpponent = async (opponent: any) => {
    setSelectedOpponent(opponent);
    setLoading(true);
    // Clear any previous tool assignments
    setAppliedTools(new Map());

    try {
      // Create the challenge immediately to get the firstRoundAbility
      const challenge = await challengeAPI.createChallenge(player.id, opponent.id);
      setCurrentChallenge(challenge);

      // Reload tools to get fresh cooldown data
      await loadTools();

      // Get 3 random cards from the deck for the challenge
      const deckCards = playerCards.filter(c => player.deck.includes(c.id));
      const shuffled = [...deckCards].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, 3).map(c => c.id);
      setSelectedCards(selected);
      setSelectedOrder([]);

      setView('select-cards');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create challenge');
    } finally {
      setLoading(false);
    }
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
        // For AI challenges, use the pre-created challenge
        if (!currentChallenge) {
          setError('No challenge found');
          return;
        }

        // Convert applied tools Map to object format for API
        const toolsObj: { [key: number]: string } = {};
        appliedTools.forEach((toolId, position) => {
          toolsObj[position] = toolId;
        });

        // Set up the cards and order, which will automatically trigger the battle
        const result = await challengeAPI.setupChallenge(currentChallenge.id, selectedCards, selectedOrder, toolsObj);

        // Refresh player tools to reflect cooldowns
        await loadTools();

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
        // Regular PvP challenge - use the pre-created challenge
        if (!currentChallenge) {
          setError('No challenge found');
          return;
        }

        // Convert applied tools Map to object format for API
        const toolsObj: { [key: number]: string } = {};
        appliedTools.forEach((toolId, position) => {
          toolsObj[position] = toolId;
        });

        // Set up the cards and order
        await challengeAPI.setupChallenge(currentChallenge.id, selectedCards, selectedOrder, toolsObj);

        // Refresh player tools to reflect cooldowns
        await loadTools();

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
      // Reload tools to get fresh cooldown data
      await loadTools();
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

  const handleUseBinoculars = async () => {
    if (!selectedChallenge || binocularsUsed) return;

    setLoading(true);
    setError('');

    try {
      const response = await challengeAPI.useBinoculars(selectedChallenge.id, player.id);
      const cardIds = response.revealedCards || [];

      // Fetch full card details
      const cards = await Promise.all(
        cardIds.map(async (id: string) => {
          try {
            return await cardAPI.getCard(id);
          } catch (err) {
            console.error(`Failed to fetch card ${id}:`, err);
            return null;
          }
        })
      );

      setRevealedCards(cards.filter((c): c is Card => c !== null));
      setBinocularsUsed(true);
      await loadTools(); // Refresh to show cooldown
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to use binoculars');
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
      // Convert applied tools Map to object format for API
      const toolsObj: { [key: number]: string } = {};
      appliedTools.forEach((toolId, position) => {
        toolsObj[position] = toolId;
      });

      const result = await challengeAPI.setupDefense(
        selectedChallenge.id,
        selectedCards,
        selectedOrder,
        toolsObj
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
                <span className="player-name-display medium">{challenge.challengerName}</span>
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
                <span className="player-name-display medium">{challenge.challengerName}</span>
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
                <span className="player-name-display medium">{challenge.challengedName}</span>
                <span className="challenge-status">
                  {challenge.status === 'pending' ? 'waiting for response' : 'accepted - awaiting battle'}
                </span>
              </div>
            ))}
          </div>
        )}

        {completedChallenges.length > 0 && (
          <div className="challenge-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ marginBottom: '0' }}>🏆 Completed Battles</h3>
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
            {completedChallenges.slice(0, 10).map(challenge => {
              const battle = battleResults.get(challenge.id);
              const isWinner = battle && battle.winner === player.id;

              return (
                <div key={challenge.id} className="challenge-item completed">
                  <span className="challenge-date">{formatDate(challenge.createdAt)}</span>
                  <span className="challenger-name">
                    vs <span className="player-name-display small">
                      {challenge.challengerId === player.id
                        ? challenge.challengedName
                        : challenge.challengerName}
                    </span>
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
                    ? <>Challenge to <span className="player-name-display small">{challenge.challengedName}</span> was declined</>
                    : <>Declined challenge from <span className="player-name-display small">{challenge.challengerName}</span></>
                  }
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
              <h3 className="player-name-display medium">{p.name}</h3>
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

  const handleToolDragStart = (toolId: string) => {
    setDraggedTool(toolId);
  };

  const handleToolDragEnd = () => {
    setDraggedTool(null);
    setDragOverCard(null);
  };

  const handleCardDrop = (e: React.DragEvent, cardIndex: number) => {
    e.preventDefault();
    if (draggedTool) {
      const newAppliedTools = new Map(appliedTools);

      // Check if this card already has a tool (to make it available again)
      const existingTool = newAppliedTools.get(cardIndex);

      // Remove the dragged tool from any other card it was applied to
      newAppliedTools.forEach((tool, idx) => {
        if (tool === draggedTool) {
          newAppliedTools.delete(idx);
        }
      });

      // Apply the new tool to this card
      newAppliedTools.set(cardIndex, draggedTool);

      setAppliedTools(newAppliedTools);
      setDraggedTool(null);
      setDragOverCard(null);
    }
  };

  const handleCardDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleCardDragEnter = (cardIndex: number) => {
    if (draggedTool) {
      setDragOverCard(cardIndex);
    }
  };

  const handleCardDragLeave = () => {
    setDragOverCard(null);
  };

  const getToolEffect = (toolId: string) => {
    const tool = playerTools.find(pt => pt.toolId === toolId);
    if (!tool?.tool) return '';

    switch (tool.tool.effectAbility) {
      case 'strength': return '+2 STR';
      case 'speed': return '+2 SPD';
      case 'agility': return '+2 AGI';
      case 'any': return '+2 ANY';
      default: return '';
    }
  };

  const renderCardSelection = () => {
    const battleCards = selectedCards.map(id => playerCards.find(c => c.id === id)!).filter(Boolean);
    // Filter tools: challenger can't use defender-only tools
    const availableTools = playerTools.filter(pt => {
      if (pt.cooldownRemaining > 0) return false;
      if (!pt.tool) return false;
      return pt.tool.restriction !== 'challengee';
    });

    return (
      <div className="card-selection">
        <div className="selection-header">
          <button className="btn btn-back" onClick={() => setView('select-opponent')}>
            ← Back
          </button>
          <h2>Select order vs <span className="player-name-display large">{selectedOpponent?.name}</span></h2>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* First Round Ability Display */}
        <div className="first-round-info">
          <h4>First Round Ability: <span className="ability-highlight">{getAbilityIcon(currentChallenge?.firstRoundAbility || '')} {currentChallenge?.firstRoundAbility?.toUpperCase()}</span></h4>
          <p>The first round will be fought using the {currentChallenge?.firstRoundAbility} ability!</p>
        </div>

        {/* Tools Section */}
        <div className="tools-section">
          <h3>Available Tools (Drag to apply)</h3>
          <div className="tools-container">
            {availableTools.map(pt => (
              <div
                key={pt.toolId}
                className="tool-item"
                draggable
                onDragStart={() => handleToolDragStart(pt.toolId)}
                onDragEnd={handleToolDragEnd}
                style={{
                  opacity: Array.from(appliedTools.values()).includes(pt.toolId) ? 0.5 : 1,
                  cursor: 'grab'
                }}
              >
                {pt.tool?.imageUrl && (
                  <img
                    src={pt.tool.imageUrl}
                    alt={pt.tool.name}
                    className="tool-image"
                  />
                )}
                <div className="tool-info">
                  <div className="tool-name">{pt.tool?.name}</div>
                  <div className="tool-effect">{getToolEffect(pt.toolId)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <h3 className="card-selection-info">Select the order to play your cards (click cards in order)</h3>
        <div className="battle-cards">
          {battleCards.map((card, index) => {
            const orderPosition = selectedOrder.indexOf(index);
            const appliedTool = appliedTools.get(index);
            return (
              <div
                key={card.id}
                className={`battle-card-wrapper ${orderPosition !== -1 ? 'selected' : ''} ${dragOverCard === index ? 'can-drop' : ''}`}
                onClick={() => handleCardSelect(index)}
                onDrop={(e) => handleCardDrop(e, index)}
                onDragOver={handleCardDragOver}
                onDragEnter={() => handleCardDragEnter(index)}
                onDragLeave={handleCardDragLeave}
              >
                {orderPosition !== -1 && (
                  <div className="order-badge">{orderPosition + 1}</div>
                )}
                {appliedTool && (
                  <div className="applied-tools">
                    <div className="tool-badge">
                      {(() => {
                        const tool = availableTools.find((pt: PlayerTool) => pt.toolId === appliedTool)?.tool;
                        if (tool?.imageUrl) {
                          return (
                            <img
                              src={tool.imageUrl}
                              alt={tool.name}
                              className="tool-badge-image"
                              title={getToolEffect(appliedTool)}
                            />
                          );
                        }
                        return <span className="tool-effect">{getToolEffect(appliedTool)}</span>;
                      })()}
                    </div>
                  </div>
                )}
                <CardComponent card={card} onClick={() => {}} />
              </div>
            );
          })}
        </div>

        <div className="order-display">
          {selectedOrder.length === 3 ? (
            <>
              <p className="order-title">Play Order:</p>
              {selectedOrder.map((idx, pos) => (
                <p key={pos} className="order-item">{pos + 1}. {battleCards[idx]?.name}</p>
              ))}
            </>
          ) : (
            <p>Select all 3 cards</p>
          )}
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
        <h2>Challenge from <span className="player-name-display large">{selectedChallenge?.challengerName}</span></h2>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="challenge-details">
        <p><span className="player-name-display medium">{selectedChallenge?.challengerName}</span> has challenged you to a battle!</p>
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
    // Filter tools: defender can't use challenger-only tools
    const allAvailableTools = playerTools.filter(pt => {
      if (pt.cooldownRemaining > 0) return false;
      if (!pt.tool) return false;
      return pt.tool.restriction !== 'challenger';
    });
    // Split into action tools (reveal_cards) and card tools (stat_boost, any_stat_boost)
    const actionTools = allAvailableTools.filter(pt => pt.tool && pt.tool.effectType === 'reveal_cards');
    const cardTools = allAvailableTools.filter(pt => pt.tool && pt.tool.effectType !== 'reveal_cards');

    console.log('[Defense Setup] Current player:', player);
    console.log('[Defense Setup] playerTools:', playerTools);
    console.log('[Defense Setup] actionTools:', actionTools);
    console.log('[Defense Setup] cardTools:', cardTools);

    return (
      <div className="defense-setup">
        <div className="selection-header">
          <button className="btn btn-back" onClick={() => setView('list')}>
            ← Back
          </button>
          <h2>Select order vs <span className="player-name-display large">{selectedChallenge?.challengerName}</span></h2>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* First Round Ability Display */}
        <div className="first-round-info">
          <h4>First Round Ability: <span className="ability-highlight">{getAbilityIcon(selectedChallenge?.firstRoundAbility || '')} {selectedChallenge?.firstRoundAbility?.toUpperCase()}</span></h4>
          <p>The first round will be fought using the {selectedChallenge?.firstRoundAbility} ability!</p>
        </div>

        {/* Action Tools Section */}
        {actionTools.length > 0 && (
          <div className="tools-section action-tools">
            <h3>Action Tools (Click to use)</h3>
            <div className="tools-container">
              {actionTools.map(pt => (
                <button
                  key={pt.toolId}
                  className="tool-item tool-button"
                  onClick={() => handleUseBinoculars()}
                  disabled={binocularsUsed}
                  style={{
                    opacity: binocularsUsed ? 0.5 : 1,
                    cursor: binocularsUsed ? 'not-allowed' : 'pointer'
                  }}
                >
                  {pt.tool?.imageUrl && (
                    <img
                      src={pt.tool.imageUrl}
                      alt={pt.tool.name}
                      className="tool-image"
                    />
                  )}
                  <div className="tool-info">
                    <div className="tool-name">{pt.tool?.name}</div>
                    <div className="tool-effect">{pt.tool?.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Revealed Cards Section */}
        {revealedCards.length > 0 && (
          <div className="revealed-cards-section">
            <h3>Revealed Opponent Cards:</h3>
            <div className="revealed-cards">
              {revealedCards.map(card => (
                <div key={card.id} className="revealed-card">
                  <CardComponent card={card} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Card Tools Section */}
        {cardTools.length > 0 && (
          <div className="tools-section card-tools">
            <h3>Card Tools (Drag to apply)</h3>
            <div className="tools-container">
              {cardTools.map(pt => (
                <div
                  key={pt.toolId}
                  className="tool-item"
                  draggable
                  onDragStart={() => handleToolDragStart(pt.toolId)}
                  onDragEnd={handleToolDragEnd}
                  style={{
                    opacity: Array.from(appliedTools.values()).includes(pt.toolId) ? 0.5 : 1,
                  }}
                >
                  {pt.tool?.imageUrl && (
                    <img
                      src={pt.tool.imageUrl}
                      alt={pt.tool.name}
                      className="tool-image"
                    />
                  )}
                  <div className="tool-info">
                    <div className="tool-name">{pt.tool?.name}</div>
                    <div className="tool-effect">{getToolEffect(pt.toolId)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <h3 className="card-selection-info">Select the order to play your cards (click cards in order)</h3>
        <div className="battle-cards">
          {battleCards.map((card, index) => {
            const orderPosition = selectedOrder.indexOf(index);
            const appliedTool = appliedTools.get(index);
            return (
              <div
                key={card.id}
                className={`battle-card-wrapper ${orderPosition !== -1 ? 'selected' : ''}`}
                onClick={() => handleCardSelect(index)}
                onDrop={(e) => handleCardDrop(e, index)}
                onDragOver={handleCardDragOver}
                onDragEnter={() => handleCardDragEnter(index)}
                onDragLeave={handleCardDragLeave}
              >
                {orderPosition !== -1 && (
                  <div className="order-badge">{orderPosition + 1}</div>
                )}
                <CardComponent card={card} onClick={() => {}} />
                {appliedTool && (
                  <div className="applied-tools">
                    <div className="tool-badge">
                      {(() => {
                        const tool = allAvailableTools.find((pt: PlayerTool) => pt.toolId === appliedTool)?.tool;
                        if (tool?.imageUrl) {
                          return (
                            <img
                              src={tool.imageUrl}
                              alt={tool.name}
                              className="tool-badge-image"
                              title={getToolEffect(appliedTool)}
                            />
                          );
                        }
                        return <span className="tool-effect">{getToolEffect(appliedTool)}</span>;
                      })()}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="order-display">
          {selectedOrder.length === 3 ? (
            <>
              <p className="order-title">Play Order:</p>
              {selectedOrder.map((idx, pos) => (
                <p key={pos} className="order-item">{pos + 1}. {battleCards[idx]?.name}</p>
              ))}
            </>
          ) : (
            <p>Select all 3 cards</p>
          )}
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

    // Debug: Log the battle data to see critical hit info
    console.log('[Challenge] Battle Results - Full battle data:', completedBattle);
    console.log('[Challenge] Battle Results - Rounds with critical info:', completedBattle.rounds.map(r => ({
      round: r.roundNumber,
      p1Crit: r.player1CriticalHit,
      p2Crit: r.player2CriticalHit,
      damage: r.damageDealt,
      winner: r.winner
    })));

    const isWinner = completedBattle.winner === player.id;
    // Determine if current player is player1 or player2 in the battle
    const isPlayer1 = completedBattle.player1Id === player.id;
    const myPoints = isPlayer1 ? completedBattle.player1Points : completedBattle.player2Points;
    const opponentPoints = isPlayer1 ? completedBattle.player2Points : completedBattle.player1Points;
    const opponentName = isPlayer1
      ? (completedBattle.player2Name || 'AI Opponent')
      : (completedBattle.player1Name || 'Unknown');

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
            <span className={`player-name-display large ${isWinner ? 'victory' : 'defeat'}`}>{player.name}</span>
            <span className="points">{myPoints}</span>
          </div>
          <span className="player-name-display vs-separator">VS</span>
          <div className="score-display">
            <span className={`player-name-display large ${opponentName === 'AI Opponent' ? 'ai-opponent' : ''} ${!isWinner ? 'victory' : 'defeat'}`}>{opponentName}</span>
            <span className="points">{opponentPoints}</span>
          </div>
        </div>

        {completedBattle.winReason && (
          <p className="win-reason">
            {isWinner ? player.name : opponentName} wins by{' '}
            {completedBattle.winReason === 'coin-toss' ? 'Coin Toss' :
             completedBattle.winReason === 'damage' ?
               `Total Damage ${isWinner
                 ? (isPlayer1 ? completedBattle.player1TotalDamage : completedBattle.player2TotalDamage)
                 : (isPlayer1 ? completedBattle.player2TotalDamage : completedBattle.player1TotalDamage)} - ${isWinner
                 ? (isPlayer1 ? completedBattle.player2TotalDamage : completedBattle.player1TotalDamage)
                 : (isPlayer1 ? completedBattle.player1TotalDamage : completedBattle.player2TotalDamage)}` :
               `Points ${isWinner ? myPoints : opponentPoints} - ${isWinner ? opponentPoints : myPoints}`}
          </p>
        )}

        <div className="rounds-summary">
          <h3>Battle Summary</h3>
          {completedBattle.rounds.map((round, index) => {
            // Determine if current player won this round
            const playerWon = isPlayer1 ? round.winner === 'player1' : round.winner === 'player2';
            const playerLost = isPlayer1 ? round.winner === 'player2' : round.winner === 'player1';
            const roundClass = playerWon ? 'won' : playerLost ? 'lost' : 'draw';

            return (
            <div key={index} className={`round-summary ${roundClass}`}>
              <div className="round-header">
                Round {round.roundNumber} - {getAbilityIcon(round.ability)} {round.ability.toUpperCase()}
              </div>
              <div className="round-details">
                <div className="player-column">
                  <div className="player-label">{isPlayer1 ? 'You' : (completedBattle.player1Name || 'Player 1')}</div>
                  <span className="card-name">{round.player1CardName}</span>
                  <div className="stats-list">
                    <div className="stat-line">
                      <span className="stat-label">{round.ability.charAt(0).toUpperCase() + round.ability.slice(1)}:</span>
                      <span className="stat-value">{round.player1BaseStatValue || round.player1StatValue}</span>
                    </div>
                    {round.player1ToolBonus && round.player1ToolBonus > 0 && (
                      <div className="stat-line">
                        <span className="stat-label">Tool:</span>
                        <span className="stat-value" style={{ color: 'red' }}>{round.player1ToolBonus}</span>
                      </div>
                    )}
                    <div className="stat-line">
                      <span className="stat-label">Roll:</span>
                      <span className="stat-value">{round.player1Roll}</span>
                    </div>
                    {round.player1CriticalHit && (
                      <div className="stat-line critical">
                        <span className="stat-label">Critical hit:</span>
                        <span className="stat-value">{round.player1Roll}</span>
                      </div>
                    )}
                    <div className="stat-line total">
                      <span className="stat-label">Total:</span>
                      <span className="stat-value">{round.player1Total}</span>
                    </div>
                  </div>
                </div>

                <div className="battle-outcome">
                  {round.winner === 'draw' ? (
                    <div className="draw-result">DRAW</div>
                  ) : (
                    <>
                      <div className="winner-arrow">
                        {round.winner === 'player1' ? '→' : '←'}
                      </div>
                      <div className="damage-display">
                        <span className="damage-label">Damage:</span>
                        <span className="damage-value">{round.damageDealt}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="player-column">
                  <div className="player-label">{isPlayer1 ? (completedBattle.player2Name || 'Opponent') : 'You'}</div>
                  <span className="card-name">{round.player2CardName}</span>
                  <div className="stats-list">
                    <div className="stat-line">
                      <span className="stat-label">{round.ability.charAt(0).toUpperCase() + round.ability.slice(1)}:</span>
                      <span className="stat-value">{round.player2BaseStatValue || round.player2StatValue}</span>
                    </div>
                    {round.player2ToolBonus && round.player2ToolBonus > 0 && (
                      <div className="stat-line">
                        <span className="stat-label">Tool:</span>
                        <span className="stat-value" style={{ color: 'red' }}>{round.player2ToolBonus}</span>
                      </div>
                    )}
                    <div className="stat-line">
                      <span className="stat-label">Roll:</span>
                      <span className="stat-value">{round.player2Roll}</span>
                    </div>
                    {round.player2CriticalHit && (
                      <div className="stat-line critical">
                        <span className="stat-label">Critical hit:</span>
                        <span className="stat-value">{round.player2Roll}</span>
                      </div>
                    )}
                    <div className="stat-line total">
                      <span className="stat-label">Total:</span>
                      <span className="stat-value">{round.player2Total}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            );
          })}
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