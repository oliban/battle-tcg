import React, { useState, useEffect } from 'react';
import './App.css';
import './components/PlayerName.css';
import { Player, Card } from './types';
import { playerAPI, shopAPI } from './services/api';
import CardCreator from './components/CardCreator';
import CardComponent from './components/Card';
import PackOpening from './components/PackOpening';
import DeckBuilder from './components/DeckBuilder';
import voiceService from './services/voice';
import NotificationBell from './components/NotificationBell';
import Challenge from './components/Challenge';
import Leaderboard from './components/Leaderboard';

function App() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [currentView, setCurrentView] = useState<'home' | 'creator' | 'collection' | 'shop' | 'battle' | 'pack-opening' | 'deck-builder' | 'challenge' | 'leaderboard'>('home');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [packCards, setPackCards] = useState<Card[]>([]);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [collectionSortBy, setCollectionSortBy] = useState<'latest' | 'total' | 'strength' | 'speed' | 'agility' | 'rarity'>('latest');
  const [previousView, setPreviousView] = useState<typeof currentView>('home');
  const [playerName, setPlayerName] = useState<string>('');

  // Auto-refresh collection when navigating to it
  useEffect(() => {
    if (currentView === 'collection' && previousView !== 'collection' && player) {
      playerAPI.getPlayerCards(player.id).then(cards => {
        setPlayerCards(cards);
      }).catch(err => {
        console.error('Failed to refresh collection:', err);
      });
    }
    setPreviousView(currentView);
  }, [currentView, player, previousView]);

  // Auto-fade error messages after 6 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    const savedPlayerId = localStorage.getItem('playerId');
    if (savedPlayerId) {
      loadPlayer(savedPlayerId);
    }

    // Chrome bug fix: Keep speech synthesis alive
    const keepAlive = () => {
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    };

    // Run keepAlive every 5 seconds to prevent Chrome bug
    const keepAliveInterval = setInterval(keepAlive, 5000);

    // Load voices without problematic initialization
    const loadVoices = () => {
      const voices = voiceService.getAllVoices();
      setAvailableVoices(voices);
      if (voices.length > 0) {
        console.log('Voices loaded:', voices.length);
      }
    };

    // Load voices after a short delay
    setTimeout(() => {
      loadVoices();
      // Set Google italiano as default selection in dropdown
      const googleItaliano = voiceService.getAllVoices().find(voice =>
        voice.name.toLowerCase().includes('google') &&
        voice.name.toLowerCase().includes('italiano')
      );
      if (googleItaliano) {
        setSelectedVoice(googleItaliano.name);
        voiceService.setSelectedVoice(googleItaliano.name);
      }
    }, 500);

    // Reload voices on first user interaction (helps with some browsers)
    document.addEventListener('click', () => {
      if (availableVoices.length === 0) {
        loadVoices();
      }
    }, { once: true });

    // Listen for voice changes
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => {
        const voices = voiceService.getAllVoices();
        setAvailableVoices(voices);
      };
    }

    return () => {
      clearInterval(keepAliveInterval);
    };
  }, []);

  const loadPlayer = async (playerId: string) => {
    try {
      setLoading(true);
      const playerData = await playerAPI.getPlayer(playerId);
      setPlayer(playerData);
      const cards = await playerAPI.getPlayerCards(playerId);
      console.log('Loaded player cards:', cards.length, cards);
      setPlayerCards(cards);
    } catch (err) {
      console.error('Failed to load player:', err);
      localStorage.removeItem('playerId');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    try {
      setLoading(true);
      const result = await playerAPI.register(playerName.trim());
      setPlayer(result.player);
      localStorage.setItem('playerId', result.player.id);

      if (result.isNewPlayer) {
        setPlayerCards([]);
        setError(''); // Clear any previous errors
      } else {
        // Existing player - load their cards
        const cards = await playerAPI.getPlayerCards(result.player.id);
        setPlayerCards(cards);
        setError(''); // Clear any previous errors
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to register/login');
    } finally {
      setLoading(false);
    }
  };

  const handleCardCreated = async (card: Card, remainingCoins: number) => {
    if (player) {
      setPlayer({ ...player, coins: remainingCoins, cards: [...player.cards, card.id] });
      setPlayerCards([...playerCards, card]);
      setCurrentView('collection'); // Switch to collection view after card creation
    }
  };

  const handleBuyPack = async (packId: string) => {
    if (!player) return;

    try {
      setLoading(true);
      const result = await shopAPI.buyPack(player.id, packId);
      setPlayer({ ...player, coins: result.remainingCoins, cards: [...player.cards, ...result.cards.map(c => c.id)] });
      setPackCards(result.cards);
      setCurrentView('pack-opening');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to buy pack');
    } finally {
      setLoading(false);
    }
  };

  const handlePackOpeningComplete = () => {
    setPlayerCards([...playerCards, ...packCards]);
    setPackCards([]);
    setCurrentView('collection');
  };

  const handleDeckUpdate = async (deck: string[]) => {
    if (!player) return;

    try {
      setLoading(true);
      const updatedPlayer = await playerAPI.updateDeck(player.id, deck);
      setPlayer(updatedPlayer);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save deck');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!player) {
    return (
      <div className="App welcome-screen">
        <div className="welcome-hero-section">
          <div className="welcome-content">
            <h1 className="welcome-title">Battle Card Game</h1>
            <h2 className="welcome-subtitle">Join the Adventure!</h2>

            <div className="welcome-features">
              <div className="feature-item">
                <span className="feature-icon">🎨</span>
                <span>Create Custom Cards</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">⚔️</span>
                <span>Battle Other Players</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🏆</span>
                <span>Climb the Leaderboard</span>
              </div>
            </div>

            <div className="name-input-group">
              <input
                type="text"
                placeholder="Enter your name..."
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleRegister();
                  }
                }}
                className="name-input"
                maxLength={20}
                autoFocus
              />
              <button
                onClick={handleRegister}
                className="register-button hero-button"
                disabled={!playerName.trim()}
              >
                Start Your Journey
              </button>
            </div>
            {error && <p className="error-message">{error}</p>}
            <p className="welcome-hint">
              Enter your name to create a new account or login
            </p>
          </div>

          <div className="welcome-image-container">
            <div className="image-wrapper">
              <img
                src="/images/welcome-heroes.png"
                alt="Game Heroes"
                className="welcome-heroes-image"
                onError={(e) => {
                  // Hide image and show fallback
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <div className="image-fallback" style={{ display: 'none' }}>
                <div className="fallback-content">
                  <div className="card-icons">
                    <span>🎴</span>
                    <span>⚔️</span>
                    <span>🏆</span>
                  </div>
                  <h3>Epic Battles Await</h3>
                  <p>Create legendary cards and challenge players worldwide!</p>
                </div>
              </div>
              <div className="image-overlay">
                <div className="overlay-text">
                  <h3>Assemble Your Team</h3>
                  <p>Collect unique cards and build the ultimate deck!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Battle Card Game</h1>
        <div className="player-info">
          <span className="player-name-display medium">{player.name}</span>
          <span className="coins">💰 {player.coins} coins</span>
          <span>W: {player.wins} | L: {player.losses}</span>

          {/* Voice selector dropdown */}
          <select
            className="voice-selector"
            value={selectedVoice}
            onChange={(e) => {
              const voiceName = e.target.value;
              setSelectedVoice(voiceName);
              voiceService.setSelectedVoice(voiceName);
            }}
            style={{
              marginLeft: '20px',
              padding: '5px 10px',
              borderRadius: '5px',
              background: '#fff',
              color: '#282c34',
              border: '1px solid #61dafb',
              cursor: 'pointer'
            }}
          >
            <option value="">Browser Default</option>
            {availableVoices.map((voice) => (
              <option key={voice.name} value={voice.name}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>


          <button
            onClick={async () => {
              try {
                const updated = await playerAPI.addCoins(player.id, 1000);
                setPlayer(updated);
              } catch (err) {
                console.error('Failed to add coins:', err);
              }
            }}
            style={{ marginLeft: '10px', padding: '5px 10px', fontSize: '12px' }}
          >
            +1000 coins (test)
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('playerId');
              setPlayer(null);
              setPlayerCards([]);
              setCurrentView('home');
            }}
            style={{ marginLeft: '10px', padding: '5px 10px', fontSize: '12px', background: '#ff4444', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
          >
            Logout
          </button>
          {player && (
            <NotificationBell
              playerId={player.id}
              onChallengeClick={(challengeId) => {
                setCurrentView('challenge');
              }}
            />
          )}
        </div>
      </header>

      <nav className="navigation">
        <button onClick={() => setCurrentView('home')} className={currentView === 'home' ? 'active' : ''}>
          Home
        </button>
        <button onClick={() => setCurrentView('creator')} className={currentView === 'creator' ? 'active' : ''}>
          Create Card
        </button>
        <button onClick={() => setCurrentView('collection')} className={currentView === 'collection' ? 'active' : ''}>
          Collection ({playerCards.length})
        </button>
        <button onClick={() => setCurrentView('deck-builder')} className={currentView === 'deck-builder' ? 'active' : ''}>
          Deck ({player?.deck?.length || 0}/10)
        </button>
        <button onClick={() => setCurrentView('shop')} className={currentView === 'shop' ? 'active' : ''}>
          Shop
        </button>
        <button onClick={() => setCurrentView('challenge')} className={currentView === 'challenge' ? 'active' : ''}>
          Battle Arena
        </button>
        <button onClick={() => setCurrentView('leaderboard')} className={currentView === 'leaderboard' ? 'active' : ''}>
          Leaderboard
        </button>
      </nav>

      {error && <div className="error">{error}</div>}

      <main className="main-content">
        {currentView === 'home' && (
          <div className="home">
            <h2>Welcome, <span className="player-name-display large epic">{player.name}</span>!</h2>
            <p>You have {player.coins} coins and {playerCards.length} cards.</p>
            <div className="quick-actions">
              <button onClick={() => setCurrentView('creator')}>Create a Card (50 coins)</button>
              <button onClick={() => setCurrentView('shop')}>Buy Card Packs</button>
              <button onClick={() => setCurrentView('challenge')}>Battle Arena</button>
            </div>
          </div>
        )}

        {currentView === 'creator' && (
          <CardCreator
            playerId={player.id}
            coins={player.coins}
            onCardCreated={handleCardCreated}
          />
        )}

        {currentView === 'collection' && (
          <div className="collection">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>Your Collection</h2>
              <select
                value={collectionSortBy}
                onChange={(e) => setCollectionSortBy(e.target.value as typeof collectionSortBy)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '5px',
                  border: '1px solid #ddd',
                  fontSize: '14px',
                  cursor: 'pointer'
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
            {playerCards.length === 0 ? (
              <p>No cards yet. Create or buy some!</p>
            ) : (
              <div className="cards-grid">
                {(() => {
                  // Don't group cards - show each variant separately
                  const individualCards = playerCards;

                  // Sort the cards (skip sorting for 'latest' since backend already sorts by acquired_at DESC)
                  const sortedCards = collectionSortBy === 'latest'
                    ? [...individualCards]  // Use original order from backend
                    : [...individualCards].sort((a, b) => {
                        const cardA = a;
                        const cardB = b;

                        if (collectionSortBy === 'strength') return cardB.abilities.strength - cardA.abilities.strength;
                        if (collectionSortBy === 'speed') return cardB.abilities.speed - cardA.abilities.speed;
                        if (collectionSortBy === 'agility') return cardB.abilities.agility - cardA.abilities.agility;
                        if (collectionSortBy === 'rarity') {
                          const rarityOrder: Record<string, number> = { rare: 3, uncommon: 2, common: 1 };
                          return (rarityOrder[cardB.rarity] || 0) - (rarityOrder[cardA.rarity] || 0);
                        }
                        // Default: sort by total stats
                        const totalA = cardA.abilities.strength + cardA.abilities.speed + cardA.abilities.agility;
                        const totalB = cardB.abilities.strength + cardB.abilities.speed + cardB.abilities.agility;
                        return totalB - totalA;
                      });

                  return sortedCards.map((card) => (
                    <CardComponent key={card.id} card={card} />
                  ));
                })()}
              </div>
            )}
          </div>
        )}

        {currentView === 'shop' && (
          <div className="shop">
            <h2>Card Shop</h2>
            <div className="packs">
              <div className="pack">
                <h3>Basic Pack</h3>
                <p>5 random cards</p>
                <p className="price">100 coins</p>
                <button
                  onClick={() => handleBuyPack('basic-pack')}
                  disabled={player.coins < 100}
                >
                  Buy Pack
                </button>
              </div>
              <div className="pack">
                <h3>Premium Pack</h3>
                <p>5 cards with guaranteed uncommon+</p>
                <p className="price">250 coins</p>
                <button
                  onClick={() => handleBuyPack('premium-pack')}
                  disabled={player.coins < 250}
                >
                  Buy Pack
                </button>
              </div>
            </div>
          </div>
        )}

        {currentView === 'deck-builder' && (
          <DeckBuilder
            player={player}
            playerCards={playerCards}
            onDeckUpdate={handleDeckUpdate}
          />
        )}


        {currentView === 'pack-opening' && packCards.length > 0 && (
          <PackOpening
            cards={packCards}
            onComplete={handlePackOpeningComplete}
          />
        )}

        {currentView === 'challenge' && (
          <Challenge
            player={player}
            onUpdate={() => {
              // Refresh player data if needed
              loadPlayer(player.id);
            }}
          />
        )}

        {currentView === 'leaderboard' && (
          <Leaderboard currentPlayerId={player.id} />
        )}
      </main>
    </div>
  );
}

export default App;
