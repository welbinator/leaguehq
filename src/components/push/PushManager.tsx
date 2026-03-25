'use client';

import { useEffect } from 'react';

export function PushManager() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return;

    async function setup() {
      try {
        // Register service worker
        const reg = await navigator.serviceWorker.register('/sw.js');

        // Get VAPID public key
        const keyRes = await fetch('/api/push/vapid-key');
        const { publicKey } = await keyRes.json();
        if (!publicKey) return;

        // Check user's push setting
        const accountRes = await fetch('/api/account');
        const accountJson = await accountRes.json();
        if (!accountJson.data?.pushNotificationsEnabled) return;

        // Check current permission
        const permission = Notification.permission;
        if (permission === 'denied') return;

        // Subscribe (or get existing subscription)
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

        // Register with server
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

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}
