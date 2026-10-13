import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import type { WorkshopRoom, PhotoItem, Participant, PhotoComment, RoomState } from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

// Server-authoritative in-memory workshop state
interface RoomData {
  room: WorkshopRoom;
  photos: PhotoItem[];
  participants: Map<string, Participant>;
  spotlightPhotoId: string | null;
}

const rooms = new Map<string, RoomData>();

// WebSocket connection registry: ws -> { roomId, userId }
interface ClientMeta {
  roomId: string;
  userId: string;
  ws: WebSocket;
}
const clients = new Map<WebSocket, ClientMeta>();

// Helper to broadcast to all clients in a specific room
function broadcastToRoom(roomId: string, message: object, excludeWs?: WebSocket) {
  const payload = JSON.stringify(message);
  for (const [ws, meta] of clients.entries()) {
    if (meta.roomId === roomId && ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

// Seed default workshop room
function seedDefaultRoom() {
  const defaultRoomId = 'workshop-2026';
  const initialPhotos: PhotoItem[] = [
    {
      id: 'photo-1',
      roomId: defaultRoomId,
      url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80',
      caption: '팀 빌딩 오프닝 세션! 다들 열정 넘치네요 🔥',
      authorId: 'user-host',
      authorName: '김민수 (진행자)',
      authorTeam: '운영팀',
      authorAvatarColor: '#3b82f6',
      tag: '#현장스케치',
      createdAt: Date.now() - 1000 * 60 * 35,
      reactions: { '❤️': 8, '🔥': 12, '👏': 5 },
      reactedBy: { '❤️': ['박지영', '이수현'], '🔥': ['최동훈', '정다은'] },
      comments: [
        { id: 'c-1', userId: 'u-1', userName: '정다은', text: '시작부터 분위기 최고!', createdAt: Date.now() - 1000 * 60 * 30 }
      ]
    },
    {
      id: 'photo-2',
      roomId: defaultRoomId,
      url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80',
      caption: '1조 아이디어 브레인스토밍 벽보 완성! 투표 부탁드려요 💡',
      authorId: 'user-2',
      authorName: '박지영',
      authorTeam: '1조 넥스트레벨',
      authorAvatarColor: '#10b981',
      tag: '#팀미션',
      createdAt: Date.now() - 1000 * 60 * 20,
      reactions: { '💡': 14, '👏': 9, '❤️': 6 },
      reactedBy: { '💡': ['김민수', '최동훈'] },
      comments: [
        { id: 'c-2', userId: 'u-host', userName: '김민수 (진행자)', text: '아이디어 너무 참신합니다!', createdAt: Date.now() - 1000 * 60 * 18 }
      ]
    },
    {
      id: 'photo-3',
      roomId: defaultRoomId,
      url: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1200&q=80',
      caption: '2조 프로토타입 리뷰 중입니다! 열띤 토론 현장',
      authorId: 'user-3',
      authorName: '최동훈',
      authorTeam: '2조 크리에이터',
      authorAvatarColor: '#8b5cf6',
      tag: '#팀미션',
      createdAt: Date.now() - 1000 * 60 * 12,
      reactions: { '🔥': 7, '👏': 11 },
      reactedBy: { '👏': ['이수현'] },
      comments: []
    },
    {
      id: 'photo-4',
      roomId: defaultRoomId,
      url: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80',
      caption: '아이스브레이킹 키워드 게임 우승 기념 샷 🏆',
      authorId: 'user-4',
      authorName: '이수현',
      authorTeam: '3조 시너지',
      authorAvatarColor: '#f59e0b',
      tag: '#아이스브레이킹',
      createdAt: Date.now() - 1000 * 60 * 5,
      reactions: { '🎉': 15, '❤️': 10, '😂': 4 },
      reactedBy: { '🎉': ['정다은', '김민수'] },
      comments: [
        { id: 'c-3', userId: 'u-2', userName: '박지영', text: '축하해요 3조 대박!!', createdAt: Date.now() - 1000 * 60 * 3 }
      ]
    }
  ];

  const defaultRoom: WorkshopRoom = {
    id: defaultRoomId,
    title: '2026 전략 & 비전 빌드업 워크숍',
    description: '실시간으로 현장 사진과 팀 미션 결과물을 올리고 큰 화면으로 공유해 보세요!',
    createdAt: Date.now() - 1000 * 60 * 60 * 2,
    hostName: '김민수 (진행자)',
    tags: ['#전체', '#현장스케치', '#아이스브레이킹', '#팀미션', '#최종발표', '#자유사진'],
    photosCount: initialPhotos.length,
    activeParticipantsCount: 4
  };

  const initialParticipants = new Map<string, Participant>();
  initialParticipants.set('user-host', {
    id: 'user-host',
    name: '김민수 (진행자)',
    team: '운영팀',
    avatarColor: '#3b82f6',
    isHost: true,
    joinedAt: Date.now() - 1000 * 60 * 60
  });
  initialParticipants.set('user-2', {
    id: 'user-2',
    name: '박지영',
    team: '1조 넥스트레벨',
    avatarColor: '#10b981',
    joinedAt: Date.now() - 1000 * 60 * 45
  });
  initialParticipants.set('user-3', {
    id: 'user-3',
    name: '최동훈',
    team: '2조 크리에이터',
    avatarColor: '#8b5cf6',
    joinedAt: Date.now() - 1000 * 60 * 30
  });
  initialParticipants.set('user-4', {
    id: 'user-4',
    name: '이수현',
    team: '3조 시너지',
    avatarColor: '#f59e0b',
    joinedAt: Date.now() - 1000 * 60 * 20
  });

  rooms.set(defaultRoomId, {
    room: defaultRoom,
    photos: initialPhotos,
    participants: initialParticipants,
    spotlightPhotoId: null
  });
}

seedDefaultRoom();

function getOrCreateRoom(roomId: string, title?: string, hostName?: string): RoomData {
  if (!rooms.has(roomId)) {
    const newRoom: WorkshopRoom = {
      id: roomId,
      title: title || `워크숍 세션 (${roomId})`,
      description: '참가자들이 함께 실시간으로 사진을 올리는 라이브 앨범입니다.',
      createdAt: Date.now(),
      hostName: hostName || '워크숍 호스트',
      tags: ['#전체', '#현장스케치', '#아이스브레이킹', '#팀미션', '#자유사진'],
      photosCount: 0,
      activeParticipantsCount: 0
    };
    rooms.set(roomId, {
      room: newRoom,
      photos: [],
      participants: new Map(),
      spotlightPhotoId: null
    });
  }
  return rooms.get(roomId)!;
}

// REST API Endpoints
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: Date.now() });
});

// List all rooms
app.get('/api/rooms', (_req, res) => {
  const roomList = Array.from(rooms.values()).map(r => ({
    ...r.room,
    photosCount: r.photos.length,
    activeParticipantsCount: r.participants.size
  }));
  res.json({ rooms: roomList });
});

// Create new room
app.post('/api/rooms', (req, res) => {
  const { title, description, hostName, tags } = req.body;
  const id = 'ws-' + Math.random().toString(36).substring(2, 8);
  const newRoom: WorkshopRoom = {
    id,
    title: title || '새로운 워크숍',
    description: description || '실시간으로 사진을 올리고 함께 공유하세요!',
    createdAt: Date.now(),
    hostName: hostName || '호스트',
    tags: tags && tags.length > 0 ? tags : ['#전체', '#현장스케치', '#팀미션', '#자유사진'],
    photosCount: 0,
    activeParticipantsCount: 0
  };
  rooms.set(id, {
    room: newRoom,
    photos: [],
    participants: new Map(),
    spotlightPhotoId: null
  });
  res.status(201).json(newRoom);
});

// Get room detail
app.get('/api/rooms/:roomId', (req, res) => {
  const roomData = rooms.get(req.params.roomId);
  if (!roomData) {
    return res.status(404).json({ error: 'Room not found' });
  }
  const state: RoomState = {
    room: {
      ...roomData.room,
      photosCount: roomData.photos.length,
      activeParticipantsCount: roomData.participants.size
    },
    photos: roomData.photos,
    participants: Array.from(roomData.participants.values()),
    spotlightPhotoId: roomData.spotlightPhotoId || undefined
  };
  res.json(state);
});

// Upload photo(s) to room
app.post('/api/rooms/:roomId/photos', (req, res) => {
  const { roomId } = req.params;
  const roomData = getOrCreateRoom(roomId);
  const { items, authorId, authorName, authorTeam, authorAvatarColor, tag } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'No photo items provided' });
  }

  const addedPhotos: PhotoItem[] = [];

  for (const item of items) {
    const photo: PhotoItem = {
      id: 'photo-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      roomId,
      url: item.url,
      caption: item.caption || '',
      authorId: authorId || 'guest',
      authorName: authorName || '익명 참가자',
      authorTeam: authorTeam || undefined,
      authorAvatarColor: authorAvatarColor || '#3b82f6',
      tag: item.tag || tag || '#현장스케치',
      createdAt: Date.now(),
      reactions: { '❤️': 0, '🔥': 0, '👏': 0, '🎉': 0, '💡': 0 },
      reactedBy: {},
      comments: [],
      width: item.width,
      height: item.height
    };

    // Prepend to room photos (newest first)
    roomData.photos.unshift(photo);
    addedPhotos.push(photo);
  }

  roomData.room.photosCount = roomData.photos.length;

  // Broadcast to all clients in this room
  if (addedPhotos.length === 1) {
    broadcastToRoom(roomId, { type: 'photo:added', photo: addedPhotos[0] });
  } else {
    broadcastToRoom(roomId, { type: 'photo:batch_added', photos: addedPhotos });
  }

  res.status(201).json({ addedCount: addedPhotos.length, photos: addedPhotos });
});

// Delete photo
app.delete('/api/rooms/:roomId/photos/:photoId', (req, res) => {
  const { roomId, photoId } = req.params;
  const roomData = rooms.get(roomId);
  if (!roomData) return res.status(404).json({ error: 'Room not found' });

  const initialCount = roomData.photos.length;
  roomData.photos = roomData.photos.filter(p => p.id !== photoId);

  if (roomData.photos.length !== initialCount) {
    roomData.room.photosCount = roomData.photos.length;
    broadcastToRoom(roomId, { type: 'photo:removed', photoId });
    return res.json({ success: true });
  }

  res.status(404).json({ error: 'Photo not found' });
});

// Add / toggle reaction
app.post('/api/rooms/:roomId/photos/:photoId/reactions', (req, res) => {
  const { roomId, photoId } = req.params;
  const { emoji, userName } = req.body;

  const roomData = rooms.get(roomId);
  if (!roomData) return res.status(404).json({ error: 'Room not found' });

  const photo = roomData.photos.find(p => p.id === photoId);
  if (!photo) return res.status(404).json({ error: 'Photo not found' });

  if (!photo.reactions) photo.reactions = {};
  if (!photo.reactedBy) photo.reactedBy = {};

  const currentCount = photo.reactions[emoji] || 0;
  const userList = photo.reactedBy[emoji] || [];

  const existingIndex = userList.indexOf(userName);
  if (existingIndex >= 0) {
    // Already reacted -> remove reaction
    userList.splice(existingIndex, 1);
    photo.reactions[emoji] = Math.max(0, currentCount - 1);
  } else {
    // Add reaction
    userList.push(userName);
    photo.reactions[emoji] = currentCount + 1;
  }
  photo.reactedBy[emoji] = userList;

  // Broadcast reaction update and reaction burst
  broadcastToRoom(roomId, {
    type: 'photo:reaction',
    photoId,
    emoji,
    userName,
    reactions: photo.reactions,
    reactedBy: photo.reactedBy
  });

  if (existingIndex < 0) {
    broadcastToRoom(roomId, {
      type: 'reaction:burst',
      emoji,
      userName,
      photoId
    });
  }

  res.json({ reactions: photo.reactions, reactedBy: photo.reactedBy });
});

// Add comment to photo
app.post('/api/rooms/:roomId/photos/:photoId/comments', (req, res) => {
  const { roomId, photoId } = req.params;
  const { text, userId, userName } = req.body;

  const roomData = rooms.get(roomId);
  if (!roomData) return res.status(404).json({ error: 'Room not found' });

  const photo = roomData.photos.find(p => p.id === photoId);
  if (!photo) return res.status(404).json({ error: 'Photo not found' });

  const comment: PhotoComment = {
    id: 'c-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    userId: userId || 'anon',
    userName: userName || '참가자',
    text: text.trim(),
    createdAt: Date.now()
  };

  photo.comments.push(comment);

  broadcastToRoom(roomId, {
    type: 'photo:comment',
    photoId,
    comment
  });

  res.status(201).json(comment);
});

// Spotlight photo for big screen presentation
app.post('/api/rooms/:roomId/spotlight', (req, res) => {
  const { roomId } = req.params;
  const { photoId, presenterName } = req.body;

  const roomData = rooms.get(roomId);
  if (!roomData) return res.status(404).json({ error: 'Room not found' });

  roomData.spotlightPhotoId = photoId || null;

  broadcastToRoom(roomId, {
    type: 'screen:spotlight',
    photoId: photoId || null,
    presenterName: presenterName || '발표자'
  });

  res.json({ spotlightPhotoId: roomData.spotlightPhotoId });
});

// WebSocket upgrade handling on '/ws'
server.on('upgrade', (request, socket, head) => {
  const host = request.headers.host || 'localhost:3000';
  const url = new URL(request.url || '', `http://${host}`);
  if (url.pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (ws: WebSocket) => {
  let boundMeta: ClientMeta | null = null;

  ws.on('message', (data: Buffer | string) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
        return;
      }

      if (msg.type === 'join') {
        const { roomId, user } = msg;
        if (!roomId || !user) return;

        const roomData = getOrCreateRoom(roomId);
        roomData.participants.set(user.id, user);

        boundMeta = {
          roomId,
          userId: user.id,
          ws
        };
        clients.set(ws, boundMeta);

        // Send full initial state to this newly connected user
        const state: RoomState = {
          room: {
            ...roomData.room,
            photosCount: roomData.photos.length,
            activeParticipantsCount: roomData.participants.size
          },
          photos: roomData.photos,
          participants: Array.from(roomData.participants.values()),
          spotlightPhotoId: roomData.spotlightPhotoId || undefined
        };
        ws.send(JSON.stringify({ type: 'init', state }));

        // Broadcast presence update to everyone in the room
        broadcastToRoom(roomId, {
          type: 'presence:update',
          participants: Array.from(roomData.participants.values())
        });
      }

      if (msg.type === 'leave') {
        if (boundMeta) {
          const roomData = rooms.get(boundMeta.roomId);
          if (roomData) {
            roomData.participants.delete(boundMeta.userId);
            broadcastToRoom(boundMeta.roomId, {
              type: 'presence:update',
              participants: Array.from(roomData.participants.values())
            });
          }
          clients.delete(ws);
          boundMeta = null;
        }
      }

      if (msg.type === 'reaction:burst') {
        if (boundMeta && msg.emoji) {
          broadcastToRoom(boundMeta.roomId, {
            type: 'reaction:burst',
            emoji: msg.emoji,
            userName: msg.userName || '참가자',
            photoId: msg.photoId
          });
        }
      }

      if (msg.type === 'screen:spotlight') {
        if (boundMeta) {
          const roomData = rooms.get(boundMeta.roomId);
          if (roomData) {
            roomData.spotlightPhotoId = msg.photoId || null;
            broadcastToRoom(boundMeta.roomId, {
              type: 'screen:spotlight',
              photoId: msg.photoId || null,
              presenterName: msg.presenterName || '발표자'
            });
          }
        }
      }
    } catch (e) {
      console.error('Failed to parse WebSocket message:', e);
    }
  });

  ws.on('close', () => {
    if (boundMeta) {
      const roomData = rooms.get(boundMeta.roomId);
      if (roomData) {
        roomData.participants.delete(boundMeta.userId);
        broadcastToRoom(boundMeta.roomId, {
          type: 'presence:update',
          participants: Array.from(roomData.participants.values())
        });
      }
      clients.delete(ws);
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
});

// Setup Vite or static serving
async function setupApp() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`SyncShot server listening on http://0.0.0.0:${PORT}`);
  });
}

setupApp();
