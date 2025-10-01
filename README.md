# Battle Card Game 🎮⚔️

A medieval-themed card battle game where players collect cards, build decks, and challenge opponents in strategic turn-based combat. Features AI-generated cards with unique abilities, titles, and critical hit mechanics.

## Features

- **Card Collection System**: Collect battle cards and tool cards through card packs
- **Deck Building**: Build a deck of 10 cards from your collection
- **Turn-Based Combat**: Strategic battles using Strength, Speed, and Agility stats
- **AI Opponents**: Challenge AI players with varying difficulty levels
- **Card Titles & Modifiers**: Cards can have titles that modify their stats
- **Tool Cards**: Special cards that enhance your battle cards with bonuses
- **Critical Hits**: Some cards have critical hit chances for bonus damage
- **Player Progression**: Earn coins, level up, and climb the leaderboard
- **Multiplayer**: Challenge other players in PvP battles
- **AI Card Generation**: Generate new unique cards using AI

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)

### Installation & Running

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd battle-card-game
   ```

2. **Start the application**
   ```bash
   ./start.sh
   ```

   The script will:
   - Check and install dependencies automatically
   - Start both backend and frontend servers
   - Display your local network IP address
   - Show all access URLs

3. **Access the game**
   - Local: http://localhost:3000
   - Network: http://YOUR_IP:3000 (shown in the startup output)

4. **Stop the servers**
   ```bash
   ./stop.sh
   ```
   Or press `Ctrl+C` in the terminal running `start.sh`

## Manual Setup (Alternative)

If you prefer to run the servers separately:

### Backend

```bash
cd backend
npm install
npm start
```

The backend server will run on http://localhost:8000

### Frontend

```bash
cd frontend
npm install
npm start
```

The frontend will run on http://localhost:3000

## Project Structure

```
battle-card-game/
├── backend/              # Node.js/Express API server
│   ├── src/
│   │   ├── routes/      # API endpoints
│   │   ├── data/        # Database and data store
│   │   └── server.ts    # Main server file
│   ├── game.db          # SQLite database
│   └── uploads/         # Card images
│
├── frontend/            # React application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── services/    # API services
│   │   └── App.tsx      # Main app component
│   └── public/
│
├── start.sh             # Start all servers
├── stop.sh              # Stop all servers
└── README.md            # This file
```

## Database

The game uses SQLite for data storage. The database file is located at:
- `backend/game.db`

All database operations go through:
- `backend/src/data/database.ts` - Database schema and queries
- `backend/src/data/dbStore.ts` - Data access layer

Database backups are created with timestamp suffixes (e.g., `game.db.backup.TIMESTAMP`)

## API Endpoints

The backend exposes the following API endpoints on port 8000:

- `/api/players` - Player management
- `/api/cards` - Card operations
- `/api/battles` - Battle system
- `/api/shop` - Card packs and purchases
- `/api/challenges` - Challenge system
- `/api/leaderboard` - Rankings
- `/api/rewards` - Daily rewards
- `/api/tools` - Tool card management
- `/api/health` - Health check endpoint

## Gameplay

### Getting Started

1. **Create a Player**: Enter your name to create a new player profile
2. **Buy Packs**: Purchase card packs with coins (100 coins per pack)
3. **Build Your Deck**: Go to Deck Builder and select 10 cards for battle
4. **Challenge Opponents**: Battle against AI or other players
5. **Earn Rewards**: Win battles to earn coins and experience

### Card Types

**Battle Cards**
- Have three stats: Strength (STR), Speed (SPD), Agility (AGL)
- Can have titles that modify stats (shown in green for bonus, red for penalty)
- Some cards have critical hit chances
- Total stats determine card power

**Tool Cards**
- Provide bonuses to battle cards
- Five types: Sledge Hammer, Running Shoes, Lube Tube, Binoculars, Spear
- Cannot be used in battle deck (battle cards only)
- Applied before battles for strategic advantages

### Battle System

1. **Select 3 Cards**: Choose 3 cards from your deck for the round
2. **Dice Roll**: Both players roll dice to determine combat multipliers
3. **Stat Comparison**: Cards fight based on STR, SPD, and AGL
4. **Critical Hits**: Cards with crit chance can deal bonus damage
5. **Win Condition**: Best of 3 rounds wins the battle

### Card Stats Display

- **Green numbers**: Stats increased by titles or modifiers
- **Red numbers**: Stats decreased by titles or modifiers
- **Black numbers**: Base stats with no modifiers

## Development

### Technologies Used

**Backend**
- Node.js + Express
- TypeScript
- SQLite (better-sqlite3)
- Multer (file uploads)

**Frontend**
- React + TypeScript
- CSS3 with Google Fonts (Cinzel, Crimson Text)
- Fetch API for backend communication

### Adding New Cards

Use the Card Creator in the admin panel to:
1. Generate AI cards with unique names and stats
2. Upload custom card images
3. Assign rarities (common, uncommon, rare)
4. Set critical hit chances
5. Add card titles and modifiers

## Troubleshooting

### Port Already in Use

If you get port conflicts:
```bash
./stop.sh
./start.sh
```

### Dependencies Issues

If you encounter dependency problems:
```bash
cd backend && rm -rf node_modules package-lock.json && npm install
cd ../frontend && rm -rf node_modules package-lock.json && npm install
```

### View Logs

Check server logs for debugging:
```bash
tail -f backend.log
tail -f frontend.log
```

### Database Issues

If you need to reset the database:
```bash
cd backend
rm game.db
npm start  # Will recreate database
```

## Network Play

To play with others on your local network:

1. Start the application with `./start.sh`
2. Note the Network IP shown in the output (e.g., 192.168.1.x)
3. Share the network URL with other players: `http://YOUR_IP:3000`
4. All players on the same network can now access the game

**Note**: Make sure your firewall allows connections on ports 3000 and 8000.

## Contributing

This is a personal project, but suggestions and bug reports are welcome!

## License

All rights reserved.
