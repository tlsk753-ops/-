import { useEffect, useRef, useState, useCallback } from 'react';
import type { Participant, PhotoItem, WorkshopRoom, RoomState, PhotoComment } from '../types';

export interface FloatingBurstItem {
  id: string;
  emoji: string;
  userName: string;
  photoId?: string;
  leftOffset: number; // percentage across screen bottom
}

interface UseWorkshopSocketOptions {
  roomId: string;
  currentUser: Participant;
}

export function useWorkshopSocket({ roomId, currentUser }: UseWorkshopSocketOptions) {
  const [room, setRoom] = useState<WorkshopRoom | null>(null);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [spotlightPhotoId, setSpotlightPhotoId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [bursts, setBursts] = useState<FloatingBurstItem[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const isUnmountedRef = useRef<boolean>(false);

  // Helper to trigger burst animation
  const triggerBurst = useCallback((emoji: string, userName: string, photoId?: string) => {
    const newBurst: FloatingBurstItem = {
      id: 'burst-' + Math.random().toString(36).substring(2, 9),
      emoji,
      userName,
      photoId,
      leftOffset: 15 + Math.random() * 70 // 15% to 85%
    };
    setBursts((prev) => [...prev.slice(-15), newBurst]);

    // Auto remove after 3.5 seconds
    setTimeout(() => {
      setBursts((prev) => prev.filter((b) => b.id !== newBurst.id));
    }, 3500);
  }, []);

  // Fetch initial state via REST as reliable baseline
  const fetchRoomState = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}`);
      if (res.ok) {
        const data: RoomState = await res.json();
        setRoom(data.room);
        setPhotos(data.photos);
        setParticipants(data.participants);
        if (data.spotlightPhotoId) {
          setSpotlightPhotoId(data.spotlightPhotoId);
        }
      }
    } catch (err) {
      console.warn('Initial REST fetch error:', err);
    }
  }, [roomId]);

  // Connect WebSocket
  const connect = useCallback(() => {
    if (isUnmountedRef.current) return;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;

        // Join room
        ws.send(JSON.stringify({
          type: 'join',
          roomId,
          user: currentUser
        }));

        // Ping heartbeat
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 20000);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          switch (msg.type) {
            case 'init': {
              const state: RoomState = msg.state;
              setRoom(state.room);
              setPhotos(state.photos);
              setParticipants(state.participants);
              if (state.spotlightPhotoId !== undefined) {
                setSpotlightPhotoId(state.spotlightPhotoId);
              }
              break;
            }

            case 'presence:update': {
              setParticipants(msg.participants);
              setRoom((prev) => prev ? { ...prev, activeParticipantsCount: msg.participants.length } : null);
              break;
            }

            case 'photo:added': {
              const newPhoto: PhotoItem = msg.photo;
              setPhotos((prev) => {
                if (prev.some((p) => p.id === newPhoto.id)) return prev;
                return [newPhoto, ...prev];
              });
              setRoom((prev) => prev ? { ...prev, photosCount: prev.photosCount + 1 } : null);
              break;
            }

            case 'photo:batch_added': {
              const incomingList: PhotoItem[] = msg.photos;
              setPhotos((prev) => {
                const existingIds = new Set(prev.map((p) => p.id));
                const newOnly = incomingList.filter((p) => !existingIds.has(p.id));
                return [...newOnly, ...prev];
              });
              setRoom((prev) => prev ? { ...prev, photosCount: prev.photosCount + incomingList.length } : null);
              break;
            }

            case 'photo:removed': {
              setPhotos((prev) => prev.filter((p) => p.id !== msg.photoId));
              setRoom((prev) => prev ? { ...prev, photosCount: Math.max(0, prev.photosCount - 1) } : null);
              setSpotlightPhotoId((prev) => (prev === msg.photoId ? null : prev));
              break;
            }

            case 'photo:reaction': {
              setPhotos((prev) =>
                prev.map((p) =>
                  p.id === msg.photoId
                    ? { ...p, reactions: msg.reactions, reactedBy: msg.reactedBy }
                    : p
                )
              );
              break;
            }

            case 'photo:comment': {
              const comment: PhotoComment = msg.comment;
              setPhotos((prev) =>
                prev.map((p) =>
                  p.id === msg.photoId
                    ? { ...p, comments: [...(p.comments || []), comment] }
                    : p
                )
              );
              break;
            }

            case 'reaction:burst': {
              triggerBurst(msg.emoji, msg.userName, msg.photoId);
              break;
            }

            case 'screen:spotlight': {
              setSpotlightPhotoId(msg.photoId);
              break;
            }

            default:
              break;
          }
        } catch (e) {
          console.error('Error handling WebSocket message:', e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

        if (!isUnmountedRef.current) {
          const timeout = Math.min(1000 * Math.pow(1.5, reconnectAttemptsRef.current), 8000);
          reconnectAttemptsRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, timeout);
        }
      };

      ws.onerror = (e) => {
        console.warn('WebSocket connection error, will reconnect:', e);
        ws.close();
      };
    } catch (e) {
      console.error('Failed to initialize WebSocket:', e);
    }
  }, [roomId, currentUser, triggerBurst]);

  useEffect(() => {
    isUnmountedRef.current = false;
    fetchRoomState();
    connect();

    return () => {
      isUnmountedRef.current = true;
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'leave', roomId, userId: currentUser.id }));
        }
        wsRef.current.close();
      }
    };
  }, [roomId, currentUser.id, connect, fetchRoomState]);

  // Upload photos (Optimistic + REST)
  const uploadPhotos = useCallback(async (
    items: { url: string; caption?: string; tag?: string; width?: number; height?: number }[]
  ) => {
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          authorId: currentUser.id,
          authorName: currentUser.name,
          authorTeam: currentUser.team,
          authorAvatarColor: currentUser.avatarColor
        })
      });
      if (!res.ok) {
        throw new Error('사진 업로드 실패');
      }
      const data = await res.json();
      return data;
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  }, [roomId, currentUser]);

  // Toggle reaction
  const toggleReaction = useCallback(async (photoId: string, emoji: string) => {
    // Send burst via WS immediately
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'reaction:burst',
        emoji,
        userName: currentUser.name,
        photoId
      }));
    }

    try {
      await fetch(`/api/rooms/${encodeURIComponent(roomId)}/photos/${encodeURIComponent(photoId)}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emoji,
          userName: currentUser.name
        })
      });
    } catch (error) {
      console.error('Reaction toggle failed:', error);
    }
  }, [roomId, currentUser.name]);

  // Send pure reaction burst (cheer button)
  const sendReactionBurst = useCallback((emoji: string, photoId?: string) => {
    triggerBurst(emoji, currentUser.name, photoId);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'reaction:burst',
        emoji,
        userName: currentUser.name,
        photoId
      }));
    }
  }, [currentUser.name, triggerBurst]);

  // Add comment
  const addComment = useCallback(async (photoId: string, text: string) => {
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/photos/${encodeURIComponent(photoId)}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          userId: currentUser.id,
          userName: currentUser.name
        })
      });
      if (!res.ok) throw new Error('댓글 작성 실패');
      return await res.json();
    } catch (error) {
      console.error('Comment failed:', error);
      throw error;
    }
  }, [roomId, currentUser]);

  // Delete photo
  const deletePhoto = useCallback(async (photoId: string) => {
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/photos/${encodeURIComponent(photoId)}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('사진 삭제 실패');
      return true;
    } catch (error) {
      console.error('Delete photo failed:', error);
      throw error;
    }
  }, [roomId]);

  // Spotlight photo on big screen
  const setSpotlight = useCallback(async (photoId: string | null) => {
    try {
      setSpotlightPhotoId(photoId);
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'screen:spotlight',
          photoId,
          presenterName: currentUser.name
        }));
      }
      await fetch(`/api/rooms/${encodeURIComponent(roomId)}/spotlight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoId,
          presenterName: currentUser.name
        })
      });
    } catch (error) {
      console.error('Spotlight failed:', error);
    }
  }, [roomId, currentUser.name]);

  return {
    room,
    photos,
    participants,
    spotlightPhotoId,
    isConnected,
    bursts,
    uploadPhotos,
    toggleReaction,
    sendReactionBurst,
    addComment,
    deletePhoto,
    setSpotlight,
    refreshState: fetchRoomState
  };
}
