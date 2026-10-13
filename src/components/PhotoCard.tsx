import React from 'react';
import { Heart, Flame, MessageSquare, Download, Trash2, Tv, Sparkles } from 'lucide-react';
import type { PhotoItem, Participant } from '../types';

interface PhotoCardProps {
  photo: PhotoItem;
  currentUser: Participant;
  isSpotlight: boolean;
  onSelect: (photo: PhotoItem) => void;
  onToggleReaction: (photoId: string, emoji: string) => void;
  onSetSpotlight: (photoId: string | null) => void;
  onDelete: (photoId: string) => void;
}

const COMMON_EMOJIS = ['❤️', '🔥', '👏', '🎉', '💡', '😂'];

function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 45) return '방금 전';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;
  return `${Math.floor(diffHr / 24)}일 전`;
}

export const PhotoCard: React.FC<PhotoCardProps> = ({
  photo,
  currentUser,
  isSpotlight,
  onSelect,
  onToggleReaction,
  onSetSpotlight,
  onDelete
}) => {
  const isAuthor = photo.authorId === currentUser.id;
  const canDelete = isAuthor || currentUser.isHost;

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = photo.url;
    link.download = `workshop-${photo.tag.replace('#', '')}-${photo.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalReactionsCount = Object.values(photo.reactions || {}).reduce((a, b) => a + b, 0);

  return (
    <div
      className={`group relative bg-white rounded-2xl overflow-hidden border transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 flex flex-col ${
        isSpotlight
          ? 'ring-4 ring-indigo-500 shadow-indigo-200 border-indigo-400'
          : 'border-gray-200/80 hover:border-blue-300'
      }`}
    >
      {/* Spotlight badge if currently projected on big screen */}
      {isSpotlight && (
        <div className="absolute top-3 left-3 z-20 px-2.5 py-1 bg-indigo-600/90 text-white text-xs font-bold rounded-full shadow-lg backdrop-blur-md flex items-center space-x-1.5 animate-pulse">
          <Tv className="w-3.5 h-3.5" />
          <span>빔프로젝터 송출 중</span>
        </div>
      )}

      {/* Image Container */}
      <div
        onClick={() => onSelect(photo)}
        className="relative aspect-4/3 w-full bg-gray-100 overflow-hidden cursor-pointer"
      >
        <img
          src={photo.url}
          alt={photo.caption || 'Workshop photo'}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Overlay Action Buttons on Hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-3 flex flex-col justify-between">
          <div className="flex items-center justify-end space-x-1.5">
            {/* Spotlight button */}
            <button
              type="button"
              title={isSpotlight ? '빔프로젝터 송출 끄기' : '빔프로젝터에 띄우기'}
              onClick={(e) => {
                e.stopPropagation();
                onSetSpotlight(isSpotlight ? null : photo.id);
              }}
              className={`p-2 rounded-xl backdrop-blur-md transition-colors ${
                isSpotlight
                  ? 'bg-indigo-600 text-white'
                  : 'bg-black/40 hover:bg-black/60 text-white'
              }`}
            >
              <Tv className="w-4 h-4" />
            </button>

            {/* Download button */}
            <button
              type="button"
              title="사진 다운로드"
              onClick={handleDownload}
              className="p-2 bg-black/40 hover:bg-black/60 text-white rounded-xl backdrop-blur-md transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Delete button */}
            {canDelete && (
              <button
                type="button"
                title="사진 삭제"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('이 사진을 삭제하시겠습니까?')) {
                    onDelete(photo.id);
                  }
                }}
                className="p-2 bg-red-600/80 hover:bg-red-600 text-white rounded-xl backdrop-blur-md transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="text-white text-xs font-medium line-clamp-2 drop-shadow-sm">
            {photo.caption || '자세히 보기'}
          </div>
        </div>

        {/* Tag Badge */}
        <div className="absolute bottom-2.5 left-2.5 z-10">
          <span className="px-2.5 py-0.5 text-[11px] font-bold bg-black/60 backdrop-blur-md text-white rounded-full shadow border border-white/20">
            {photo.tag}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-3.5 flex flex-col flex-1 justify-between space-y-3">
        {/* Caption */}
        {photo.caption && (
          <p
            onClick={() => onSelect(photo)}
            className="text-xs font-medium text-gray-800 line-clamp-2 leading-relaxed cursor-pointer hover:text-blue-600 transition-colors"
          >
            {photo.caption}
          </p>
        )}

        {/* Author info */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center space-x-2 min-w-0">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-sm shrink-0"
              style={{ backgroundColor: photo.authorAvatarColor || '#3b82f6' }}
            >
              {photo.authorName.slice(0, 1)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate flex items-center space-x-1">
                <span>{photo.authorName}</span>
                {photo.authorTeam && (
                  <span className="text-[10px] text-gray-500 font-normal truncate">
                    ({photo.authorTeam})
                  </span>
                )}
              </p>
              <p className="text-[10px] text-gray-400">{formatRelativeTime(photo.createdAt)}</p>
            </div>
          </div>

          {/* Comment count indicator */}
          {photo.comments && photo.comments.length > 0 && (
            <div
              onClick={() => onSelect(photo)}
              className="flex items-center space-x-1 text-gray-400 hover:text-blue-600 text-xs cursor-pointer px-1.5 py-0.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium">{photo.comments.length}</span>
            </div>
          )}
        </div>

        {/* Reaction Bar */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
          <div className="flex flex-wrap gap-1 items-center">
            {COMMON_EMOJIS.map((emoji) => {
              const count = photo.reactions?.[emoji] || 0;
              const hasReacted = photo.reactedBy?.[emoji]?.includes(currentUser.name);

              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleReaction(photo.id, emoji);
                  }}
                  className={`px-2 py-1 text-xs rounded-lg transition-all flex items-center space-x-1 ${
                    hasReacted
                      ? 'bg-blue-100/90 text-blue-700 font-bold scale-105 ring-1 ring-blue-400'
                      : count > 0
                      ? 'bg-gray-100/90 text-gray-700 hover:bg-gray-200'
                      : 'hover:bg-gray-100 text-gray-400 opacity-60 hover:opacity-100'
                  }`}
                  title={`${emoji} 반응 남기기`}
                >
                  <span className="text-sm leading-none">{emoji}</span>
                  {count > 0 && <span className="text-[11px]">{count}</span>}
                </button>
              );
            })}
          </div>

          {totalReactionsCount > 0 && (
            <span className="text-[11px] font-semibold text-gray-400 pl-1 shrink-0">
              총 {totalReactionsCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
