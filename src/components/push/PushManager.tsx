'use client';

import { useEffect } from 'react';

export function PushManager() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return;

    async function setup() {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');

        const keyRes = await fetch('/api/push/vapid-key');
        const { publicKey } = await keyRes.json();
        if (!publicKey) return;

        const accountRes = await fetch('/api/account');
        const accountJson = await accountRes.json();
        if (!accountJson.data?.pushNotificationsEnabled) return;

        const permission = Notification.permission;
        if (permission === 'denied') return;

        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          if (permission !== 'granted') {
            const result = await Notification.requestPermission();
            if (result !== 'granted') return;
          }
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          });
        }

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sub.toJSON()),
        });
      } catch (err) {
        console.error('Push setup error:', err);
      }
    }

    setup();
  }, []);

  return null;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}
