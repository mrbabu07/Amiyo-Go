import { auth } from "../firebase/firebase.config";

const API_URL = import.meta.env.VITE_API_URL || "/api";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function authHeaders() {
  const headers = { "Content-Type": "application/json" };
  if (auth.currentUser) {
    headers.Authorization = `Bearer ${await auth.currentUser.getIdToken()}`;
  }
  return headers;
}

export async function requestPermission() {
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { granted: false, reason: "unsupported" };
  }
  if (Notification.permission === "granted") return { granted: true };
  if (Notification.permission === "denied") return { granted: false, reason: "denied" };
  const permission = await Notification.requestPermission();
  return { granted: permission === "granted", reason: permission };
}

async function getVapidKey() {
  const response = await fetch(`${API_URL}/push/vapid-key`);
  const data = await response.json();
  if (!response.ok || !data.publicKey) {
    throw new Error(data.error || "Push notifications are not configured");
  }
  return data.publicKey;
}

export async function subscribeToPush() {
  const permission = await requestPermission();
  if (!permission.granted) throw new Error("Notification permission was not granted");
  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;

  const publicKey = await getVapidKey();
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  await fetch(`${API_URL}/push/subscribe`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      device: { userAgent: navigator.userAgent },
    }),
  });

  return subscription;
}

export async function unsubscribeFromPush() {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return false;

  await fetch(`${API_URL}/push/unsubscribe`, {
    method: "DELETE",
    headers: await authHeaders(),
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });
  await subscription.unsubscribe();
  return true;
}

export default {
  requestPermission,
  subscribeToPush,
  unsubscribeFromPush,
};
