import React, { useState, useEffect } from 'react';
import { leaderboardAPI } from '../services/api';
import './Leaderboard.css';

interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  rating: number;
  pvpWins: number;
  pvpLosses: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  lastActive?: string;
}

interface LeaderboardProps {
  currentPlayerId?: string;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ currentPlayerId }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [playerRank, setPlayerRank] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadLeaderboard();
  }, []);

  useEffect(() => {
    if (currentPlayerId) {
      loadPlayerRank();
    }
  }, [currentPlayerId]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const data = await leaderboardAPI.getLeaderboard(50);
      setEntries(data);
    } catch (err) {
      setError('Failed to load leaderboard');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadPlayerRank = async () => {
    if (!currentPlayerId) return;
    try {
      const rank = await leaderboardAPI.getPlayerRank(currentPlayerId);
      setPlayerRank(rank);
    } catch (err) {
      console.error('Failed to load player rank:', err);
    }
  };

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${rank}`;
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 1500) return 'rating-master';
    if (rating >= 1300) return 'rating-expert';
    if (rating >= 1100) return 'rating-advanced';
    if (rating >= 900) return 'rating-intermediate';
    return 'rating-beginner';
  };

  const formatLastActive = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  if (loading) {
    return (
      <div className="leaderboard-container">
        <div className="loading">Loading leaderboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="leaderboard-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-header">
        <h1>🏆 Leaderboard</h1>
        <p className="subtitle">Top PvP Players</p>
      </div>

      {playerRank && !entries.find(e => e.id === currentPlayerId) && (
        <div className="player-rank-card">
          <div className="rank-info">
            <span className="your-rank">Your Rank:</span>
            <span className="rank-number">{getRankBadge(playerRank.rank)}</span>
            <span className="rank-details">
              Rating: {playerRank.rating} | W/L: {playerRank.pvpWins}/{playerRank.pvpLosses}
            </span>
          </div>
        </div>
      )}

      <div className="leaderboard-table">
        <div className="table-header">
          <div className="col-rank">Rank</div>
          <div className="col-player">Player</div>
          <div className="col-rating">Rating</div>
          <div className="col-wins">Wins</div>
          <div className="col-losses">Losses</div>
          <div className="col-winrate">Win Rate</div>
          <div className="col-active">Last Active</div>
        </div>

        <div className="table-body">
          {entries.map((entry, index) => (
            <div
              key={entry.id}
              className={`table-row ${entry.id === currentPlayerId ? 'current-player' : ''} ${
                index < 3 ? 'top-three' : ''
              }`}
            >
              <div className="col-rank">
                <span className="rank-badge">{getRankBadge(entry.rank)}</span>
              </div>
              <div className="col-player">
                <span className="player-name">{entry.name}</span>
                {entry.id === currentPlayerId && (
                  <span className="you-badge">YOU</span>
                )}
              </div>
              <div className="col-rating">
                <span className={`rating ${getRatingColor(entry.rating)}`}>
                  {entry.rating}
                </span>
              </div>
              <div className="col-wins">
                <span className="wins">{entry.pvpWins}</span>
              </div>
              <div className="col-losses">
                <span className="losses">{entry.pvpLosses}</span>
              </div>
              <div className="col-winrate">
                <div className="winrate-bar">
                  <div
                    className="winrate-fill"
                    style={{ width: `${entry.winRate}%` }}
                  />
                  <span className="winrate-text">{entry.winRate}%</span>
                </div>
              </div>
              <div className="col-active">
                <span className="last-active">
                  {formatLastActive(entry.lastActive)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="leaderboard-footer">
        <div className="rating-legend">
          <h3>Rating Tiers</h3>
          <div className="tier-list">
            <div className="tier">
              <span className="tier-badge rating-master">●</span>
              <span>Master (1500+)</span>
            </div>
            <div className="tier">
              <span className="tier-badge rating-expert">●</span>
              <span>Expert (1300-1499)</span>
            </div>
            <div className="tier">
              <span className="tier-badge rating-advanced">●</span>
              <span>Advanced (1100-1299)</span>
            </div>
            <div className="tier">
              <span className="tier-badge rating-intermediate">●</span>
              <span>Intermediate (900-1099)</span>
            </div>
            <div className="tier">
              <span className="tier-badge rating-beginner">●</span>
              <span>Beginner (&lt; 900)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;