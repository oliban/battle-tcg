import { Tool } from '../models/types';
import { gameDb } from './database';

export const defaultTools: Tool[] = [
  {
    id: 'running-shoes',
    name: 'Running Shoes',
    description: 'Gives +2 speed to the card you apply it to',
    effectType: 'stat_boost',
    effectAbility: 'speed',
    effectValue: 2,
    cooldown: 0,
    imageUrl: '/images/tools/running-shoes.png'
  },
  {
    id: 'sledge-hammer',
    name: 'Sledge Hammer',
    description: 'Gives +2 strength to the card you apply it to',
    effectType: 'stat_boost',
    effectAbility: 'strength',
    effectValue: 2,
    cooldown: 0,
    imageUrl: '/images/tools/sledge-hammer.png'
  },
  {
    id: 'tube-of-lotion',
    name: 'Tube of Lotion',
    description: 'Gives +2 agility to the card you apply it to',
    effectType: 'stat_boost',
    effectAbility: 'agility',
    effectValue: 2,
    cooldown: 0,
    imageUrl: '/images/tools/tube-of-lotion.png'
  },
  {
    id: 'spear',
    name: 'Spear',
    description: 'Gives +2 to any ability. Has a 2-battle cooldown after use',
    effectType: 'any_stat_boost',
    effectAbility: 'any',
    effectValue: 2,
    cooldown: 2,
    imageUrl: '/images/tools/spear.png'
  },
  {
    id: 'binoculars',
    name: 'Binoculars',
    description: 'Reveals 2 random opponent cards. Can only be used when defending',
    effectType: 'reveal_cards',
    effectValue: 2,
    cooldown: 0,
    restriction: 'challengee',
    imageUrl: '/images/tools/binoculars.png'
  }
];

export function initializeTools() {
  try {
    // Check if tools already exist
    const existingTools = gameDb.connection.prepare('SELECT COUNT(*) as count FROM tools').get() as { count: number };

    if (existingTools.count > 0) {
      console.log('[InitTools] Tools already initialized');
      return;
    }

    // Insert default tools
    const insertTool = gameDb.connection.prepare(`
      INSERT INTO tools (
        id, name, description, effect_type, effect_ability,
        effect_value, cooldown, restriction, image_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = gameDb.connection.transaction((tools: Tool[]) => {
      for (const tool of tools) {
        insertTool.run(
          tool.id,
          tool.name,
          tool.description,
          tool.effectType,
          tool.effectAbility || null,
          tool.effectValue || null,
          tool.cooldown,
          tool.restriction || null,
          tool.imageUrl || null
        );
      }
    });

    insertMany(defaultTools);
    console.log('[InitTools] Successfully initialized', defaultTools.length, 'tools');
  } catch (error) {
    console.error('[InitTools] Failed to initialize tools:', error);
  }
}

// Give initial tools to new players
export function giveStarterTools(playerId: string) {
  try {
    const starterTools = ['running-shoes', 'sledge-hammer', 'tube-of-lotion'];

    const insertPlayerTool = gameDb.connection.prepare(`
      INSERT OR IGNORE INTO player_tools (player_id, tool_id, quantity)
      VALUES (?, ?, 1)
    `);

    const giveTools = gameDb.connection.transaction((tools: string[]) => {
      for (const toolId of tools) {
        insertPlayerTool.run(playerId, toolId);
      }
    });

    giveTools(starterTools);
    console.log(`[InitTools] Gave starter tools to player ${playerId}`);
  } catch (error) {
    console.error('[InitTools] Failed to give starter tools:', error);
  }
}