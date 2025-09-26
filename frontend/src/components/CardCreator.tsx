import React, { useState } from 'react';
import { Ability, Card } from '../types';
import { cardAPI } from '../services/api';
import './CardCreator.css';

interface CardCreatorProps {
  playerId: string;
  coins: number;
  onCardCreated: (card: Card, remainingCoins: number) => void;
}

interface CardPreview {
  abilities: Record<Ability, number>;
  rarity: string;
}

const CardCreator: React.FC<CardCreatorProps> = ({ playerId, coins, onCardCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [primaryAbility, setPrimaryAbility] = useState<Ability>('strength');
  const [imageUrl, setImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Preview state
  const [preview, setPreview] = useState<CardPreview | null>(null);
  const [rerollCount, setRerollCount] = useState(0);
  const [totalCost, setTotalCost] = useState(50);

  const handleGeneratePreview = async () => {
    if (!name.trim()) {
      setError('Card name is required');
      return;
    }

    if (!imageUrl) {
      setError('Card image is required');
      return;
    }

    if (coins < 50) {
      setError('Insufficient coins (need at least 50)');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const stats = await cardAPI.previewStats(primaryAbility);
      setPreview(stats);
      setRerollCount(0);
      setTotalCost(50);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate preview');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReroll = async () => {
    const rerollCost = rerollCount === 0 ? 25 : 50;
    const newTotalCost = totalCost + rerollCost;

    if (coins < newTotalCost) {
      setError(`Insufficient coins (need ${newTotalCost} total)`);
      return;
    }

    if (rerollCount >= 2) {
      setError('Maximum rerolls reached');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const stats = await cardAPI.previewStats(primaryAbility);
      setPreview(stats);
      setRerollCount(rerollCount + 1);
      setTotalCost(newTotalCost);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reroll');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmCreation = async () => {
    if (!preview || !name.trim()) {
      setError('Please generate a preview first');
      return;
    }

    if (!imageUrl) {
      setError('Card image is required');
      return;
    }

    if (coins < totalCost) {
      setError(`Insufficient coins (need ${totalCost})`);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await cardAPI.createCard(
        playerId,
        name,
        description || '',
        preview.abilities,
        preview.rarity,
        totalCost,
        imageUrl
      );

      onCardCreated(result.card, result.remainingCoins);

      // Reset form
      setName('');
      setDescription('');
      setImageUrl('');
      setPreview(null);
      setRerollCount(0);
      setTotalCost(50);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create card');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setPreview(null);
    setRerollCount(0);
    setTotalCost(50);
    setError('');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

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

  return (
    <div className="card-creator">
      <h2>Create New Card</h2>

      {error && <div className="error-message">{error}</div>}

      <div className="form-group">
        <label>Card Name:</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter card name"
          maxLength={50}
          disabled={preview !== null}
        />
      </div>

      <div className="form-group">
        <label>Description (optional):</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your card (optional)"
          maxLength={200}
          disabled={preview !== null}
        />
      </div>

      <div className="form-group">
        <label>Primary Ability:</label>
        <div className="ability-selector">
          <button
            className={primaryAbility === 'strength' ? 'selected' : ''}
            onClick={() => setPrimaryAbility('strength')}
            disabled={preview !== null}
          >
            Strength
          </button>
          <button
            className={primaryAbility === 'speed' ? 'selected' : ''}
            onClick={() => setPrimaryAbility('speed')}
            disabled={preview !== null}
          >
            Speed
          </button>
          <button
            className={primaryAbility === 'agility' ? 'selected' : ''}
            onClick={() => setPrimaryAbility('agility')}
            disabled={preview !== null}
          >
            Agility
          </button>
        </div>
      </div>

      <div className="form-group">
        <label>Card Image (required):</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          disabled={preview !== null}
        />
        {imageUrl && (
          <div className="image-preview">
            <img src={imageUrl} alt="Preview" />
          </div>
        )}
      </div>

      {!preview ? (
        <div className="creator-actions">
          <button
            onClick={handleGeneratePreview}
            disabled={isLoading || !name.trim() || !imageUrl || coins < 50}
            className="generate-button"
          >
            {isLoading ? 'Generating...' : 'Generate Stats (50 coins)'}
          </button>
        </div>
      ) : (
        <div className="stats-preview">
          <h3>Stats Preview</h3>
          <div className="preview-card" style={{ borderColor: getRarityColor(preview.rarity) }}>
            <p className="preview-name">{name}</p>
            <p className="preview-rarity" style={{ color: getRarityColor(preview.rarity) }}>
              {preview.rarity.toUpperCase()}
            </p>
            <div className="preview-stats">
              <div>STR: {preview.abilities.strength}</div>
              <div>SPD: {preview.abilities.speed}</div>
              <div>AGL: {preview.abilities.agility}</div>
              <div>Total: {preview.abilities.strength + preview.abilities.speed + preview.abilities.agility}</div>
            </div>
          </div>

          <div className="preview-cost">
            <p>Total Cost: {totalCost} coins</p>
            {rerollCount > 0 && <p className="reroll-info">Rerolled {rerollCount} time(s)</p>}
          </div>

          <div className="preview-actions">
            {rerollCount < 2 && (
              <button
                onClick={handleReroll}
                disabled={isLoading || coins < totalCost + (rerollCount === 0 ? 25 : 50)}
                className="reroll-button"
              >
                {isLoading ? 'Rerolling...' : `Reroll (${rerollCount === 0 ? 25 : 50} coins)`}
              </button>
            )}

            <button
              onClick={handleConfirmCreation}
              disabled={isLoading || coins < totalCost}
              className="confirm-button"
            >
              {isLoading ? 'Creating...' : `Create Card (${totalCost} coins total)`}
            </button>

            <button
              onClick={handleReset}
              disabled={isLoading}
              className="cancel-button"
            >
              Start Over
            </button>
          </div>

          {rerollCount >= 2 && (
            <p className="max-rerolls">Maximum rerolls reached. Create the card or start over.</p>
          )}
        </div>
      )}

      <div className="creator-info">
        <p>Current Coins: {coins}</p>
        {preview && <p>Coins after creation: {coins - totalCost}</p>}
      </div>
    </div>
  );
};

export default CardCreator;