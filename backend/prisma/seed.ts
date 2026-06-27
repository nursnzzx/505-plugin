import { PrismaClient, type LicenseTier } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  // ── Admin ──
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@kanttools.local';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'ChangeMe123!';
  const passwordHash = await bcrypt.hash(adminPassword, 12);
  await prisma.admin.upsert({
    where: { email: adminEmail },
    create: { email: adminEmail, passwordHash, name: 'Root Admin', role: 'SUPER_ADMIN' },
    update: { passwordHash },
  });
  console.log(`✓ Admin: ${adminEmail}`);

  // ── Plans ──
  const plans: Array<{
    code: string;
    name: string;
    tier: LicenseTier;
    priceCents: number;
    durationDays: number;
    maxDevices: number;
    features: string[];
    sortOrder: number;
  }> = [
    { code: 'free', name: 'Free', tier: 'FREE', priceCents: 0, durationDays: 0, maxDevices: 1, features: ['Basic tools', 'Community support'], sortOrder: 0 },
    { code: 'trial', name: 'Trial', tier: 'TRIAL', priceCents: 0, durationDays: 7, maxDevices: 1, features: ['All Pro features', '7 days'], sortOrder: 1 },
    { code: 'pro_monthly', name: 'Pro', tier: 'PRO', priceCents: 999, durationDays: 30, maxDevices: 2, features: ['All tools', 'Priority support', '2 devices'], sortOrder: 2 },
    { code: 'ultimate_yearly', name: 'Ultimate', tier: 'ULTIMATE', priceCents: 7999, durationDays: 365, maxDevices: 5, features: ['Everything in Pro', '5 devices', 'Early access', 'Dedicated support'], sortOrder: 3 },
  ];
  for (const p of plans) {
    await prisma.licensePlan.upsert({
      where: { code: p.code },
      create: { ...p, features: p.features },
      update: { ...p, features: p.features },
    });
  }
  console.log(`✓ ${plans.length} plans`);

  // ── Plugin versions ──
  const versions = [
    { slug: 'ae', name: 'Nurse 505 Plugin for After Effects', version: '1.0.0' },
    { slug: 'premiere', name: 'Nurse 505 Plugin for Premiere Pro', version: '1.0.0' },
  ];
  for (const v of versions) {
    await prisma.pluginVersion.upsert({
      where: { slug_version_channel: { slug: v.slug, version: v.version, channel: 'stable' } },
      create: {
        slug: v.slug,
        name: v.name,
        version: v.version,
        channel: 'stable',
        downloadUrl: `https://downloads.kanttools.example/${v.slug}/${v.version}.zxp`,
        releaseNotes: 'Initial public release.',
        isLatest: true,
        fileSizeBytes: 12_582_912,
        systemRequirements: { os: ['Windows 10+', 'macOS 12+'], host: 'CC 2022+' },
      },
      update: {},
    });
  }
  console.log(`✓ ${versions.length} plugin versions`);

  // ── Announcements ──
  const count = await prisma.announcement.count();
  if (count === 0) {
    await prisma.announcement.createMany({
      data: [
        { title: 'Welcome to Nurse 505 Plugin 🎉', body: 'Your licensing portal is live. Activate a key to get started.', kind: 'NEWS', isPinned: true },
        { title: 'v1.0.0 released', body: 'After Effects and Premiere Pro plugins are now available.', kind: 'UPDATE' },
        { title: 'Changelog', body: '- Initial release\n- License activation\n- Device binding', kind: 'CHANGELOG' },
      ],
    });
    console.log('✓ announcements');
  }

  // ── Promo ──
  await prisma.promoCode.upsert({
    where: { code: 'WELCOME10' },
    create: { code: 'WELCOME10', type: 'PERCENT', value: 10, maxRedemptions: 0 },
    update: {},
  });
  console.log('✓ promo WELCOME10');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
