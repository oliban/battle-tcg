import { Player, Card, Battle, Pack, Notification, Challenge, BattleRound, Tool, PlayerTool, BattleToolUsage } from '../models/types';
import { gameDb } from './database';
import { saveImageToDiskSync, deleteImageFromDisk } from '../utils/imageUtils';

class DbStore {
  private packs: Pack[] = [
    {
      id: 'basic-pack',
      name: 'Basic Pack',
      description: '4 random cards from the community pool',
      price: 100,
      cardCount: 4
    },
    {
      id: 'premium-pack',
      name: 'Premium Pack',
      description: '4 cards with guaranteed uncommon or better',
      price: 250,
      cardCount: 4,
      guaranteedRarity: 'uncommon'
    }
  ];

  createPlayer(name: string): Player {
    const player: Player = {
      id: `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      coins: 200,
      cards: [],
      deck: [],
      wins: 0,
      losses: 0,
      rating: 1000
    };

    gameDb.queries.insertPlayer.run(player.id, player.name, player.coins, player.rating);

    // Give starter tools to new player
    this.givePlayerTool(player.id, 'running-shoes', 1);
    this.givePlayerTool(player.id, 'sledge-hammer', 1);
    this.givePlayerTool(player.id, 'lube-tube', 1);
    this.givePlayerTool(player.id, 'spear', 1);
    this.givePlayerTool(player.id, 'binoculars', 1);

    console.log('[DbStore] Created player with starter tools:', player.id);
    return player;
  }

  getPlayer(id: string): Player | undefined {
    const row = gameDb.queries.getPlayer.get(id);
    if (!row) return undefined;

    // Get player's cards
    const cards = gameDb.connection.prepare(
      'SELECT card_id FROM player_cards WHERE player_id = ?'
    ).all(id).map((r: any) => r.card_id);

    // Get player's deck
    const deck = gameDb.queries.getPlayerDeck.all(id).map((r: any) => r.card_id);

    // Get player stats from view
    const stats = gameDb.queries.getPlayerStats.get(id) || {
      total_wins: 0,
      total_losses: 0,
      pvp_wins: 0,
      pvp_losses: 0
    };

    // Get player's tools
    const tools = this.getPlayerTools(id);

    return {
      id: row.id,
      name: row.name,
      coins: row.coins,
      cards,
      deck,
      tools,
      wins: stats.total_wins,
      losses: stats.total_losses,
      pvpWins: stats.pvp_wins,
      pvpLosses: stats.pvp_losses,
      rating: row.rating,
      lastActive: row.last_active ? new Date(row.last_active) : undefined
    };
  }

  getPlayerByName(name: string): Player | undefined {
    const row = gameDb.queries.getPlayerByName.get(name);
    if (!row) return undefined;
    return this.getPlayer(row.id);
  }

  updatePlayer(id: string, updates: Partial<Player>): Player | undefined {
    console.log('[DbStore] Updating player:', id);
    const player = this.getPlayer(id);
    if (!player) {
      console.error('[DbStore] Player not found for update:', id);
      return undefined;
    }

    // Update basic fields
    if (updates.coins !== undefined || updates.rating !== undefined) {
      gameDb.queries.updatePlayer.run(
        updates.coins ?? player.coins,
        updates.rating ?? player.rating,
        id
      );
    }

    // Update deck if provided
    if (updates.deck) {
      gameDb.transaction(() => {
        gameDb.queries.clearPlayerDeck.run(id);
        updates.deck!.forEach((cardId, position) => {
          gameDb.queries.addCardToDeck.run(id, cardId, position);
        });
      });
    }

    // Update cards if provided
    if (updates.cards) {
      const currentCards = new Set(player.cards);
      const updatedCards = new Set(updates.cards);

      // Clear existing cards and add all cards from the update
      gameDb.transaction(() => {
        console.log('[DbStore] Updating player cards for player:', id);

        // First, remove all current card associations
        gameDb.connection.prepare('DELETE FROM player_cards WHERE player_id = ?').run(id);

        // Then add all cards from the update with incrementing timestamps to maintain order
        let index = 0;
        const baseTime = Date.now();
        for (const cardId of updatedCards) {
          // Check if card exists before inserting
          const cardExists = gameDb.connection.prepare('SELECT id FROM cards WHERE id = ?').get(cardId);
          if (!cardExists) {
            console.error('[DbStore] Card does not exist, skipping:', cardId);
            continue;
          }

          // Add 1 second increments to ensure different timestamps for proper sorting
          const timestamp = new Date(baseTime + (index * 1000)).toISOString();
          console.log('[DbStore] Adding card to player:', { playerId: id, cardId, timestamp });

          // Use direct SQL with explicit timestamp
          gameDb.connection.prepare(
            'INSERT OR IGNORE INTO player_cards (player_id, card_id, acquired_at) VALUES (?, ?, ?)'
          ).run(id, cardId, timestamp);
          index++;
        }
      });
    }

    return this.getPlayer(id);
  }

  createCard(card: Card): Card {
    // Handle image URL processing
    let imageFileName = card.imageUrl || null;

    if (imageFileName) {
      // Tool cards: keep the full /images/tools/ path
      if (card.cardType === 'tool' && imageFileName.startsWith('/images/tools/')) {
        // Keep the full path as-is for tool cards
        imageFileName = imageFileName;
      } else {
        // Check if this is a variant card (ID contains underscore and timestamp)
        const isVariant = card.id.includes('_') && card.id.match(/_\d{13}_/);

        if (isVariant) {
          // For variant cards, extract the base card ID and use its image
          const baseCardId = card.id.split('_')[0];

          // If the imageUrl already points to the base card image, extract just the filename
          if (imageFileName.includes(baseCardId)) {
            // Keep the original extension from the imageUrl
            const extension = imageFileName.split('.').pop() || 'png';
            imageFileName = `${baseCardId}.${extension}`;
          } else if (imageFileName.startsWith('/images/card_images/')) {
            // Extract just the filename from the path
            imageFileName = imageFileName.replace('/images/card_images/', '');
          }
        } else if (imageFileName.startsWith('data:image')) {
          // If it's base64 for a base card, save to disk synchronously
          // For now, we'll save without conversion to avoid async issues
          imageFileName = saveImageToDiskSync(imageFileName, card.id);
        } else if (imageFileName.startsWith('http://') || imageFileName.startsWith('https://')) {
          // If it has any full URL, extract just the filename
          const matches = imageFileName.match(/\/([^\/]+)$/);
          imageFileName = matches ? matches[1] : imageFileName;
        } else if (imageFileName.startsWith('/api/images/')) {
          // If it has the old API path, extract just the filename
          imageFileName = imageFileName.replace('/api/images/', '');
        } else if (imageFileName.startsWith('/images/card_images/')) {
          // If it has the full card images path, extract just the filename
          imageFileName = imageFileName.replace('/images/card_images/', '');
        } else if (imageFileName.startsWith('/images/')) {
          // If it has the images path, extract just the filename
          imageFileName = imageFileName.replace('/images/', '');
        }
      }
    }

    gameDb.queries.insertCard.run(
      card.id,
      card.name,
      card.title || null,
      card.fullName || null,
      card.description,
      imageFileName,
      card.cardType || 'battle',
      card.toolId || null,
      card.abilities.strength,
      card.abilities.speed,
      card.abilities.agility,
      card.baseAbilities?.strength || card.abilities.strength,
      card.baseAbilities?.speed || card.abilities.speed,
      card.baseAbilities?.agility || card.abilities.agility,
      card.titleModifiers?.strength || 0,
      card.titleModifiers?.speed || 0,
      card.titleModifiers?.agility || 0,
      card.criticalHitChance || 0,
      card.rarity,
      card.createdBy
    );

    console.log('[DbStore] Created card:', card.id);
    return card;
  }

  getCard(id: string): Card | undefined {
    const row = gameDb.queries.getCard.get(id);
    if (!row) return undefined;

    return this.rowToCard(row);
  }

  getAllCards(): Card[] {
    const rows = gameDb.queries.getAllCards.all();
    return rows.map((row: any) => this.rowToCard(row));
  }

  getPlayerCards(playerId: string): Card[] {
    const rows = gameDb.queries.getPlayerCards.all(playerId);
    return rows.map((row: any) => this.rowToCard(row));
  }

  getAllPlayers(): Player[] {
    const rows = gameDb.queries.getAllPlayers.all();
    return rows.map((row: any) => this.getPlayer(row.id)!).filter(Boolean);
  }

  deleteCard(id: string): boolean {
    try {
      // First, get the card to delete its image file
      const card = this.getCard(id);

      // Remove the card from all players' collections and decks
      gameDb.connection.prepare('DELETE FROM player_cards WHERE card_id = ?').run(id);
      gameDb.connection.prepare('DELETE FROM player_decks WHERE card_id = ?').run(id);

      // Delete the card itself
      const result = gameDb.connection.prepare('DELETE FROM cards WHERE id = ?').run(id);

      // If card was deleted and had an image file, delete it from disk
      if (result.changes > 0 && card?.imageUrl && !card.imageUrl.startsWith('data:') && !card.imageUrl.startsWith('/api/')) {
        deleteImageFromDisk(card.imageUrl);
      }

      return result.changes > 0;
    } catch (error) {
      console.error('[dbStore] Error deleting card:', error);
      return false;
    }
  }

  createBattle(battle: Battle): Battle {
    console.log('[DbStore] Creating battle with player2Id:', battle.player2Id);

    // First, verify all cards exist
    if (battle.player1Cards) {
      for (const cardId of battle.player1Cards) {
        const card = this.getCard(cardId);
        if (!card) {
          console.error('[DbStore] Player1 card not found:', cardId);
          throw new Error(`Player1 card not found: ${cardId}`);
        }
      }
    }

    if (battle.player2Cards) {
      for (const cardId of battle.player2Cards) {
        const card = this.getCard(cardId);
        if (!card) {
          console.error('[DbStore] Player2 card not found:', cardId);
          throw new Error(`Player2 card not found: ${cardId}`);
        }
      }
    }

    try {
      gameDb.queries.insertBattle.run(
        battle.id,
        battle.player1Id,
        battle.player2Id || null,
        battle.player1Name || null,
        battle.player2Name || null,
        battle.isSimulation ? 1 : 0,
        battle.status,
        battle.firstRoundAbility || 'strength' // Default to strength for now
      );
    } catch (error) {
      console.error('[DbStore] Failed to insert battle:', error);
      throw error;
    }

    // Store battle cards if provided
    if (battle.player1Cards && battle.player1Cards.length > 0) {
      battle.player1Cards.forEach((cardId, position) => {
        try {
          const stmt = gameDb.connection.prepare(`
            INSERT INTO battle_cards (battle_id, player, card_id, position, play_order)
            VALUES (?, 1, ?, ?, ?)
          `);
          stmt.run(battle.id, cardId, position, battle.player1Order?.[position] ?? null);
        } catch (error) {
          console.error('[DbStore] Failed to insert player1 battle card:', cardId, error);
          throw error;
        }
      });
    }

    if (battle.player2Cards && battle.player2Cards.length > 0) {
      battle.player2Cards.forEach((cardId, position) => {
        try {
          const stmt = gameDb.connection.prepare(`
            INSERT INTO battle_cards (battle_id, player, card_id, position, play_order)
            VALUES (?, 2, ?, ?, ?)
          `);
          stmt.run(battle.id, cardId, position, battle.player2Order?.[position] ?? null);
        } catch (error) {
          console.error('[DbStore] Failed to insert player2 battle card:', cardId, error);
          throw error;
        }
      });
    }

    console.log('[DbStore] Created battle:', battle.id);
    return battle;
  }

  getBattle(id: string): Battle | undefined {
    const row = gameDb.queries.getBattle.get(id);
    if (!row) return undefined;

    // Get battle cards
    const battleCards = gameDb.connection.prepare(`
      SELECT * FROM battle_cards WHERE battle_id = ? ORDER BY player, position
    `).all(id);

    const player1Cards: string[] = [];
    const player2Cards: string[] = [];
    const player1Order: number[] = [];
    const player2Order: number[] = [];

    battleCards.forEach((bc: any) => {
      if (bc.player === 1) {
        player1Cards[bc.position] = bc.card_id;
        if (bc.play_order !== null) player1Order[bc.position] = bc.play_order;
      } else {
        player2Cards[bc.position] = bc.card_id;
        if (bc.play_order !== null) player2Order[bc.position] = bc.play_order;
      }
    });

    // Get battle rounds
    const rounds = gameDb.connection.prepare(`
      SELECT * FROM battle_rounds WHERE battle_id = ? ORDER BY round_number
    `).all(id);

    return {
      id: row.id,
      player1Id: row.player1_id,
      player2Id: row.player2_id,
      player1Name: row.player1_name,
      player2Name: row.player2_name,
      isSimulation: Boolean(row.is_simulation),
      firstRoundAbility: row.first_round_ability || 'strength',
      player1Deck: [], // Would need to query from battle creation time
      player2Deck: [],
      player1Cards,
      player2Cards,
      player1Order: player1Order.length > 0 ? player1Order : undefined,
      player2Order: player2Order.length > 0 ? player2Order : undefined,
      rounds: rounds.map((r: any) => ({
        roundNumber: r.round_number,
        player1CardId: r.player1_card_id,
        player2CardId: r.player2_card_id,
        ability: r.ability,
        player1Roll: r.player1_roll,
        player2Roll: r.player2_roll,
        player1StatValue: r.player1_stat_value,
        player2StatValue: r.player2_stat_value,
        player1BaseStatValue: r.player1_base_stat_value,
        player2BaseStatValue: r.player2_base_stat_value,
        player1ToolBonus: r.player1_tool_bonus,
        player2ToolBonus: r.player2_tool_bonus,
        player1ToolName: r.player1_tool_name,
        player2ToolName: r.player2_tool_name,
        player1Total: r.player1_total,
        player2Total: r.player2_total,
        damageDealt: r.damage_dealt,
        winner: r.winner,
        player1CriticalHit: r.player1_critical_hit === 1,
        player2CriticalHit: r.player2_critical_hit === 1
      })),
      currentRound: rounds.length,
      player1Points: row.player1_points,
      player2Points: row.player2_points,
      player1TotalDamage: row.player1_total_damage,
      player2TotalDamage: row.player2_total_damage,
      winner: row.winner_id,
      winReason: row.win_reason,
      status: row.status,
      createdAt: new Date(row.created_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined
    };
  }

  updateBattle(id: string, updates: Partial<Battle>): Battle | undefined {
    const battle = this.getBattle(id);
    if (!battle) return undefined;

    // Update main battle fields
    gameDb.queries.updateBattle.run(
      updates.player1Points ?? battle.player1Points,
      updates.player2Points ?? battle.player2Points,
      updates.player1TotalDamage ?? battle.player1TotalDamage,
      updates.player2TotalDamage ?? battle.player2TotalDamage,
      updates.winner ?? battle.winner ?? null,
      updates.winReason ?? battle.winReason ?? null,
      updates.status ?? battle.status,
      updates.status ?? battle.status, // For completed_at trigger
      id
    );

    // Update play order if provided
    if (updates.player1Order) {
      updates.player1Order.forEach((order, position) => {
        const stmt = gameDb.connection.prepare(`
          UPDATE battle_cards SET play_order = ?
          WHERE battle_id = ? AND player = 1 AND position = ?
        `);
        stmt.run(order, id, position);
      });
    }

    if (updates.player2Order) {
      updates.player2Order.forEach((order, position) => {
        const stmt = gameDb.connection.prepare(`
          UPDATE battle_cards SET play_order = ?
          WHERE battle_id = ? AND player = 2 AND position = ?
        `);
        stmt.run(order, id, position);
      });
    }

    // Insert new rounds if provided
    if (updates.rounds && updates.rounds.length > battle.rounds.length) {
      const newRounds = updates.rounds.slice(battle.rounds.length);
      const stmt = gameDb.connection.prepare(`
        INSERT INTO battle_rounds (
          battle_id, round_number, player1_card_id, player2_card_id,
          ability, player1_roll, player2_roll,
          player1_stat_value, player2_stat_value,
          player1_total, player2_total, damage_dealt, winner,
          player1_critical_hit, player2_critical_hit,
          player1_base_stat_value, player2_base_stat_value,
          player1_tool_bonus, player2_tool_bonus,
          player1_tool_name, player2_tool_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      newRounds.forEach((round: BattleRound) => {
        // Store the full card IDs (including instance suffixes)
        stmt.run(
          id, round.roundNumber,
          round.player1CardId, round.player2CardId,
          round.ability, round.player1Roll, round.player2Roll,
          round.player1StatValue, round.player2StatValue,
          round.player1Total, round.player2Total,
          round.damageDealt, round.winner,
          round.player1CriticalHit ? 1 : 0,
          round.player2CriticalHit ? 1 : 0,
          round.player1BaseStatValue || null,
          round.player2BaseStatValue || null,
          round.player1ToolBonus || null,
          round.player2ToolBonus || null,
          round.player1ToolName || null,
          round.player2ToolName || null
        );
      });
    }

    return this.getBattle(id);
  }

  getPlayerBattles(playerId: string): Battle[] {
    const rows = gameDb.queries.getPlayerBattles.all(playerId, playerId);
    return rows.map((row: any) => this.getBattle(row.id)!).filter(Boolean);
  }

  createChallenge(challenge: Partial<Challenge>): Challenge {
    const id = `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullChallenge: Challenge = {
      id,
      challengerId: challenge.challengerId!,
      challengerName: challenge.challengerName!,
      challengedId: challenge.challengedId!,
      challengedName: challenge.challengedName!,
      status: challenge.status || 'pending',
      firstRoundAbility: challenge.firstRoundAbility!,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };

    gameDb.queries.insertChallenge.run(
      fullChallenge.id,
      fullChallenge.challengerId,
      fullChallenge.challengerName,
      fullChallenge.challengedId,
      fullChallenge.challengedName,
      fullChallenge.status,
      fullChallenge.firstRoundAbility
    );

    return fullChallenge;
  }

  getChallenge(id: string): Challenge | undefined {
    const row = gameDb.queries.getChallenge.get(id);
    if (!row) return undefined;

    // Get challenge cards if any
    const challengeCards = gameDb.connection.prepare(`
      SELECT * FROM challenge_cards WHERE challenge_id = ? ORDER BY player_type, position
    `).all(id);

    const challengerCards: string[] = [];
    const challengedCards: string[] = [];
    const challengerOrder: number[] = [];
    const challengedOrder: number[] = [];

    challengeCards.forEach((cc: any) => {
      if (cc.player_type === 'challenger') {
        challengerCards[cc.position] = cc.card_id;
        if (cc.play_order !== null) challengerOrder[cc.position] = cc.play_order;
      } else {
        challengedCards[cc.position] = cc.card_id;
        if (cc.play_order !== null) challengedOrder[cc.position] = cc.play_order;
      }
    });

    return {
      id: row.id,
      challengerId: row.challenger_id,
      challengerName: row.challenger_name,
      challengedId: row.challenged_id,
      challengedName: row.challenged_name,
      status: row.status,
      firstRoundAbility: row.first_round_ability,
      challengerCards: challengerCards.length > 0 ? challengerCards : undefined,
      challengerOrder: challengerOrder.length > 0 ? challengerOrder : undefined,
      challengerTools: row.challenger_tools ? JSON.parse(row.challenger_tools) : undefined,
      challengedCards: challengedCards.length > 0 ? challengedCards : undefined,
      challengedOrder: challengedOrder.length > 0 ? challengedOrder : undefined,
      challengedTools: row.challenged_tools ? JSON.parse(row.challenged_tools) : undefined,
      battleId: row.battle_id,
      createdAt: new Date(row.created_at),
      expiresAt: new Date(row.expires_at)
    };
  }

  updateChallenge(id: string, updates: Partial<Challenge>): Challenge | undefined {
    const challenge = this.getChallenge(id);
    if (!challenge) return undefined;

    if (updates.status || updates.battleId || updates.challengerTools || updates.challengedTools) {
      // Update challenge with status, battleId, and tools
      const stmt = gameDb.connection.prepare(`
        UPDATE challenges
        SET status = ?,
            battle_id = ?,
            challenger_tools = CASE WHEN ? IS NOT NULL THEN ? ELSE challenger_tools END,
            challenged_tools = CASE WHEN ? IS NOT NULL THEN ? ELSE challenged_tools END
        WHERE id = ?
      `);

      stmt.run(
        updates.status ?? challenge.status,
        updates.battleId ?? challenge.battleId ?? null,
        updates.challengerTools ? 1 : null,
        updates.challengerTools ? JSON.stringify(updates.challengerTools) : null,
        updates.challengedTools ? 1 : null,
        updates.challengedTools ? JSON.stringify(updates.challengedTools) : null,
        id
      );
    }

    // Update challenge cards if provided
    if (updates.challengerCards && updates.challengerOrder) {
      gameDb.transaction(() => {
        // Clear existing challenger cards
        gameDb.connection.prepare(
          'DELETE FROM challenge_cards WHERE challenge_id = ? AND player_type = ?'
        ).run(id, 'challenger');

        // Insert new cards
        const stmt = gameDb.connection.prepare(`
          INSERT INTO challenge_cards (challenge_id, player_type, card_id, position, play_order)
          VALUES (?, 'challenger', ?, ?, ?)
        `);

        updates.challengerCards!.forEach((cardId, position) => {
          stmt.run(id, cardId, position, updates.challengerOrder![position]);
        });
      });
    }

    if (updates.challengedCards && updates.challengedOrder) {
      gameDb.transaction(() => {
        // Clear existing challenged cards
        gameDb.connection.prepare(
          'DELETE FROM challenge_cards WHERE challenge_id = ? AND player_type = ?'
        ).run(id, 'challenged');

        // Insert new cards
        const stmt = gameDb.connection.prepare(`
          INSERT INTO challenge_cards (challenge_id, player_type, card_id, position, play_order)
          VALUES (?, 'challenged', ?, ?, ?)
        `);

        updates.challengedCards!.forEach((cardId, position) => {
          stmt.run(id, cardId, position, updates.challengedOrder![position]);
        });
      });
    }

    return this.getChallenge(id);
  }

  getPlayerChallenges(playerId: string): { incoming: Challenge[], outgoing: Challenge[] } {
    const allChallenges = gameDb.queries.getPlayerChallenges.all(playerId, playerId);

    const challenges = allChallenges.map((row: any) => this.getChallenge(row.id)!).filter(Boolean);

    return {
      incoming: challenges.filter((c: Challenge) => c.challengedId === playerId),
      outgoing: challenges.filter((c: Challenge) => c.challengerId === playerId)
    };
  }

  getActiveChallenges(playerId: string): Challenge[] {
    const { incoming, outgoing } = this.getPlayerChallenges(playerId);
    return [...incoming, ...outgoing].filter(c =>
      c.status === 'pending' || c.status === 'accepted' || c.status === 'ready'
    );
  }

  sendNotification(
    recipientId: string,
    type: string,
    title: string,
    message: string,
    data?: any
  ): Notification {
    const notification: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      recipientId,
      type: type as any,
      title,
      message,
      data,
      read: false,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    };

    gameDb.queries.insertNotification.run(
      notification.id,
      notification.recipientId,
      notification.type,
      notification.title,
      notification.message,
      data ? JSON.stringify(data) : null,
      notification.expiresAt?.toISOString() ?? null
    );

    return notification;
  }

  getNotifications(recipientId: string): Notification[] {
    const rows = gameDb.queries.getNotifications.all(recipientId);
    return rows.map((row: any) => ({
      id: row.id,
      recipientId: row.recipient_id,
      type: row.type,
      title: row.title,
      message: row.message,
      data: row.data ? JSON.parse(row.data) : undefined,
      read: Boolean(row.is_read),
      createdAt: new Date(row.created_at),
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined
    }));
  }

  markNotificationRead(id: string): void {
    gameDb.queries.markNotificationRead.run(id);
  }

  markAllNotificationsRead(recipientId: string): void {
    gameDb.connection.prepare(
      'UPDATE notifications SET is_read = 1 WHERE recipient_id = ?'
    ).run(recipientId);
  }

  // Alias methods for backward compatibility
  getPlayerNotifications(playerId: string): Notification[] {
    return this.getNotifications(playerId);
  }

  getUnreadNotifications(playerId: string): Notification[] {
    const notifications = this.getNotifications(playerId);
    return notifications.filter(n => !n.read);
  }

  markNotificationAsRead(notificationId: string): boolean {
    this.markNotificationRead(notificationId);
    return true;
  }

  markAllNotificationsAsRead(playerId: string): void {
    this.markAllNotificationsRead(playerId);
  }

  deleteNotification(notificationId: string): boolean {
    const result = gameDb.connection
      .prepare('DELETE FROM notifications WHERE id = ?')
      .run(notificationId);
    return result.changes > 0;
  }

  // Helper methods
  private rowToCard(row: any): Card {
    // Handle image URL: if it already starts with /images/, use as-is; otherwise add card_images prefix
    let imageUrl = undefined;
    if (row.image_url) {
      imageUrl = row.image_url.startsWith('/images/')
        ? row.image_url
        : `/images/card_images/${row.image_url}`;
    }

    return {
      id: row.id,
      name: row.name,
      title: row.title,
      fullName: row.full_name,
      description: row.description,
      imageUrl,
      cardType: row.card_type || 'battle',
      toolId: row.tool_id,
      abilities: {
        strength: row.strength,
        speed: row.speed,
        agility: row.agility
      },
      baseAbilities: row.base_strength ? {
        strength: row.base_strength,
        speed: row.base_speed,
        agility: row.base_agility
      } : undefined,
      titleModifiers: row.title_modifier_strength || row.title_modifier_speed || row.title_modifier_agility ? {
        strength: row.title_modifier_strength || 0,
        speed: row.title_modifier_speed || 0,
        agility: row.title_modifier_agility || 0
      } : undefined,
      rarity: row.rarity,
      criticalHitChance: row.critical_hit_chance,
      createdAt: new Date(row.created_at),
      createdBy: row.created_by
    };
  }

  getPacks(): Pack[] {
    return this.packs;
  }

  getPack(id: string): Pack | undefined {
    return this.packs.find(p => p.id === id);
  }

  // Get random cards for packs
  getRandomCards(count: number, guaranteedRarity?: 'uncommon' | 'rare'): Card[] {
    const allCards = this.getAllCards();
    const result: Card[] = [];

    if (guaranteedRarity && count > 0) {
      const guaranteedCards = allCards.filter(c =>
        c.rarity === guaranteedRarity ||
        (guaranteedRarity === 'uncommon' && c.rarity === 'rare')
      );

      if (guaranteedCards.length > 0) {
        const randomIndex = Math.floor(Math.random() * guaranteedCards.length);
        result.push(guaranteedCards[randomIndex]);
      }
    }

    while (result.length < count && allCards.length > 0) {
      const randomIndex = Math.floor(Math.random() * allCards.length);
      result.push(allCards[randomIndex]);
    }

    return result;
  }

  getLeaderboard(limit: number = 50): Player[] {
    const rows = gameDb.connection.prepare(`
      SELECT
        p.*,
        ps.total_wins,
        ps.total_losses,
        ps.pvp_wins,
        ps.pvp_losses,
        ps.ai_wins,
        ps.ai_losses
      FROM players p
      LEFT JOIN player_stats ps ON p.id = ps.id
      ORDER BY p.rating DESC
      LIMIT ?
    `).all(limit);

    return rows.map((row: any) => {
      const player = this.getPlayer(row.id);
      if (!player) return null;

      // Add calculated stats
      player.wins = row.total_wins || 0;
      player.losses = row.total_losses || 0;
      player.pvpWins = row.pvp_wins || 0;
      player.pvpLosses = row.pvp_losses || 0;

      return player;
    }).filter(Boolean) as Player[];
  }

  // New method to get only base cards (no variants)
  getBaseCards(): Card[] {
    const rows = gameDb.queries.getAllCards.all();
    return rows
      .filter((row: any) => {
        // Include test cards (they start with 'test_card_')
        if (row.id.startsWith('test_card_')) return true;

        // For tool cards: only include base tools, not variants
        if (row.id.startsWith('tool_')) {
          // Base tool cards have format: tool_<name> (no additional underscores/timestamps)
          const parts = row.id.split('_');
          // Base tools have exactly 2 parts: 'tool' and the tool name
          return parts.length === 2;
        }

        // Exclude variant cards (contain underscore but don't start with test_card_ or tool_)
        if (row.id.includes('_')) return false;
        // Include all other base cards
        return true;
      })
      .map((row: any) => this.rowToCard(row));
  }

  generatePackCards(packId: string): Card[] {
    const pack = this.getPack(packId);
    if (!pack) return [];

    // CRITICAL: Only use base cards (no variants) for pack generation
    const allCards = this.getBaseCards();
    if (allCards.length === 0) return [];

    const packCards: Card[] = [];
    const availableCards = [...allCards];

    if (pack.guaranteedRarity) {
      const rarityCards = availableCards.filter((c: Card) => {
        if (pack.guaranteedRarity === 'rare') return c.rarity === 'rare';
        if (pack.guaranteedRarity === 'uncommon') return c.rarity === 'uncommon' || c.rarity === 'rare';
        return true;
      });

      if (rarityCards.length > 0) {
        const randomIndex = Math.floor(Math.random() * rarityCards.length);
        packCards.push(rarityCards[randomIndex]);
      }
    }

    while (packCards.length < pack.cardCount && availableCards.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableCards.length);
      packCards.push(availableCards[randomIndex]);
    }

    return packCards;
  }

  // Reward system methods
  getAllRewardTypes(): any[] {
    return gameDb.queries.getAllRewardTypes.all();
  }

  getRewardTypesByCategory(category: string): any[] {
    return gameDb.queries.getRewardTypesByCategory.all(category);
  }

  getPlayerRewards(playerId: string): any[] {
    return gameDb.queries.getPlayerRewards.all(playerId);
  }

  hasPlayerReward(playerId: string, rewardId: string): boolean {
    const result = gameDb.queries.hasPlayerReward.get(playerId, rewardId);
    return result.count > 0;
  }

  grantPlayerReward(playerId: string, rewardId: string, source: string = 'battle_win'): boolean {
    // Check if player already has this reward
    if (this.hasPlayerReward(playerId, rewardId)) {
      return false;
    }

    try {
      gameDb.queries.addPlayerReward.run(playerId, rewardId, source);
      return true;
    } catch (error) {
      console.error('[DbStore] Failed to grant reward:', error);
      return false;
    }
  }

  getAvailableRewards(playerId: string, category?: string): any[] {
    let rewards = gameDb.queries.getAvailableRewards.all(playerId);
    if (category) {
      rewards = rewards.filter((r: any) => r.category === category);
    }
    return rewards;
  }

  // Grant random reward from available pool
  grantRandomReward(playerId: string, category: string = 'voice', rarityWeights?: Record<string, number>): any | null {
    const availableRewards = this.getAvailableRewards(playerId, category);
    if (availableRewards.length === 0) {
      return null;
    }

    // Default rarity weights if not provided
    const weights = rarityWeights || {
      common: 50,
      uncommon: 30,
      rare: 15,
      epic: 4,
      legendary: 1
    };

    // Filter rewards by weighted random selection
    const weightedRewards: any[] = [];
    availableRewards.forEach(reward => {
      const weight = weights[reward.rarity] || 1;
      for (let i = 0; i < weight; i++) {
        weightedRewards.push(reward);
      }
    });

    if (weightedRewards.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * weightedRewards.length);
    const selectedReward = weightedRewards[randomIndex];

    if (this.grantPlayerReward(playerId, selectedReward.id, 'battle_win')) {
      return selectedReward;
    }

    return null;
  }

  // Grant initial voices to new player
  grantInitialVoices(playerId: string): any[] {
    const grantedRewards: any[] = [];

    // Always grant Italian voice first
    const italianVoice = 'voice_google_it_IT';
    if (this.grantPlayerReward(playerId, italianVoice, 'initial')) {
      const reward = gameDb.connection.prepare('SELECT * FROM reward_types WHERE id = ?').get(italianVoice);
      if (reward) grantedRewards.push(reward);
    }

    // Get available common voices
    const availableVoices = this.getAvailableRewards(playerId, 'voice')
      .filter((v: any) => v.rarity === 'common');

    // Grant 2 more random common voices
    for (let i = 0; i < 2 && availableVoices.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableVoices.length);
      const voice = availableVoices[randomIndex];

      if (this.grantPlayerReward(playerId, voice.id, 'initial')) {
        grantedRewards.push(voice);
        availableVoices.splice(randomIndex, 1); // Remove from available list
      }
    }

    return grantedRewards;
  }

  // Tool-related methods
  getAllTools(): Tool[] {
    const rows = gameDb.connection.prepare('SELECT * FROM tools').all();
    return rows.map((row: any) => this.rowToTool(row));
  }

  getTool(toolId: string): Tool | undefined {
    const row = gameDb.connection.prepare('SELECT * FROM tools WHERE id = ?').get(toolId);
    return row ? this.rowToTool(row) : undefined;
  }

  getPlayerTools(playerId: string): PlayerTool[] {
    const rows = gameDb.connection.prepare(`
      SELECT pt.*, t.* FROM player_tools pt
      JOIN tools t ON pt.tool_id = t.id
      WHERE pt.player_id = ?
    `).all(playerId);

    return rows.map((row: any) => ({
      playerId: row.player_id,
      toolId: row.tool_id,
      quantity: row.quantity,
      lastUsedBattleId: row.last_used_battle_id,
      cooldownRemaining: row.cooldown_remaining,
      acquiredAt: new Date(row.acquired_at),
      tool: this.rowToTool(row)
    }));
  }

  givePlayerTool(playerId: string, toolId: string, quantity: number = 1): boolean {
    try {
      const existing = gameDb.connection.prepare(
        'SELECT * FROM player_tools WHERE player_id = ? AND tool_id = ?'
      ).get(playerId, toolId);

      if (existing) {
        gameDb.connection.prepare(
          'UPDATE player_tools SET quantity = quantity + ? WHERE player_id = ? AND tool_id = ?'
        ).run(quantity, playerId, toolId);
      } else {
        gameDb.connection.prepare(
          'INSERT INTO player_tools (player_id, tool_id, quantity) VALUES (?, ?, ?)'
        ).run(playerId, toolId, quantity);
      }
      return true;
    } catch (error) {
      console.error('[DbStore] Failed to give tool to player:', error);
      return false;
    }
  }

  applyToolToBattle(battleId: string, playerId: string, toolId: string, cardId: string, cardPosition: number): boolean {
    try {
      // First, insert the tool usage
      gameDb.connection.prepare(`
        INSERT INTO battle_tool_usage (battle_id, player_id, tool_id, card_id, card_position)
        VALUES (?, ?, ?, ?, ?)
      `).run(battleId, playerId, toolId, cardId, cardPosition);

      // Immediately apply cooldown to prevent using the same tool in parallel battles
      const tool = gameDb.connection.prepare('SELECT cooldown FROM tools WHERE id = ?').get(toolId) as any;

      if (tool && tool.cooldown > 0) {
        gameDb.connection.prepare(`
          UPDATE player_tools
          SET cooldown_remaining = ?, last_used_battle_id = ?
          WHERE player_id = ? AND tool_id = ?
        `).run(tool.cooldown, battleId, playerId, toolId);

        console.log(`[DbStore] Applied immediate cooldown of ${tool.cooldown} battles to tool ${toolId} for player ${playerId}`);
      }

      return true;
    } catch (error) {
      console.error('[DbStore] Failed to apply tool to battle:', error);
      return false;
    }
  }


  decreaseToolCooldowns(playerId: string): void {
    try {
      // Decrease cooldown_remaining for all tools that have cooldown > 0
      gameDb.connection.prepare(`
        UPDATE player_tools
        SET cooldown_remaining = MAX(0, cooldown_remaining - 1)
        WHERE player_id = ? AND cooldown_remaining > 0
      `).run(playerId);

      console.log(`[DbStore] Decreased tool cooldowns for player ${playerId}`);
    } catch (error) {
      console.error('[DbStore] Failed to decrease tool cooldowns:', error);
    }
  }

  setToolCooldown(playerId: string, toolId: string, cooldown: number): void {
    try {
      gameDb.connection.prepare(`
        UPDATE player_tools
        SET cooldown_remaining = ?
        WHERE player_id = ? AND tool_id = ?
      `).run(cooldown, playerId, toolId);

      console.log(`[DbStore] Set cooldown of ${cooldown} for tool ${toolId} for player ${playerId}`);
    } catch (error) {
      console.error('[DbStore] Failed to set tool cooldown:', error);
    }
  }

  getBattleToolUsage(battleId: string): BattleToolUsage[] {
    const rows = gameDb.connection.prepare(`
      SELECT * FROM battle_tool_usage WHERE battle_id = ?
    `).all(battleId);

    return rows.map((row: any) => ({
      battleId: row.battle_id,
      playerId: row.player_id,
      toolId: row.tool_id,
      cardId: row.card_id,
      cardPosition: row.card_position
    }));
  }

  updateToolCooldown(playerId: string, toolId: string, battleId: string, cooldown: number): void {
    gameDb.connection.prepare(`
      UPDATE player_tools
      SET last_used_battle_id = ?, cooldown_remaining = ?
      WHERE player_id = ? AND tool_id = ?
    `).run(battleId, cooldown, playerId, toolId);
  }

  decrementToolCooldowns(playerId: string): void {
    gameDb.connection.prepare(`
      UPDATE player_tools
      SET cooldown_remaining = MAX(0, cooldown_remaining - 1)
      WHERE player_id = ? AND cooldown_remaining > 0
    `).run(playerId);
  }

  private rowToTool(row: any): Tool {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      effectType: row.effect_type,
      effectAbility: row.effect_ability,
      effectValue: row.effect_value,
      cooldown: row.cooldown,
      restriction: row.restriction,
      imageUrl: row.image_url
    };
  }
}

export const dbStore = new DbStore();
