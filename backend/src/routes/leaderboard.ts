import { Router, Request, Response } from 'express';
import { gameStore } from '../data/store';

const router = Router();

// Get leaderboard
router.get('/', (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
  const players = gameStore.getLeaderboard(limit);

  const leaderboard = players.map((player, index) => ({
    rank: index + 1,
    id: player.id,
    name: player.name,
    rating: player.rating || 1000,
    pvpWins: player.pvpWins || 0,
    pvpLosses: player.pvpLosses || 0,
    totalWins: player.wins,
    totalLosses: player.losses,
    winRate: player.pvpWins && player.pvpLosses
      ? Math.round((player.pvpWins / (player.pvpWins + player.pvpLosses)) * 100)
      : 0,
    lastActive: player.lastActive
  }));

  res.json(leaderboard);
});

// Get player's rank
router.get('/player/:playerId', (req: Request, res: Response) => {
  const { playerId } = req.params;
  const leaderboard = gameStore.getLeaderboard(1000); // Get more players to find rank

  const playerIndex = leaderboard.findIndex(p => p.id === playerId);

  if (playerIndex === -1) {
    return res.status(404).json({ error: 'Player not found in leaderboard' });
  }

  const player = leaderboard[playerIndex];

  res.json({
    rank: playerIndex + 1,
    id: player.id,
    name: player.name,
    rating: player.rating || 1000,
    pvpWins: player.pvpWins || 0,
    pvpLosses: player.pvpLosses || 0,
    totalPlayers: leaderboard.length
  });
});

export default router;