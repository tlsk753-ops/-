export interface Participant {
  id: string;
  name: string;
  team?: string;
  avatarColor: string;
  isHost?: boolean;
  joinedAt: number;
}

export interface PhotoComment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: number;
}

export interface PhotoItem {
  id: string;
  roomId: string;
  url: string; // Data URL or Image URL
  caption: string;
  authorId: string;
  authorName: string;
  authorTeam?: string;
  authorAvatarColor: string;
  tag: string; // e.g. '#아이스브레이킹', '#팀미션', '#현장스케치'
  createdAt: number;
  reactions: Record<string, number>; // emoji -> count
  reactedBy: Record<string, string[]>; // emoji -> [userNames]
  comments: PhotoComment[];
  width?: number;
  height?: number;
}

export interface WorkshopRoom {
  id: string;
  title: string;
  description: string;
  createdAt: number;
  hostName: string;
  tags: string[];
  photosCount: number;
  activeParticipantsCount: number;
}

export interface RoomState {
  room: WorkshopRoom;
  photos: PhotoItem[];
  participants: Participant[];
  spotlightPhotoId?: string;
}

export type WsMessage =
  | { type: 'join'; roomId: string; user: Participant }
  | { type: 'leave'; roomId: string; userId: string }
  | { type: 'ping' }
  | { type: 'init'; state: RoomState }
  | { type: 'presence:update'; participants: Participant[] }
  | { type: 'photo:added'; photo: PhotoItem }
  | { type: 'photo:batch_added'; photos: PhotoItem[] }
  | { type: 'photo:removed'; photoId: string }
  | { type: 'photo:reaction'; photoId: string; emoji: string; userName: string; reactions: Record<string, number>; reactedBy: Record<string, string[]> }
  | { type: 'photo:comment'; photoId: string; comment: PhotoComment }
  | { type: 'reaction:burst'; emoji: string; userName: string; photoId?: string }
  | { type: 'screen:spotlight'; photoId: string | null; presenterName: string }
  | { type: 'error'; message: string };
