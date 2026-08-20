import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { Choice, Player, RoomState, RoundResult, ReactionMessage } from './src/types';

const app = express();
const PORT = 3000;

app.use(express.json());

interface ServerPlayer extends Player {
  ws?: WebSocket;
}

interface ServerRoom {
  code: string;
  title?: string;
  isPublic?: boolean;
  status: 'waiting' | 'countdown' | 'revealing' | 'roundResult' | 'matchOver';
  p1: ServerPlayer | null;
  p2: ServerPlayer | null;
  round: number;
  maxScore: number;
  history: RoundResult[];
  winner: 'p1' | 'p2' | null;
  reactions: ReactionMessage[];
  lastActionTime: number;
  countdownTimer?: NodeJS.Timeout;
}

const rooms = new Map<string, ServerRoom>();

// Generate 5-char code without ambiguous characters
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function determineWinner(c1: Choice, c2: Choice): 'p1' | 'p2' | 'draw' {
  if (c1 === c2) return 'draw';
  if (
    (c1 === 'piedra' && c2 === 'tijera') ||
    (c1 === 'papel' && c2 === 'piedra') ||
    (c1 === 'tijera' && c2 === 'papel')
  ) {
    return 'p1';
  }
  return 'p2';
}

function sanitizeRoomState(room: ServerRoom, forPlayerId?: string): RoomState {
  // To avoid cheating, if round is in progress and not yet revealed, hide opponent's choice
  const isRevealed = room.status === 'roundResult' || room.status === 'matchOver' || room.status === 'revealing';

  const p1Sanitized: Player | null = room.p1
    ? {
        id: room.p1.id,
        name: room.p1.name,
        avatar: room.p1.avatar,
        score: room.p1.score,
        // Only show if it's the requesting player or already revealed, or a boolean placeholder
        choice: (isRevealed || (forPlayerId && room.p1.id === forPlayerId)) ? room.p1.choice : (room.p1.choice ? ('hidden' as any) : null),
        readyForNext: room.p1.readyForNext,
        connected: room.p1.connected,
      }
    : null;

  const p2Sanitized: Player | null = room.p2
    ? {
        id: room.p2.id,
        name: room.p2.name,
        avatar: room.p2.avatar,
        score: room.p2.score,
        choice: (isRevealed || (forPlayerId && room.p2.id === forPlayerId)) ? room.p2.choice : (room.p2.choice ? ('hidden' as any) : null),
        readyForNext: room.p2.readyForNext,
        connected: room.p2.connected,
      }
    : null;

  return {
    code: room.code,
    title: room.title || `Sala de ${room.p1?.name || 'Jugador'}`,
    isPublic: room.isPublic ?? true,
    status: room.status,
    p1: p1Sanitized,
    p2: p2Sanitized,
    round: room.round,
    maxScore: room.maxScore,
    history: room.history,
    winner: room.winner,
    lastActionTime: room.lastActionTime,
  };
}

function broadcastRoom(room: ServerRoom) {
  if (room.p1 && room.p1.ws && room.p1.ws.readyState === WebSocket.OPEN) {
    room.p1.ws.send(JSON.stringify({ type: 'state', payload: sanitizeRoomState(room, room.p1.id) }));
  }
  if (room.p2 && room.p2.ws && room.p2.ws.readyState === WebSocket.OPEN) {
    room.p2.ws.send(JSON.stringify({ type: 'state', payload: sanitizeRoomState(room, room.p2.id) }));
  }
}

function broadcastEvent(room: ServerRoom, type: string, payload: any) {
  const message = JSON.stringify({ type, payload });
  if (room.p1 && room.p1.ws && room.p1.ws.readyState === WebSocket.OPEN) {
    room.p1.ws.send(message);
  }
  if (room.p2 && room.p2.ws && room.p2.ws.readyState === WebSocket.OPEN) {
    room.p2.ws.send(message);
  }
}

function resolveRound(room: ServerRoom) {
  if (!room.p1 || !room.p2 || !room.p1.choice || !room.p2.choice) return;

  // Change status to revealing
  room.status = 'revealing';
  broadcastRoom(room);

  // After 1.8 seconds of dramatic Yan Ken Po reveal animation, show result
  if (room.countdownTimer) clearTimeout(room.countdownTimer);

  room.countdownTimer = setTimeout(() => {
    if (!room.p1 || !room.p2 || !room.p1.choice || !room.p2.choice) return;

    const roundWinner = determineWinner(room.p1.choice, room.p2.choice);

    if (roundWinner === 'p1') {
      room.p1.score += 1;
    } else if (roundWinner === 'p2') {
      room.p2.score += 1;
    }

    const roundResult: RoundResult = {
      round: room.round,
      p1Choice: room.p1.choice,
      p2Choice: room.p2.choice,
      winner: roundWinner,
      timestamp: Date.now(),
    };
    room.history.push(roundResult);

    // Check if match won
    if (room.maxScore > 0 && (room.p1.score >= room.maxScore || room.p2.score >= room.maxScore)) {
      room.status = 'matchOver';
      room.winner = room.p1.score >= room.maxScore ? 'p1' : 'p2';
    } else {
      room.status = 'roundResult';
    }

    room.lastActionTime = Date.now();
    broadcastRoom(room);
  }, 1800);
}

// REST API Endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', activeRooms: rooms.size });
});

// List public active rooms waiting for opponent
app.get('/api/rooms/public', (req, res) => {
  const publicRooms: any[] = [];
  const now = Date.now();

  rooms.forEach((room) => {
    // Room is public, waiting for P2, and was active recently (< 15 mins)
    if (
      room.isPublic !== false &&
      room.status === 'waiting' &&
      room.p1 &&
      room.p1.connected &&
      !room.p2 &&
      now - room.lastActionTime < 15 * 60 * 1000
    ) {
      publicRooms.push({
        code: room.code,
        title: room.title || `Sala de ${room.p1.name}`,
        hostName: room.p1.name,
        hostAvatar: room.p1.avatar,
        maxScore: room.maxScore,
        createdAt: room.lastActionTime,
      });
    }
  });

  // Sort newest first, limit to 20
  publicRooms.sort((a, b) => b.createdAt - a.createdAt);
  res.json({ rooms: publicRooms.slice(0, 20) });
});

app.post('/api/rooms/create', (req, res) => {
  const { name, avatar, maxScore, title, isPublic } = req.body;
  const playerId = 'p1_' + Math.random().toString(36).substring(2, 9);
  let code = generateRoomCode();
  while (rooms.has(code)) {
    code = generateRoomCode();
  }

  const playerName = (name || '').trim() || 'Jugador 1';
  const roomTitle = (title || '').trim() || `Sala de ${playerName}`;

  const newRoom: ServerRoom = {
    code,
    title: roomTitle,
    isPublic: isPublic !== false, // default true
    status: 'waiting',
    p1: {
      id: playerId,
      name: playerName,
      avatar: avatar || '🇵🇪',
      score: 0,
      choice: null,
      readyForNext: false,
      connected: true,
    },
    p2: null,
    round: 1,
    maxScore: maxScore === 3 || maxScore === 5 ? maxScore : 3,
    history: [],
    winner: null,
    reactions: [],
    lastActionTime: Date.now(),
  };

  rooms.set(code, newRoom);
  res.json({ code, playerId, state: sanitizeRoomState(newRoom, playerId) });
});

app.post('/api/rooms/join', (req, res) => {
  const { code, name, avatar } = req.body;
  const cleanCode = (code || '').trim().toUpperCase();
  const room = rooms.get(cleanCode);

  if (!room) {
    return res.status(404).json({ error: 'Sala no encontrada. Revisa el código.' });
  }

  if (room.p2 && room.p2.connected) {
    return res.status(400).json({ error: 'La sala ya está completa (2 jugadores).' });
  }

  const playerId = room.p2?.id || ('p2_' + Math.random().toString(36).substring(2, 9));
  room.p2 = {
    id: playerId,
    name: name || 'Jugador 2',
    avatar: avatar || '🦙',
    score: room.p2?.score || 0,
    choice: null,
    readyForNext: false,
    connected: true,
  };

  if (room.status === 'waiting') {
    room.status = 'roundResult'; // ready to play round 1
  }
  room.lastActionTime = Date.now();

  broadcastRoom(room);
  res.json({ code: cleanCode, playerId, state: sanitizeRoomState(room, playerId) });
});

app.get('/api/rooms/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  const playerId = req.query.playerId as string;
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: 'Sala no encontrada' });
  }
  res.json(sanitizeRoomState(room, playerId));
});

// Periodic cleanup of old rooms (> 2 hours inactive)
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now - room.lastActionTime > 2 * 60 * 60 * 1000) {
      if (room.countdownTimer) clearTimeout(room.countdownTimer);
      rooms.delete(code);
    }
  }
}, 10 * 60 * 1000);

async function startServer() {
  const server = http.createServer(app);

  // WebSocket Server
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    let currentCode: string | null = null;
    let currentPlayerId: string | null = null;

    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        const { type, payload } = data;

        if (type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
          return;
        }

        if (type === 'join') {
          const { code, playerId, name, avatar } = payload || {};
          const cleanCode = (code || '').toUpperCase();
          const room = rooms.get(cleanCode);

          if (!room) {
            ws.send(JSON.stringify({ type: 'error', payload: 'Sala no encontrada' }));
            return;
          }

          currentCode = cleanCode;
          currentPlayerId = playerId;

          if (room.p1 && room.p1.id === playerId) {
            room.p1.ws = ws;
            room.p1.connected = true;
            if (name) room.p1.name = name;
            if (avatar) room.p1.avatar = avatar;
          } else if (room.p2 && room.p2.id === playerId) {
            room.p2.ws = ws;
            room.p2.connected = true;
            if (name) room.p2.name = name;
            if (avatar) room.p2.avatar = avatar;
          } else if (!room.p2) {
            // New p2
            room.p2 = {
              id: playerId,
              name: name || 'Jugador 2',
              avatar: avatar || '🦙',
              score: 0,
              choice: null,
              readyForNext: false,
              connected: true,
              ws,
            };
            if (room.status === 'waiting') {
              room.status = 'roundResult';
            }
          }

          room.lastActionTime = Date.now();
          broadcastRoom(room);
        }

        if (type === 'playChoice') {
          if (!currentCode || !currentPlayerId) return;
          const room = rooms.get(currentCode);
          if (!room || room.status === 'revealing' || room.status === 'matchOver') return;

          const choice = payload.choice as Choice;
          if (choice !== 'piedra' && choice !== 'papel' && choice !== 'tijera') return;

          if (room.p1 && room.p1.id === currentPlayerId) {
            room.p1.choice = choice;
          } else if (room.p2 && room.p2.id === currentPlayerId) {
            room.p2.choice = choice;
          }

          room.lastActionTime = Date.now();

          // Check if both players chose
          if (room.p1?.choice && room.p2?.choice) {
            resolveRound(room);
          } else {
            broadcastRoom(room);
          }
        }

        if (type === 'nextRound') {
          if (!currentCode || !currentPlayerId) return;
          const room = rooms.get(currentCode);
          if (!room) return;

          if (room.p1 && room.p1.id === currentPlayerId) {
            room.p1.readyForNext = true;
          } else if (room.p2 && room.p2.id === currentPlayerId) {
            room.p2.readyForNext = true;
          }

          // If either both are ready or either clicks to continue next round:
          // Immediately reset choices and advance round
          room.p1 ? (room.p1.choice = null) : null;
          room.p2 ? (room.p2.choice = null) : null;
          if (room.p1) room.p1.readyForNext = false;
          if (room.p2) room.p2.readyForNext = false;
          room.status = 'roundResult'; // active round input mode
          room.round += 1;
          room.lastActionTime = Date.now();
          broadcastRoom(room);
        }

        if (type === 'restartMatch') {
          if (!currentCode) return;
          const room = rooms.get(currentCode);
          if (!room) return;

          if (room.p1) {
            room.p1.score = 0;
            room.p1.choice = null;
            room.p1.readyForNext = false;
          }
          if (room.p2) {
            room.p2.score = 0;
            room.p2.choice = null;
            room.p2.readyForNext = false;
          }
          room.round = 1;
          room.history = [];
          room.winner = null;
          room.status = 'roundResult';
          room.lastActionTime = Date.now();
          broadcastRoom(room);
        }

        if (type === 'reaction') {
          if (!currentCode || !currentPlayerId) return;
          const room = rooms.get(currentCode);
          if (!room) return;

          const player = room.p1?.id === currentPlayerId ? room.p1 : room.p2;
          if (!player) return;

          const reactionMsg: ReactionMessage = {
            id: Math.random().toString(36).substring(2, 9),
            senderId: player.id,
            senderName: player.name,
            text: payload.text || '',
            emoji: payload.emoji || '',
            timestamp: Date.now(),
          };

          broadcastEvent(room, 'reaction', reactionMsg);
        }
      } catch (err) {
        console.error('WS parse error', err);
      }
    });

    ws.on('close', () => {
      if (currentCode && currentPlayerId) {
        const room = rooms.get(currentCode);
        if (room) {
          if (room.p1 && room.p1.id === currentPlayerId) {
            room.p1.connected = false;
            room.p1.ws = undefined;
          }
          if (room.p2 && room.p2.id === currentPlayerId) {
            room.p2.connected = false;
            room.p2.ws = undefined;
          }
          broadcastRoom(room);
        }
      }
    });
  });

  // Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Yan Ken Po Server running on http://localhost:${PORT}`);
  });
}

startServer();
