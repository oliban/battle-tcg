import React from 'react';
import { Card } from '../types';
import CardComponent from './Card';
import './CardSelector.css';

interface CardSelectorProps {
  availableCards: Card[];
  selectedCards: string[];
  onCardSelect: (cardId: string) => void;
  maxSelection?: number;
}

const CardSelector: React.FC<CardSelectorProps> = ({
  availableCards,
  selectedCards,
  onCardSelect,
  maxSelection = 3
}) => {
  return (
    <div className="card-selector">
      <div className="selection-info">
        <p>Select {maxSelection} cards ({selectedCards.length}/{maxSelection} selected)</p>
      </div>
      <div className="card-grid">
        {availableCards.map(card => (
          <div
            key={card.id}
            className={`card-wrapper ${selectedCards.includes(card.id) ? 'selected' : ''}`}
            onClick={() => onCardSelect(card.id)}
          >
            <CardComponent card={card} />
            {selectedCards.includes(card.id) && (
              <div className="selection-order">
                {selectedCards.indexOf(card.id) + 1}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CardSelector;