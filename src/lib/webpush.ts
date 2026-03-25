import webpush from 'web-push';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:james.welbes@gmail.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export { webpush, VAPID_PUBLIC_KEY };

const APP_URL = process.env.NEXTAUTH_URL || 'https://leaguehq.club';

// Maps sport name → public icon path
const SPORT_ICON_MAP: Record<string, string> = {
  Soccer:     '/icons/sports/soccer.png',
  Basketball: '/icons/sports/basketball.png',
  Baseball:   '/icons/sports/baseball.png',
  Football:   '/icons/sports/football.png',
  Volleyball: '/icons/sports/volleyball.png',
  Tennis:     '/icons/sports/tennis.png',
  Hockey:     '/icons/sports/hockey.png',
  Softball:   '/icons/sports/softball.png',
  Lacrosse:   '/icons/sports/lacrosse.png',
  Rugby:      '/icons/sports/rugby.png',
  Swimming:   '/icons/sports/swimming.png',
  Track:      '/icons/sports/track.png',
};

export function sportIcon(sport?: string | null): string {
  const path = (sport && SPORT_ICON_MAP[sport]) || '/icons/icon-192.png';
  return `${APP_URL}${path}`;
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string; tag?: string; icon?: string }
) {
  const { prisma } = await import('./prisma');
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pushNotificationsEnabled: true, pushSubscriptions: true },
  });
  if (!user?.pushNotificationsEnabled) return;

  const payloadStr = JSON.stringify(payload);
  for (const sub of user.pushSubscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payloadStr
      );
    } catch (err: any) {
      // 410 Gone = subscription expired, remove it
      if (err.statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      }
    }
  }
}

export async function sendPushToMany(
  userIds: string[],
  payload: { title: string; body: string; url?: string; tag?: string; icon?: string }
) {
  await Promise.allSettled(userIds.map(id => sendPushToUser(id, payload)));
}
