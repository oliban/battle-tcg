import Database from 'better-sqlite3';
import path from 'path';

// Initialize database connection
const dbPath = path.join(__dirname, '../../database.sqlite');
const db = new Database(dbPath);

function updateExistingCards() {
  try {
    // Get all cards that don't have a critical hit chance set
    const cardsWithoutCrit = db.prepare(`
      SELECT id FROM cards WHERE critical_hit_chance IS NULL
    `).all();

    console.log(`Found ${cardsWithoutCrit.length} cards without critical hit chance`);

    // Update each card with a random critical hit chance between 5% and 15%
    const updateStmt = db.prepare(`
      UPDATE cards SET critical_hit_chance = ? WHERE id = ?
    `);

    let updated = 0;
    for (const card of cardsWithoutCrit) {
      const criticalHitChance = Math.floor(Math.random() * 11) + 5; // 5-15%
      updateStmt.run(criticalHitChance, (card as any).id);
      updated++;
    }

    console.log(`Updated ${updated} cards with critical hit chances`);

    // Show distribution of critical hit chances
    const distribution = db.prepare(`
      SELECT critical_hit_chance, COUNT(*) as count
      FROM cards
      WHERE critical_hit_chance IS NOT NULL
      GROUP BY critical_hit_chance
      ORDER BY critical_hit_chance
    `).all();

    console.log('\nCritical hit chance distribution:');
    distribution.forEach((row: any) => {
      console.log(`${row.critical_hit_chance}%: ${row.count} cards`);
    });

  } catch (error) {
    console.error('Error updating cards:', error);
  } finally {
    db.close();
  }
}

// Run the update
console.log('Updating existing cards with critical hit chances...');
updateExistingCards();
console.log('Done!');