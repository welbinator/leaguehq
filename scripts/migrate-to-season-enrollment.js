const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Migrating TeamRegistration → Team + SeasonEnrollment...\n');

  const teamRegs = await prisma.teamRegistration.findMany({
    include: { season: { include: { league: true } } }
  });
  console.log(`Found ${teamRegs.length} TeamRegistrations`);

  const trToEnrollment = {};

  for (const tr of teamRegs) {
    const leagueId = tr.season.leagueId;

    // Find existing Team in this league with same name, or create one
    let team = await prisma.team.findFirst({ where: { leagueId, name: tr.teamName } });
    if (!team) {
      team = await prisma.team.create({
        data: { leagueId, name: tr.teamName }
      });
      console.log(`  Created Team: "${team.name}" (${team.id})`);
    } else {
      console.log(`  Reusing Team: "${team.name}" (${team.id})`);
    }

    // Find or create SeasonEnrollment
    let enrollment = await prisma.seasonEnrollment.findUnique({
      where: { teamId_seasonId: { teamId: team.id, seasonId: tr.seasonId } }
    });
    if (!enrollment) {
      enrollment = await prisma.seasonEnrollment.create({
        data: {
          teamId: team.id,
          seasonId: tr.seasonId,
          seasonDivisionId: tr.seasonDivisionId ?? null,
          status: tr.status ?? 'PENDING',
          notes: tr.notes ?? null,
          paymentStatus: tr.paymentStatus ?? null,
          paymentAmount: tr.paymentAmount ? parseFloat(tr.paymentAmount.toString()) : null,
          stripePaymentIntentId: tr.stripePaymentIntentId ?? null,
          stripeCheckoutSessionId: tr.stripeCheckoutSessionId ?? null,
          paidAt: tr.paidAt ?? null,
        }
      });
      console.log(`  Created SeasonEnrollment for "${team.name}" → season ${tr.seasonId}`);
    }
    trToEnrollment[tr.id] = { teamId: team.id, enrollmentId: enrollment.id };
  }

  // Update PlayerRegistrations that have teamRegistrationId
  const playerRegs = await prisma.playerRegistration.findMany({
    where: { teamRegistrationId: { not: null } }
  });
  console.log(`\nFound ${playerRegs.length} PlayerRegistrations to update`);
  for (const pr of playerRegs) {
    const mapping = trToEnrollment[pr.teamRegistrationId];
    if (!mapping) { console.warn(`  WARNING: no mapping for teamRegistrationId ${pr.teamRegistrationId}`); continue; }
    await prisma.playerRegistration.update({
      where: { id: pr.id },
      data: { teamId: mapping.teamId, seasonEnrollmentId: mapping.enrollmentId }
    });
    console.log(`  Updated PlayerRegistration ${pr.id} → teamId=${mapping.teamId}`);
  }

  // Also update PlayerRegistrations with no team (free agents) - just set isCaptain flag for captains
  console.log('\nMigration complete!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
