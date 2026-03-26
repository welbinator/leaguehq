/**
 * Seed script: 10 teams, 5 players each (1 captain + 4 players), all registered.
 * Run with:
 *   DATABASE_URL="postgresql://..." node scripts/seed-dummy-teams.mjs
 */

import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

const db = new PrismaClient();

const LEAGUE_ID          = 'cmn69a9wu0005w5ycnxhsijvr';
const SEASON_ID          = 'cmn69azb30008w5ycl10cjzlg';
const DIVISION_ID        = 'cmn69azb5000aw5ycn2col38e';
const SEASON_DIVISION_ID = 'cmn69azb7000cw5ycumyeyb1a'; // SeasonDivision join record (General / Spring 2026)

// Bcrypt hash of "Password1!" — pre-computed so we don't need bcrypt dep
// We'll use a simple SHA approach and mark them clearly as test accounts
// Actually just store a known bcrypt hash for "TestPass1!" (cost 10)
const HASHED_PW = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'; // "password"

const TEAM_NAMES = [
  'Cedar Rapids United',
  'Iowa City Wanderers',
  'Davenport FC',
  'Waterloo Warriors',
  'Dubuque Athletic',
  'Ames Rovers',
  'Des Moines Dynamo',
  'Sioux City Strikers',
  'Council Bluffs SC',
  'Quad Cities FC',
];

// First names pool
const FIRST_NAMES = [
  'James','Michael','David','Chris','Matt','Tyler','Josh','Ryan','Brandon','Kevin',
  'Ashley','Sarah','Jessica','Emily','Lauren','Megan','Rachel','Nicole','Stephanie','Amanda',
  'Daniel','Andrew','Justin','Brian','Kyle','Eric','Adam','Nathan','Aaron','Scott',
  'Jennifer','Rebecca','Katie','Michelle','Brittany','Amber','Christina','Melissa','Lisa','Karen',
  'Marcus','DeShawn','Jamal','Carlos','Miguel','Jose','Luis','Andre','Darius','Malik',
];

// Last names pool
const LAST_NAMES = [
  'Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Wilson','Moore',
  'Taylor','Anderson','Thomas','Jackson','White','Harris','Martin','Thompson','Lewis','Robinson',
  'Clark','Rodriguez','Martinez','Hernandez','Lopez','Gonzalez','Young','Allen','King','Wright',
  'Scott','Green','Baker','Adams','Nelson','Hill','Ramirez','Campbell','Mitchell','Carter',
  'Evans','Collins','Stewart','Morris','Murphy','Cook','Rogers','Morgan','Bell','Bailey',
];

let nameIndex = 0;
function nextName() {
  const first = FIRST_NAMES[nameIndex % FIRST_NAMES.length];
  const last  = LAST_NAMES[Math.floor(nameIndex / FIRST_NAMES.length) % LAST_NAMES.length];
  nameIndex++;
  return { first, last };
}

async function main() {
  console.log('🌱 Seeding 10 teams × 5 players...\n');

  for (let t = 0; t < TEAM_NAMES.length; t++) {
    const teamName = TEAM_NAMES[t];
    console.log(`📋 Creating team: ${teamName}`);

    // Create 5 users: index 0 = captain, 1-4 = players
    const users = [];
    for (let p = 0; p < 5; p++) {
      const { first, last } = nextName();
      const slug = `${first.toLowerCase()}.${last.toLowerCase()}${t}${p}`;
      const email = `${slug}@leaguehq-test.com`;
      const isCaptain = p === 0;

      const user = await db.user.upsert({
        where: { email },
        update: {},
        create: {
          email,
          password: HASHED_PW,
          name: `${first} ${last}`,
          firstName: first,
          lastName: last,
          role: 'PLAYER',
        },
      });
      users.push({ user, isCaptain });
      console.log(`  👤 ${isCaptain ? '⭐ Captain' : '   Player'}: ${first} ${last} <${email}>`);
    }

    const captain = users[0].user;

    // Create team (season-scoped, in division)
    const team = await db.team.create({
      data: {
        leagueId:   LEAGUE_ID,
        seasonId:   SEASON_ID,
        divisionId: DIVISION_ID,
        name:       teamName,
        captainId:  captain.id,
      },
    });
    console.log(`  🏟  Team created: ${team.id}`);

    // Enroll team in the season via SeasonEnrollment (required for schedule builder)
    await db.seasonEnrollment.upsert({
      where: { id: team.id + '_enroll' },
      update: {},
      create: {
        teamId:           team.id,
        seasonId:         SEASON_ID,
        seasonDivisionId: SEASON_DIVISION_ID,
        status:           'APPROVED',
        paymentStatus:    'paid',
        paymentAmount:    50.00,
        paidAt:           new Date(),
      },
    }).catch(async () => {
      // upsert by composite — just create if not exists
      const existing = await db.seasonEnrollment.findFirst({ where: { teamId: team.id, seasonId: SEASON_ID } });
      if (!existing) await db.seasonEnrollment.create({
        data: {
          teamId:           team.id,
          seasonId:         SEASON_ID,
          seasonDivisionId: SEASON_DIVISION_ID,
          status:           'APPROVED',
          paymentStatus:    'paid',
          paymentAmount:    50.00,
          paidAt:           new Date(),
        }
      });
    });

    // Create TeamMember records + Registration records for each user
    for (const { user, isCaptain } of users) {
      // TeamMember
      await db.teamMember.upsert({
        where: { teamId_userId: { teamId: team.id, userId: user.id } },
        update: {},
        create: {
          teamId: team.id,
          userId: user.id,
          role:   isCaptain ? 'CAPTAIN' : 'PLAYER',
          status: 'ACTIVE',
        },
      });

      // Registration (APPROVED, paid $50 as per SeasonDivision pricing)
      const existingReg = await db.registration.findFirst({
        where: { userId: user.id, seasonId: SEASON_ID, teamId: team.id },
      });
      if (!existingReg) {
        await db.registration.create({
          data: {
            leagueId:   LEAGUE_ID,
            seasonId:   SEASON_ID,
            divisionId: DIVISION_ID,
            userId:     user.id,
            teamId:     team.id,
            status:     'APPROVED',
            amount:     50.00,
            paidAt:     new Date(),
          },
        });
      }
    }

    // Create a team chat room
    const chatRoom = await db.chatRoom.create({
      data: {
        leagueId: LEAGUE_ID,
        teamId:   team.id,
        seasonId: SEASON_ID,
        name:     `${teamName} Chat`,
        type:     'TEAM',
      },
    });

    // Add all team members to the chat room
    for (const { user } of users) {
      await db.chatMember.create({
        data: {
          roomId: chatRoom.id,
          userId: user.id,
        },
      });
    }

    console.log(`  💬 Chat room created: ${chatRoom.id}\n`);
  }

  console.log('✅ Done! 10 teams × 5 players seeded.\n');
  console.log('🔑 All test accounts use password: "password"');
  console.log('📧 Email format: firstname.lastnameXY@leaguehq-test.com');
}

main()
  .catch(e => { console.error('❌ Error:', e); process.exit(1); })
  .finally(() => db.$disconnect());
