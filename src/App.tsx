/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Camera,
  Tv,
  QrCode,
  Trophy,
  Upload,
  Users,
  Sparkles,
  Download,
  Filter,
  ArrowUpDown,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  Layers,
  Heart,
  Flame,
  CheckCircle2,
  Clock
} from 'lucide-react';

import type { Participant, PhotoItem } from './types';
import { useWorkshopSocket } from './hooks/useWorkshopSocket';
import { PhotoCard } from './components/PhotoCard';
import { PhotoLightbox } from './components/PhotoLightbox';
import { UploadModal } from './components/UploadModal';
import { PresenterMode } from './components/PresenterMode';
import { QRCodeModal } from './components/QRCodeModal';
import { AwardsModal } from './components/AwardsModal';
import { RoomSelectorModal } from './components/RoomSelectorModal';
import { FloatingReactions } from './components/FloatingReactions';

// Random avatar colors
const AVATAR_COLORS = [
  '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b',
  '#ec4899', '#06b6d4', '#6366f1', '#14b8a6'
];

function getStoredOrNewUser(): Participant {
  try {
    const saved = localStorage.getItem('syncshot_user');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {}

  const randomNum = Math.floor(100 + Math.random() * 900);
  const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  const newUser: Participant = {
    id: 'user-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    name: `참가자_${randomNum}`,
    team: '1조',
    avatarColor: color,
    joinedAt: Date.now()
  };

  try {
    localStorage.setItem('syncshot_user', JSON.stringify(newUser));
  } catch {}

  return newUser;
}

export default function App() {
  // Current user state
  const [currentUser, setCurrentUser] = useState<Participant>(getStoredOrNewUser);

  // Active room ID (from URL query param or default 'workshop-2026')
  const [roomId, setRoomId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const r = params.get('room');
      if (r) return r;
    }
    return 'workshop-2026';
  });

  // Socket & State Hook
  const {
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
    refreshState
  } = useWorkshopSocket({ roomId, currentUser });

  // Filtering & Sorting
  const [selectedTag, setSelectedTag] = useState<string>('#전체');
  const [sortBy, setSortBy] = useState<'newest' | 'popular'>('newest');

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isPresenterOpen, setIsPresenterOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isAwardsOpen, setIsAwardsOpen] = useState(false);
  const [isRoomSelectorOpen, setIsRoomSelectorOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);
  const [showParticipantsDropdown, setShowParticipantsDropdown] = useState(false);

  // Update user profile
  const handleUpdateUser = (updated: Partial<Participant>) => {
    setCurrentUser((prev) => {
      const next = { ...prev, ...updated };
      try {
        localStorage.setItem('syncshot_user', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Change room
  const handleSelectRoom = (newRoomId: string) => {
    setRoomId(newRoomId);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('room', newRoomId);
      window.history.pushState({}, '', url.toString());
    }
  };

  // Keep selectedPhoto in sync with real-time updates
  useEffect(() => {
    if (selectedPhoto) {
      const updated = photos.find((p) => p.id === selectedPhoto.id);
      if (updated) {
        setSelectedPhoto(updated);
      } else {
        setSelectedPhoto(null);
      }
    }
  }, [photos]);

  // Tags list
  const availableTags = useMemo(() => {
    const list = room?.tags && room.tags.length > 0
      ? room.tags
      : ['#전체', '#현장스케치', '#아이스브레이킹', '#팀미션', '#최종발표', '#자유사진'];
    if (!list.includes('#전체')) return ['#전체', ...list];
    return list;
  }, [room?.tags]);

  // Filtered & sorted photos
  const displayedPhotos = useMemo(() => {
    let result = [...photos];

    if (selectedTag !== '#전체') {
      result = result.filter((p) => p.tag === selectedTag);
    }

    if (sortBy === 'popular') {
      result.sort((a, b) => {
        const sumA = Object.values(a.reactions || {}).reduce((x, y) => x + y, 0);
        const sumB = Object.values(b.reactions || {}).reduce((x, y) => x + y, 0);
        return sumB - sumA;
      });
    } else {
      result.sort((a, b) => b.createdAt - a.createdAt);
    }

    return result;
  }, [photos, selectedTag, sortBy]);

  // Bulk download
  const handleDownloadAll = () => {
    if (displayedPhotos.length === 0) return;
    if (confirm(`현재 화면의 사진 ${displayedPhotos.length}장을 모두 다운로드하시겠습니까?`)) {
      displayedPhotos.forEach((photo, idx) => {
        setTimeout(() => {
          const a = document.createElement('a');
          a.href = photo.url;
          a.download = `workshop-${photo.tag.replace('#', '')}-${idx + 1}.jpg`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }, idx * 250);
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Floating Reaction Burst Layer */}
      <FloatingReactions bursts={bursts} />

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          {/* Logo & Workshop Room Info */}
          <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
            <div
              onClick={() => setIsRoomSelectorOpen(true)}
              className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 cursor-pointer transform hover:scale-105 transition-transform shrink-0"
              title="워크숍 방 목록 / 변경"
            >
              <Camera className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h1
                  onClick={() => setIsRoomSelectorOpen(true)}
                  className="text-base sm:text-lg font-black text-slate-900 truncate cursor-pointer hover:text-blue-600 transition-colors flex items-center space-x-1"
                >
                  <span className="truncate">{room?.title || '워크숍 라이브 사진 동기화'}</span>
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                </h1>

                {/* Connection Status indicator */}
                <div
                  className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    isConnected
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                      : 'bg-amber-50 text-amber-700 border border-amber-200/80'
                  }`}
                  title={isConnected ? '실시간 동기화 연결됨' : '동기화 재연결 중...'}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                    }`}
                  />
                  <span className="hidden sm:inline">
                    {isConnected ? '실시간 동기화' : '재연결 중'}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-xs text-slate-500 mt-0.5">
                <button
                  type="button"
                  onClick={() => setIsQrOpen(true)}
                  className="font-medium text-blue-600 hover:text-blue-700 hover:underline flex items-center space-x-1"
                >
                  <span>코드: {roomId}</span>
                  <QrCode className="w-3.5 h-3.5" />
                </button>
                <span>•</span>
                <span>사진 {photos.length}장</span>
              </div>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Live Participants Popover Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowParticipantsDropdown((p) => !p)}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 text-slate-700 transition-colors"
                title="현재 접속 중인 참가자"
              >
                <Users className="w-4 h-4 text-emerald-600" />
                <span className="font-bold">{participants.length}</span>
                <span className="hidden md:inline">명 참여</span>
              </button>

              {/* Participants Dropdown */}
              {showParticipantsDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                    <span className="text-xs font-bold text-slate-800">
                      실시간 동기화 참여자 ({participants.length}명)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowParticipantsDropdown(false)}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      닫기
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1.5">
                    {participants.map((p) => (
                      <div key={p.id} className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-slate-50">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                          style={{ backgroundColor: p.avatarColor || '#3b82f6' }}
                        >
                          {p.name.slice(0, 1)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-800 truncate">
                            {p.name} {p.id === currentUser.id && '(나)'}
                          </p>
                          {p.team && <p className="text-[10px] text-slate-400 truncate">{p.team}</p>}
                        </div>
                        {p.isHost && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 font-bold rounded">
                            진행자
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* QR Code Share Button */}
            <button
              type="button"
              onClick={() => setIsQrOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 text-slate-700 transition-colors"
              title="스마트폰 연결 QR 코드"
            >
              <QrCode className="w-4 h-4 text-blue-600" />
              <span className="hidden sm:inline">스마트폰 QR</span>
            </button>

            {/* Presenter / Projector Mode Button */}
            <button
              type="button"
              onClick={() => setIsPresenterOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/70 transition-colors"
              title="대형 스크린 / 빔프로젝터 모드"
            >
              <Tv className="w-4 h-4 text-indigo-600" />
              <span className="hidden md:inline">빔프로젝터 모드</span>
            </button>

            {/* Awards Button */}
            <button
              type="button"
              onClick={() => setIsAwardsOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/70 transition-colors"
              title="베스트 포토 어워드"
            >
              <Trophy className="w-4 h-4 text-amber-600" />
              <span className="hidden lg:inline">어워드</span>
            </button>

            {/* Upload Button (Primary) */}
            <button
              type="button"
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-500/25 transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>사진 올리기</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full space-y-6">
        {/* Workshop Banner / Subtitle */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-semibold mb-3 border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              <span>실시간 동기화 라이브 갤러리</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              {room?.title || '워크숍 현장 사진 실시간 공유'}
            </h2>
            <p className="text-xs sm:text-sm text-blue-100 mt-2 leading-relaxed">
              {room?.description || '참가자가 사진을 올리면 1초 만에 모두의 화면과 발표자 스크린에 즉시 동기화됩니다.'}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setIsUploadOpen(true)}
                className="flex items-center space-x-2 px-4 py-2.5 bg-white text-blue-700 hover:bg-blue-50 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Camera className="w-4 h-4 text-blue-600" />
                <span>스마트폰/PC 사진 추가하기</span>
              </button>

              <button
                type="button"
                onClick={() => setIsQrOpen(true)}
                className="flex items-center space-x-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs sm:text-sm font-semibold backdrop-blur-md transition-all cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
                <span>모바일 QR 코드로 참여 초대</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPresenterOpen(true)}
                className="flex items-center space-x-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs sm:text-sm font-semibold backdrop-blur-md transition-all cursor-pointer"
              >
                <Tv className="w-4 h-4" />
                <span>발표자 빔프로젝터 뷰 열기</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter & Sort Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
          {/* Mission Tag Filter Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
            <span className="text-xs font-semibold text-slate-400 pl-1 pr-1 flex items-center space-x-1 shrink-0">
              <Filter className="w-3.5 h-3.5" />
              <span>미션:</span>
            </span>

            {availableTags.map((tag) => {
              const count = tag === '#전체'
                ? photos.length
                : photos.filter((p) => p.tag === tag).length;

              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(tag)}
                  className={`px-3 py-1.5 text-xs rounded-xl font-semibold transition-all shrink-0 flex items-center space-x-1.5 ${
                    selectedTag === tag
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                      : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600'
                  }`}
                >
                  <span>{tag}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      selectedTag === tag ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Sort & Bulk Download Controls */}
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            {/* Sort Toggle */}
            <div className="inline-flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSortBy('newest')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  sortBy === 'newest'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                최신순
              </button>
              <button
                type="button"
                onClick={() => setSortBy('popular')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  sortBy === 'popular'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                인기순
              </button>
            </div>

            {/* Bulk download */}
            {displayedPhotos.length > 0 && (
              <button
                type="button"
                onClick={handleDownloadAll}
                className="flex items-center space-x-1 px-3 py-2 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-xl text-xs font-semibold transition-colors shrink-0"
                title="현재 필터된 모든 사진 저장"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">전체 저장</span>
              </button>
            )}

            {/* Refresh */}
            <button
              type="button"
              onClick={refreshState}
              className="p-2 bg-slate-100 hover:bg-slate-200/80 text-slate-600 rounded-xl transition-colors shrink-0"
              title="새로고침"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Gallery Grid */}
        {displayedPhotos.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
              <Camera className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {selectedTag === '#전체' ? '공유된 사진이 없습니다' : `${selectedTag} 태그의 사진이 없습니다`}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
              첫 번째 사진을 올려 워크숍 추억과 미션 결과물을 다른 참가자들과 실시간으로 공유해 보세요!
            </p>
            <button
              type="button"
              onClick={() => setIsUploadOpen(true)}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-500/25 transition-transform active:scale-95 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>사진 첫 번째로 올리기</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {displayedPhotos.map((photo) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                currentUser={currentUser}
                isSpotlight={spotlightPhotoId === photo.id}
                onSelect={(p) => setSelectedPhoto(p)}
                onToggleReaction={toggleReaction}
                onSetSpotlight={setSpotlight}
                onDelete={deletePhoto}
              />
            ))}
          </div>
        )}
      </main>

      {/* Quick Live Cheer Bar at bottom */}
      <aside aria-label="워크숍 실시간 응원" className="sticky bottom-4 z-30 max-w-md mx-auto px-4 w-full pointer-events-none">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-2xl p-2.5 flex items-center justify-between pointer-events-auto">
          <span className="text-xs font-bold text-slate-600 pl-2 hidden sm:inline">실시간 응원:</span>
          <div className="flex items-center space-x-1 sm:space-x-1.5 flex-1 justify-around">
            {['❤️', '🔥', '👏', '🎉', '💡', '😂'].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => sendReactionBurst(emoji)}
                className="p-1.5 sm:p-2 text-xl sm:text-2xl hover:scale-125 active:scale-90 transition-transform rounded-xl hover:bg-slate-100"
                title={`${emoji} 응원 보내기`}
              >
                {emoji}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            className="ml-1 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-sm cursor-pointer"
            title="사진 올리기"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6 px-4 text-center text-xs text-slate-500">
        <p>SyncShot 워크숍 실시간 사진 공유 플랫폼 • 누구나 스마트폰으로 바로 촬영 및 업로드 가능</p>
      </footer>

      {/* Modals */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUpload={uploadPhotos}
        currentUser={currentUser}
        onUpdateUser={handleUpdateUser}
        availableTags={availableTags}
      />

      <PhotoLightbox
        photo={selectedPhoto}
        photos={displayedPhotos}
        currentUser={currentUser}
        isSpotlight={spotlightPhotoId === selectedPhoto?.id}
        onClose={() => setSelectedPhoto(null)}
        onNavigate={(p) => setSelectedPhoto(p)}
        onToggleReaction={toggleReaction}
        onAddComment={addComment}
        onSetSpotlight={setSpotlight}
      />

      {isPresenterOpen && (
        <PresenterMode
          room={room}
          photos={photos}
          spotlightPhotoId={spotlightPhotoId}
          onClose={() => setIsPresenterOpen(false)}
          onSetSpotlight={setSpotlight}
          onToggleReaction={toggleReaction}
        />
      )}

      <QRCodeModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        room={room}
      />

      <AwardsModal
        isOpen={isAwardsOpen}
        onClose={() => setIsAwardsOpen(false)}
        photos={photos}
        onSelectPhoto={(p) => setSelectedPhoto(p)}
      />

      <RoomSelectorModal
        isOpen={isRoomSelectorOpen}
        onClose={() => setIsRoomSelectorOpen(false)}
        currentRoomId={roomId}
        onSelectRoom={handleSelectRoom}
      />
    </div>
  );
}
