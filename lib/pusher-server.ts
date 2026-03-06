import PusherServer from 'pusher';

if (!process.env.PUSHER_APP_ID || !process.env.NEXT_PUBLIC_PUSHER_KEY || !process.env.PUSHER_SECRET) {
  throw new Error("Pusher environment variables are not configured!");
}

const soketiHost = process.env.NEXT_PUBLIC_PUSHER_HOST;

export const pusherServer = new PusherServer({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  ...(soketiHost
    ? { host: soketiHost, port: '443', useTLS: true }
    : { cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2', useTLS: true }
  ),
});