import React, { useState } from 'react';
import { Card } from '../types';
import CardComponent from './Card';
import voiceService from '../services/voice';
import './PackOpening.css';

interface PackOpeningProps {
  cards: Card[];
  onComplete: () => void;
}

const PackOpening: React.FC<PackOpeningProps> = ({ cards, onComplete }) => {
  const [revealedCount, setRevealedCount] = useState(0);
  const [currentRevealIndex, setCurrentRevealIndex] = useState(-1);
  const [isOpening, setIsOpening] = useState(false);
  const [packOpened, setPackOpened] = useState(false);
  const [showSmoke, setShowSmoke] = useState(false);
  const [packDisappeared, setPackDisappeared] = useState(false);

  const handleOpenPack = () => {
    setIsOpening(true);

    // Announce pack opening
    voiceService.speak('Apertura del pacco!', { rate: 0.9, pitch: 1.2 });

    // Start smoke effect after 500ms
    setTimeout(() => {
      setShowSmoke(true);
    }, 500);

    // Hide pack and show cards after smoke starts
    setTimeout(() => {
      setPackDisappeared(true);
      setPackOpened(true);
      setCurrentRevealIndex(0);
      startRevealSequence();
    }, 1500);

    // Remove smoke after cards are revealed
    setTimeout(() => {
      setShowSmoke(false);
    }, 2000);
  };

  const startRevealSequence = () => {
    cards.forEach((card, index) => {
      setTimeout(() => {
        setCurrentRevealIndex(index);
        setRevealedCount(prev => prev + 1);

        // Announce the card name when revealed
        const cardName = card.fullName || card.name;
        voiceService.speakCardName(cardName);

        // Add special announcement for rare cards
        if (card.rarity === 'rare') {
          setTimeout(() => {
            voiceService.speak('Carta rara!', { rate: 0.9, pitch: 1.3 });
          }, 500);
        }
      }, 1500 + (index * 800)); // Delay each card reveal
    });
  };

  const handleCardClick = (index: number) => {
    if (index <= currentRevealIndex && revealedCount < cards.length) {
      // Allow clicking to speed up reveal
      if (currentRevealIndex < cards.length - 1) {
        setCurrentRevealIndex(currentRevealIndex + 1);
        setRevealedCount(prev => Math.min(prev + 1, cards.length));
      }
    }
  };

  const getRarityGlow = (rarity: string) => {
    switch (rarity) {
      case 'rare':
        return 'rare-glow';
      case 'uncommon':
        return 'uncommon-glow';
      default:
        return 'common-glow';
    }
  };

  return (
    <div className="pack-opening-container">
      <h2>Pack Opening!</h2>

      {!packOpened ? (
        <div className="pack-wrapper">
          <div
            className={`pack-image-container ${packDisappeared ? 'disappearing' : ''} ${isOpening ? 'shaking' : ''}`}
            onClick={!isOpening ? handleOpenPack : undefined}
          >
            <img
              src="/images/BTCG-pack.png"
              alt="Card Pack"
              className="pack-image"
              style={{ height: '300px', width: 'auto' }}
            />
            {showSmoke && (
              <div className="smoke-effect">
                <div className="smoke-cloud smoke-1"></div>
                <div className="smoke-cloud smoke-2"></div>
                <div className="smoke-cloud smoke-3"></div>
                <div className="smoke-cloud smoke-4"></div>
                <div className="smoke-cloud smoke-5"></div>
              </div>
            )}
          </div>
          {!isOpening && <p className="instruction">Click the pack to open!</p>}
        </div>
      ) : (
        <div className="cards-reveal-container">
          <div className="cards-grid-opening">
            {cards.map((card, index) => (
              <div
                key={index}
                className={`card-wrapper ${index <= currentRevealIndex ? 'revealed' : ''}`}
                onClick={() => handleCardClick(index)}
              >
                {index <= currentRevealIndex ? (
                  <div className={`card-reveal-animation ${getRarityGlow(card.rarity)}`}>
                    <CardComponent card={card} />
                  </div>
                ) : (
                  <div className="card-back">
                    <div className="card-back-design">
                      <div className="card-back-pattern">?</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="opening-status">
            {revealedCount < cards.length ? (
              <p>Revealing cards... ({revealedCount}/{cards.length})</p>
            ) : (
              <div className="opening-complete">
                <p>Pack opening complete!</p>
                <button className="continue-button" onClick={onComplete}>
                  Add to Collection
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PackOpening;