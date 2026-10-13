import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, Maximize2, Minimize2, X, Sparkles, Filter, Users, Tv } from 'lucide-react';
import type { PhotoItem, WorkshopRoom } from '../types';

interface PresenterModeProps {
  room: WorkshopRoom | null;
  photos: PhotoItem[];
  spotlightPhotoId: string | null;
  onClose: () => void;
  onSetSpotlight: (photoId: string | null) => void;
  onToggleReaction: (photoId: string, emoji: string) => void;
}

export const PresenterMode: React.FC<PresenterModeProps> = ({
  room,
  photos,
  spotlightPhotoId,
  onClose,
  onSetSpotlight,
  onToggleReaction
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [intervalSec, setIntervalSec] = useState(6);
  const [selectedTag, setSelectedTag] = useState<string>('#전체');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Filter photos by selected tag
  const filteredPhotos = selectedTag === '#전체'
    ? photos
    : photos.filter((p) => p.tag === selectedTag);

  // If a spotlight photo ID is set externally, jump to it
  useEffect(() => {
    if (spotlightPhotoId) {
      const idx = filteredPhotos.findIndex((p) => p.id === spotlightPhotoId);
      if (idx !== -1) {
        setCurrentIndex(idx);
        setIsPlaying(false); // Pause auto-play when host spotlights a photo
      }
    }
  }, [spotlightPhotoId, filteredPhotos]);

  // Auto-play slideshow timer
  useEffect(() => {
    if (!isPlaying || filteredPhotos.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % filteredPhotos.length);
    }, intervalSec * 1000);

    return () => clearInterval(timer);
  }, [isPlaying, intervalSec, filteredPhotos.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => (prev - 1 + filteredPhotos.length) % filteredPhotos.length);
      } else if (e.key === 'ArrowRight') {
        setCurrentIndex((prev) => (prev + 1) % filteredPhotos.length);
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key === 'Escape') {
        if (!document.fullscreenElement) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredPhotos.length, onClose]);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const currentPhoto = filteredPhotos[currentIndex] || filteredPhotos[0];

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black text-white flex flex-col select-none overflow-hidden"
    >
      {/* Top Bar for Presenter */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-white/10 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-md z-30">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
            <span className="text-xs font-bold uppercase tracking-wider text-red-400 bg-red-950/60 px-2.5 py-0.5 rounded-full border border-red-800/60">
              LIVE 빔프로젝터 송출
            </span>
          </div>

          <h1 className="text-base sm:text-lg font-bold text-white truncate max-w-md">
            {room?.title || '워크숍 라이브 프레젠테이션'}
          </h1>
        </div>

        {/* Tag Filters for Mission Presentation */}
        <div className="hidden md:flex items-center space-x-1.5 bg-white/10 p-1 rounded-xl">
          <span className="text-xs text-gray-400 px-2 flex items-center space-x-1">
            <Filter className="w-3 h-3" />
            <span>필터:</span>
          </span>
          {['#전체', ...(room?.tags?.filter((t) => t !== '#전체') || [])].map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => {
                setSelectedTag(tag);
                setCurrentIndex(0);
              }}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                selectedTag === tag
                  ? 'bg-blue-600 text-white font-bold shadow'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-3">
          {/* Interval selector */}
          <div className="flex items-center space-x-1 bg-white/10 px-2 py-1 rounded-xl text-xs text-gray-300">
            <span>속도:</span>
            {[4, 7, 10].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setIntervalSec(sec)}
                className={`px-1.5 py-0.5 rounded ${
                  intervalSec === sec ? 'bg-blue-600 text-white font-bold' : 'hover:text-white'
                }`}
              >
                {sec}초
              </button>
            ))}
          </div>

          {/* Fullscreen button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
            title="전체 화면"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close Presenter Mode */}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-colors"
          >
            <X className="w-4 h-4" />
            <span>종료</span>
          </button>
        </div>
      </header>

      {/* Main Stage */}
      <div className="flex-1 relative flex items-center justify-center p-4 sm:p-10 overflow-hidden">
        {filteredPhotos.length === 0 ? (
          <div className="text-center p-8 bg-white/5 rounded-3xl border border-white/10 max-w-md">
            <Tv className="w-16 h-16 text-gray-500 mx-auto mb-4 animate-bounce" />
            <h3 className="text-xl font-bold text-white mb-2">공유된 사진이 없습니다</h3>
            <p className="text-sm text-gray-400">
              워크숍 참가자들이 사진을 업로드하면 이곳 대형 화면에 실시간으로 나타납니다.
            </p>
          </div>
        ) : (
          <div className="relative w-full h-full flex flex-col items-center justify-center max-w-6xl">
            {/* The Photo */}
            <div className="relative max-w-full max-h-[76vh] flex items-center justify-center group">
              <img
                src={currentPhoto.url}
                alt={currentPhoto.caption}
                className="max-w-full max-h-[74vh] object-contain rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10"
              />

              {/* Tag overlay */}
              <div className="absolute top-4 left-4">
                <span className="px-3.5 py-1.5 text-sm font-bold bg-black/70 backdrop-blur-md text-white rounded-full border border-white/20 shadow-lg">
                  {currentPhoto.tag}
                </span>
              </div>
            </div>

            {/* Photo details & author bar */}
            <div className="w-full max-w-3xl mt-4 px-6 py-3 bg-gray-900/90 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl flex items-center justify-between">
              <div className="flex items-center space-x-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow shrink-0"
                  style={{ backgroundColor: currentPhoto.authorAvatarColor || '#3b82f6' }}
                >
                  {currentPhoto.authorName.slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-base font-bold text-white">{currentPhoto.authorName}</span>
                    {currentPhoto.authorTeam && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">
                        {currentPhoto.authorTeam}
                      </span>
                    )}
                  </div>
                  {currentPhoto.caption && (
                    <p className="text-xs sm:text-sm text-gray-300 truncate mt-0.5">
                      {currentPhoto.caption}
                    </p>
                  )}
                </div>
              </div>

              {/* Live Reactions Bar on Stage */}
              <div className="flex items-center space-x-1.5 shrink-0 pl-4">
                {Object.entries(currentPhoto.reactions || {})
                  .filter(([_, count]) => count > 0)
                  .map(([emoji, count]) => (
                    <div
                      key={emoji}
                      onClick={() => onToggleReaction(currentPhoto.id, emoji)}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 cursor-pointer text-xs font-semibold text-white border border-white/10 transition-transform active:scale-95"
                    >
                      <span className="text-base">{emoji}</span>
                      <span>{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Previous / Next buttons */}
        {filteredPhotos.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setCurrentIndex((prev) => (prev - 1 + filteredPhotos.length) % filteredPhotos.length)}
              className="absolute left-6 z-20 p-4 bg-white/10 hover:bg-white/25 text-white rounded-full backdrop-blur-md transition-all transform active:scale-90"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentIndex((prev) => (prev + 1) % filteredPhotos.length)}
              className="absolute right-6 z-20 p-4 bg-white/10 hover:bg-white/25 text-white rounded-full backdrop-blur-md transition-all transform active:scale-90"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          </>
        )}
      </div>

      {/* Bottom Presenter Toolbar */}
      <footer className="px-6 py-3 border-t border-white/10 bg-black/90 backdrop-blur-md flex items-center justify-between z-30">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4" />
                <span>일시정지 (스페이스바)</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>자동 재생 (스페이스바)</span>
              </>
            )}
          </button>

          <span className="text-xs text-gray-400">
            {filteredPhotos.length > 0 ? `${currentIndex + 1} / ${filteredPhotos.length}장` : '0장'}
          </span>
        </div>

        {/* Live participant counter badge */}
        <div className="flex items-center space-x-2 text-xs text-gray-400">
          <Users className="w-4 h-4 text-emerald-400" />
          <span>동기화 참여자: {room?.activeParticipantsCount || 1}명 접속 중</span>
        </div>
      </footer>
    </div>
  );
};
