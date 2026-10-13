import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Download, Send, MessageSquare, Tv, Share2 } from 'lucide-react';
import type { PhotoItem, Participant } from '../types';

interface PhotoLightboxProps {
  photo: PhotoItem | null;
  photos: PhotoItem[];
  currentUser: Participant;
  isSpotlight: boolean;
  onClose: () => void;
  onNavigate: (photo: PhotoItem) => void;
  onToggleReaction: (photoId: string, emoji: string) => void;
  onAddComment: (photoId: string, text: string) => Promise<unknown>;
  onSetSpotlight: (photoId: string | null) => void;
}

const COMMON_EMOJIS = ['❤️', '🔥', '👏', '🎉', '💡', '😂'];

export const PhotoLightbox: React.FC<PhotoLightboxProps> = ({
  photo,
  photos,
  currentUser,
  isSpotlight,
  onClose,
  onNavigate,
  onToggleReaction,
  onAddComment,
  onSetSpotlight
}) => {
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!photo) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [photo, photos]);

  if (!photo) return null;

  const currentIndex = photos.findIndex((p) => p.id === photo.id);
  const handlePrev = () => {
    if (currentIndex > 0) onNavigate(photos[currentIndex - 1]);
    else onNavigate(photos[photos.length - 1]);
  };
  const handleNext = () => {
    if (currentIndex < photos.length - 1) onNavigate(photos[currentIndex + 1]);
    else onNavigate(photos[0]);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = photo.url;
    link.download = `workshop-${photo.tag.replace('#', '')}-${photo.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      await onAddComment(photo.id, commentText.trim());
      setCommentText('');
    } catch (err) {
      console.error('Failed to submit comment:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4">
      {/* Top control bar */}
      <div className="absolute top-4 inset-x-4 flex items-center justify-between z-20 pointer-events-none">
        <div className="pointer-events-auto flex items-center space-x-2">
          <span className="px-3 py-1 bg-white/10 backdrop-blur-md text-white rounded-full text-xs font-semibold">
            {currentIndex + 1} / {photos.length}
          </span>
          <span className="px-3 py-1 bg-blue-600/80 backdrop-blur-md text-white rounded-full text-xs font-semibold">
            {photo.tag}
          </span>
        </div>

        <div className="pointer-events-auto flex items-center space-x-2">
          {/* Spotlight button */}
          <button
            type="button"
            onClick={() => onSetSpotlight(isSpotlight ? null : photo.id)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
              isSpotlight
                ? 'bg-indigo-600 text-white'
                : 'bg-white/15 hover:bg-white/25 text-white'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>{isSpotlight ? '빔프로젝터 송출 중' : '빔프로젝터 송출'}</span>
          </button>

          {/* Download */}
          <button
            type="button"
            onClick={handleDownload}
            className="p-2 bg-white/15 hover:bg-white/25 text-white rounded-full transition-colors"
            title="원본 사진 다운로드"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-white/15 hover:bg-white/25 text-white rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation Arrows */}
      {photos.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-3 sm:left-6 z-20 p-2 sm:p-3 bg-white/15 hover:bg-white/30 text-white rounded-full backdrop-blur-md transition-transform transform active:scale-90"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-3 sm:right-6 z-20 p-2 sm:p-3 bg-white/15 hover:bg-white/30 text-white rounded-full backdrop-blur-md transition-transform transform active:scale-90"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Main Container */}
      <div className="relative w-full max-w-5xl h-[88vh] flex flex-col lg:flex-row bg-gray-950/80 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
        {/* Photo View */}
        <div className="flex-1 flex items-center justify-center p-4 bg-black/50 overflow-hidden relative">
          <img
            src={photo.url}
            alt={photo.caption}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
        </div>

        {/* Sidebar Info & Comments */}
        <div className="w-full lg:w-96 flex flex-col bg-gray-900 border-t lg:border-t-0 lg:border-l border-white/10 text-white h-72 lg:h-full">
          {/* Author Details */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center space-x-3 mb-2">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shadow shrink-0"
                style={{ backgroundColor: photo.authorAvatarColor || '#3b82f6' }}
              >
                {photo.authorName.slice(0, 1)}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center space-x-1.5">
                  <span>{photo.authorName}</span>
                  {photo.authorTeam && (
                    <span className="text-xs text-blue-400 font-normal">
                      ({photo.authorTeam})
                    </span>
                  )}
                </h4>
                <p className="text-[11px] text-gray-400">
                  {new Date(photo.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 업로드
                </p>
              </div>
            </div>

            {photo.caption && (
              <p className="text-sm text-gray-200 mt-2 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5">
                {photo.caption}
              </p>
            )}
          </div>

          {/* Real-time Emoji Reactions */}
          <div className="p-4 border-b border-white/10 bg-white/5">
            <span className="text-xs font-semibold text-gray-400 block mb-2">실시간 리액션 남기기</span>
            <div className="grid grid-cols-6 gap-1.5">
              {COMMON_EMOJIS.map((emoji) => {
                const count = photo.reactions?.[emoji] || 0;
                const hasReacted = photo.reactedBy?.[emoji]?.includes(currentUser.name);

                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => onToggleReaction(photo.id, emoji)}
                    className={`flex flex-col items-center py-2 px-1 rounded-xl transition-all ${
                      hasReacted
                        ? 'bg-blue-600/60 ring-2 ring-blue-400 font-bold scale-105'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    <span className="text-xl">{emoji}</span>
                    <span className="text-[11px] mt-0.5 text-gray-200">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="flex items-center space-x-1 text-xs font-semibold text-gray-400 mb-2">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>댓글 ({photo.comments?.length || 0})</span>
            </div>

            {(!photo.comments || photo.comments.length === 0) ? (
              <div className="text-center py-8 text-gray-500 text-xs">
                첫 번째 응원 댓글을 남겨보세요!
              </div>
            ) : (
              photo.comments.map((c) => (
                <div key={c.id} className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-gray-200">{c.userName}</span>
                    <span className="text-[10px] text-gray-500">
                      {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-gray-300 leading-relaxed">{c.text}</p>
                </div>
              ))
            )}
          </div>

          {/* Comment input form */}
          <form onSubmit={handleCommentSubmit} className="p-3 border-t border-white/10 bg-gray-950 flex items-center space-x-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="댓글 작성..."
              className="flex-1 px-3 py-2 text-xs bg-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!commentText.trim() || isSubmittingComment}
              className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
