const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: { origin: process.env.NEXTAUTH_URL || '*', credentials: true },
  });

  if (process.env.REDIS_URL) {
    try {
      const pubClient = createClient({ url: process.env.REDIS_URL });
      const subClient = pubClient.duplicate();
      await Promise.all([pubClient.connect(), subClient.connect()]);
      io.adapter(createAdapter(pubClient, subClient));
      console.log('Socket.io: Redis adapter active');
    } catch (err) {
      console.warn('Socket.io: Redis failed, using in-memory:', err.message);
    }
  } else {
    console.log('Socket.io: in-memory adapter (no REDIS_URL)');
  }

  global.io = io;

  io.on('connection', (socket) => {
    socket.on('join-room', (roomId) => socket.join(roomId));
    socket.on('leave-room', (roomId) => socket.leave(roomId));
  });

  const port = parseInt(process.env.PORT || '3000', 10);
  httpServer.listen(port, () => console.log(`> Ready on http://localhost:${port}`));
});
