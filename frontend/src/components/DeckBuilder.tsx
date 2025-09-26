import React, { useState, useEffect } from 'react';
import { Card, Player } from '../types';
import CardComponent from './Card';
import './DeckBuilder.css';

interface CardGroup {
  baseCard: Card;  // The first instance of this card (for display)
  count: number;    // Total number of copies available
  instanceIds: string[];  // All instance IDs of this card
  inDeckCount: number;    // How many are currently in the deck
}

interface DeckBuilderProps {
  player: Player;
  playerCards: Card[];
  onDeckUpdate: (deck: string[]) => void;
}

const DeckBuilder: React.FC<DeckBuilderProps> = ({ player, playerCards, onDeckUpdate }) => {
  const [selectedDeck, setSelectedDeck] = useState<string[]>(player.deck || []);
  const [groupedCards, setGroupedCards] = useState<CardGroup[]>([]);
  const [sortBy, setSortBy] = useState<'latest' | 'strength' | 'speed' | 'agility' | 'total' | 'rarity'>('latest');

  // Group cards by their base properties (name, stats, etc.)
  const groupCards = (cards: Card[]): CardGroup[] => {
    const groups: { [key: string]: CardGroup } = {};

    cards.forEach(card => {
      // Use fullName if available (for titled cards), otherwise use name
      const displayName = card.fullName || card.name;
      // Create a unique key based on card properties (not ID)
      const cardKey = `${displayName}_${card.abilities.strength}_${card.abilities.speed}_${card.abilities.agility}_${card.rarity}`;

      if (!groups[cardKey]) {
        groups[cardKey] = {
          baseCard: card,
          count: 0,
          instanceIds: [],
          inDeckCount: 0
        };
      }

      groups[cardKey].count++;
      groups[cardKey].instanceIds.push(card.id);
    });

    // Calculate how many of each card are in the deck
    Object.values(groups).forEach(group => {
      group.inDeckCount = group.instanceIds.filter(id => selectedDeck.includes(id)).length;
    });

    return Object.values(groups);
  };

  useEffect(() => {
    // For "Latest Added", don't group cards - show each individual card
    if (sortBy === 'latest') {
      // Convert individual cards to single-card groups for consistency with the component's structure
      const individualGroups = playerCards.map(card => ({
        baseCard: card,
        count: 1,
        instanceIds: [card.id],
        inDeckCount: selectedDeck.includes(card.id) ? 1 : 0
      }));
      setGroupedCards(individualGroups);
      return;
    }

    // Group and sort cards for other sort options
    const grouped = groupCards(playerCards);

    // Sort the grouped cards
    const sorted = [...grouped].sort((a, b) => {
      const cardA = a.baseCard;
      const cardB = b.baseCard;

      if (sortBy === 'strength') return cardB.abilities.strength - cardA.abilities.strength;
      if (sortBy === 'speed') return cardB.abilities.speed - cardA.abilities.speed;
      if (sortBy === 'agility') return cardB.abilities.agility - cardA.abilities.agility;
      if (sortBy === 'rarity') {
        const rarityOrder: Record<string, number> = { rare: 3, uncommon: 2, common: 1 };
        return (rarityOrder[cardB.rarity] || 0) - (rarityOrder[cardA.rarity] || 0);
      }
      // Default: sort by total stats
      const totalA = cardA.abilities.strength + cardA.abilities.speed + cardA.abilities.agility;
      const totalB = cardB.abilities.strength + cardB.abilities.speed + cardB.abilities.agility;
      return totalB - totalA;
    });

    setGroupedCards(sorted);
  }, [playerCards, sortBy, selectedDeck]);  // Include selectedDeck to update inDeckCount

  const addCardToDeck = (cardGroup: CardGroup) => {
    if (selectedDeck.length >= 10) {
      return;
    }

    // Find the next available instance ID that's not already in the deck
    const availableId = cardGroup.instanceIds.find(id => !selectedDeck.includes(id));

    if (availableId) {
      setSelectedDeck(prev => [...prev, availableId]);
    }
  };

  const removeCardFromDeck = (cardGroup: CardGroup) => {
    // Find the last instance of this card in the deck and remove it
    const idsInDeck = cardGroup.instanceIds.filter(id => selectedDeck.includes(id));

    if (idsInDeck.length > 0) {
      const idToRemove = idsInDeck[idsInDeck.length - 1];
      setSelectedDeck(prev => prev.filter(id => id !== idToRemove));
    }
  };

  const removeFromDeckById = (cardId: string) => {
    setSelectedDeck(prev => prev.filter(id => id !== cardId));
  };

  const saveDeck = () => {
    if (selectedDeck.length !== 10) {
      return;
    }
    onDeckUpdate(selectedDeck);
  };

  const clearDeck = () => {
    setSelectedDeck([]);
  };

  const autoFillDeck = () => {
    const needed = 10 - selectedDeck.length;
    if (needed <= 0) return;

    let added = 0;
    const newDeckIds = [...selectedDeck];

    // Sort groups by total stats for auto-fill
    const sortedForAutoFill = [...groupedCards].sort((a, b) => {
      const totalA = a.baseCard.abilities.strength + a.baseCard.abilities.speed + a.baseCard.abilities.agility;
      const totalB = b.baseCard.abilities.strength + b.baseCard.abilities.speed + b.baseCard.abilities.agility;
      return totalB - totalA;
    });

    for (const group of sortedForAutoFill) {
      if (added >= needed) break;

      // Add available copies from this group
      const availableIds = group.instanceIds.filter(id => !newDeckIds.includes(id));
      const toAdd = Math.min(availableIds.length, needed - added);

      for (let i = 0; i < toAdd; i++) {
        newDeckIds.push(availableIds[i]);
        added++;
      }
    }

    setSelectedDeck(newDeckIds);
  };

  const randomizeDeck = () => {
    // Get all available card instance IDs
    const allCardIds: string[] = [];
    for (const group of groupedCards) {
      allCardIds.push(...group.instanceIds);
    }

    // Shuffle the array using Fisher-Yates algorithm
    const shuffled = [...allCardIds];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Take the first 10 cards (or all if less than 10 available)
    const newDeck = shuffled.slice(0, Math.min(10, shuffled.length));
    setSelectedDeck(newDeck);
  };

  const getDeckCards = (): Card[] => {
    return selectedDeck
      .map(id => playerCards.find(card => card.id === id))
      .filter((card): card is Card => card !== undefined);
  };

  return (
    <div className="deck-builder">
      <div className="deck-section">
        <div className="section-header">
          <h3>Current Deck ({selectedDeck.length}/10)</h3>
          <div className="deck-actions">
            <button onClick={randomizeDeck} disabled={groupedCards.length === 0}>
              🎲 Randomize
            </button>
            <button onClick={autoFillDeck} disabled={selectedDeck.length >= 10}>
              Auto-Fill
            </button>
            <button onClick={clearDeck} disabled={selectedDeck.length === 0}>
              Clear
            </button>
            <button
              onClick={saveDeck}
              className={selectedDeck.length === 10 ? 'save-ready' : ''}
              disabled={selectedDeck.length !== 10}
            >
              Save Deck
            </button>
          </div>
        </div>
        <div className="deck-cards">
          {selectedDeck.length === 0 ? (
            <p className="empty-message">No cards in deck. Add cards from your collection below.</p>
          ) : (
            getDeckCards().map((card, index) => (
              <div key={`deck-${card.id}-${index}`} className="deck-card-wrapper">
                <div className="deck-position">{index + 1}</div>
                <CardComponent card={card} onClick={() => removeFromDeckById(card.id)} />
                <button className="remove-btn" onClick={(e) => {
                  e.stopPropagation();
                  removeFromDeckById(card.id);
                }}>
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="collection-section">
        <div className="section-header">
          <div>
            <h3>Your Collection ({groupedCards.length} unique cards)</h3>
            <p className="hint">Click cards to add/remove from deck. Numbers show how many copies you have.</p>
          </div>
          <div className="sort-controls">
            <label>Sort by: </label>
            <select
              value={sortBy}
              onChange={(e) => {
                const newSort = e.target.value as 'latest' | 'strength' | 'speed' | 'agility' | 'total' | 'rarity';
                console.log('Changing sort to:', newSort);
                setSortBy(newSort);
              }}
            >
              <option value="latest">Latest Added</option>
              <option value="total">Total Stats</option>
              <option value="strength">Strength</option>
              <option value="speed">Speed</option>
              <option value="agility">Agility</option>
              <option value="rarity">Rarity</option>
            </select>
          </div>
        </div>
        <div className="available-cards">
          {groupedCards.length === 0 ? (
            <p className="empty-message">
              {playerCards.length < 10
                ? `You need at least 10 cards to build a deck. You have ${playerCards.length} cards.`
                : 'Loading cards...'}
            </p>
          ) : (
            groupedCards.map(cardGroup => {
              const availableCount = cardGroup.count - cardGroup.inDeckCount;
              const canAddMore = availableCount > 0 && selectedDeck.length < 10;

              return (
                <div
                  key={`group-${cardGroup.baseCard.id}`}
                  className={`available-card-wrapper ${cardGroup.inDeckCount > 0 ? 'card-in-deck' : ''} ${!canAddMore ? 'card-unavailable' : ''}`}
                  onClick={() => {
                    if (canAddMore) {
                      addCardToDeck(cardGroup);
                    } else if (cardGroup.inDeckCount > 0) {
                      removeCardFromDeck(cardGroup);
                    }
                  }}
                  style={{ cursor: canAddMore || cardGroup.inDeckCount > 0 ? 'pointer' : 'default' }}
                >
                  {/* Stack count badge */}
                  {cardGroup.count > 1 && (
                    <div className="stack-count">×{cardGroup.count}</div>
                  )}

                  {/* In deck badge */}
                  {cardGroup.inDeckCount > 0 && (
                    <div className="in-deck-badge">{cardGroup.inDeckCount} in deck</div>
                  )}

                  <CardComponent
                    card={cardGroup.baseCard}
                    onClick={() => {}} // Handle click in parent div
                    selected={cardGroup.inDeckCount > 0}
                  />

                  {/* Available count overlay */}
                  <div className="available-overlay">
                    {availableCount > 0 ? (
                      <span className="available-text">Click to add ({availableCount} left)</span>
                    ) : cardGroup.inDeckCount > 0 ? (
                      <span className="remove-text">Click to remove</span>
                    ) : (
                      <span className="none-left">None available</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {selectedDeck.length === 10 && (
        <div className="deck-summary">
          <h4>Deck Statistics</h4>
          <div className="stats-summary">
            <div>
              Total STR: {getDeckCards().reduce((sum, card) => sum + card.abilities.strength, 0)}
            </div>
            <div>
              Total SPD: {getDeckCards().reduce((sum, card) => sum + card.abilities.speed, 0)}
            </div>
            <div>
              Total AGL: {getDeckCards().reduce((sum, card) => sum + card.abilities.agility, 0)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeckBuilder;