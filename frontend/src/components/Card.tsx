import React from 'react';
import { Card as CardType } from '../types';
import voiceService from '../services/voice';
import './Card.css';

interface CardProps {
  card: CardType;
  onClick?: () => void;
  selected?: boolean;
  count?: number;
  hideCrit?: boolean;
}

const Card: React.FC<CardProps> = ({ card, onClick, selected, count, hideCrit }) => {
  // Calculate total including title modifiers
  const strengthTotal = card.abilities.strength + (card.titleModifiers?.strength || 0);
  const speedTotal = card.abilities.speed + (card.titleModifiers?.speed || 0);
  const agilityTotal = card.abilities.agility + (card.titleModifiers?.agility || 0);
  const totalPoints = strengthTotal + speedTotal + agilityTotal;

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'rare':
        return '#ff6b6b';
      case 'uncommon':
        return '#4ecdc4';
      default:
        return '#95a5a6';
    }
  };

  const handleClick = () => {
    // Speak the card name in Italian
    voiceService.speakCardName(card.fullName || card.name);

    // Call the original onClick if provided
    if (onClick) {
      onClick();
    }
  };

  return (
    <div
      className={`card ${selected ? 'selected' : ''}`}
      onClick={handleClick}
      style={{ borderColor: getRarityColor(card.rarity) }}
    >
      <span className={`rarity-badge ${card.rarity}`}>{card.rarity}</span>
      {count && count > 1 && (
        <div className="card-count-badge">
          x{count}
        </div>
      )}
      <div className="card-header">
        <h3 title={card.fullName || card.name}>
          {card.fullName || card.name}
        </h3>
      </div>

      {card.imageUrl && (
        <div className="card-image">
          {card.criticalHitChance && !hideCrit && (
            <div className="critical-hit-badge">
              <span className="crit-text">Crit: {card.criticalHitChance}%</span>
            </div>
          )}
          <img src={card.imageUrl} alt={card.name} />
        </div>
      )}

      <div className="card-description">
        <p>{card.description}</p>
      </div>

      <div className="card-stats">
        <div className="stat">
          <span className="stat-label">STR</span>
          <span className="stat-value">
            {card.abilities.strength}
            {card.titleModifiers?.strength !== 0 && card.titleModifiers?.strength !== undefined && (
              <span className={`modifier ${card.titleModifiers.strength > 0 ? 'positive' : 'negative'}`}>
                {card.titleModifiers.strength > 0 ? '+' : ''}{card.titleModifiers.strength}
              </span>
            )}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">SPD</span>
          <span className="stat-value">
            {card.abilities.speed}
            {card.titleModifiers?.speed !== 0 && card.titleModifiers?.speed !== undefined && (
              <span className={`modifier ${card.titleModifiers.speed > 0 ? 'positive' : 'negative'}`}>
                {card.titleModifiers.speed > 0 ? '+' : ''}{card.titleModifiers.speed}
              </span>
            )}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">AGL</span>
          <span className="stat-value">
            {card.abilities.agility}
            {card.titleModifiers?.agility !== 0 && card.titleModifiers?.agility !== undefined && (
              <span className={`modifier ${card.titleModifiers.agility > 0 ? 'positive' : 'negative'}`}>
                {card.titleModifiers.agility > 0 ? '+' : ''}{card.titleModifiers.agility}
              </span>
            )}
          </span>
        </div>
      </div>

      <div className="card-total">
        <span className="total-label">Total:</span>
        <span className="total-value">{totalPoints}</span>
      </div>
    </div>
  );
};

export default Card;