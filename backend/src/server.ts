import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';

import playerRoutes from './routes/players';
import cardRoutes from './routes/cards';
import battleRoutes from './routes/battles';
import shopRoutes from './routes/shop';
import notificationRoutes from './routes/notifications';
import challengeRoutes from './routes/challenges';
import leaderboardRoutes from './routes/leaderboard';
import imageRoutes from './routes/images';
import rewardRoutes from './routes/rewards';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8000;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/players', playerRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/battles', battleRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/images/card_images', imageRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0' as any, () => {
  console.log(`Battle Card Game server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Network access: http://0.0.0.0:${PORT}/api/health`);
});