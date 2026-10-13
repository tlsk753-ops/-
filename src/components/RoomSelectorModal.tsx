import React, { useState, useEffect } from 'react';
import { X, Plus, FolderPlus, ArrowRight, Calendar, Users, Image as ImageIcon } from 'lucide-react';
import type { WorkshopRoom } from '../types';

interface RoomSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoomId: string;
  onSelectRoom: (roomId: string) => void;
}

export const RoomSelectorModal: React.FC<RoomSelectorModalProps> = ({
  isOpen,
  onClose,
  currentRoomId,
  onSelectRoom
}) => {
  const [rooms, setRooms] = useState<WorkshopRoom[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newHost, setNewHost] = useState('');
  const [newTags, setNewTags] = useState('#현장스케치, #팀미션, #아이스브레이킹, #자유사진');
  const [customRoomCode, setCustomRoomCode] = useState('');

  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        setRooms(data.rooms || []);
      }
    } catch (e) {
      console.error('Failed to load rooms:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRooms();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const tagArray = newTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => (t.startsWith('#') ? t : '#' + t));

      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          hostName: newHost.trim() || '호스트',
          tags: ['#전체', ...tagArray]
        })
      });

      if (res.ok) {
        const created: WorkshopRoom = await res.json();
        onSelectRoom(created.id);
        onClose();
      }
    } catch (err) {
      console.error('Failed to create room:', err);
    }
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRoomCode.trim()) return;
    onSelectRoom(customRoomCode.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden my-auto p-6 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-gray-900 mb-1">워크숍 세션 목록 및 생성</h3>
        <p className="text-xs text-gray-500 mb-5">
          진행 중인 워크숍 방으로 이동하거나 새로운 워크숍 방을 생성하세요.
        </p>

        {isCreating ? (
          <form onSubmit={handleCreateRoom} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                워크숍 제목
              </label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="예: 2026 하반기 전사 워크숍"
                className="w-full px-3 py-2 text-sm bg-gray-50 rounded-xl border border-gray-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                호스트 / 주관자 이름
              </label>
              <input
                type="text"
                value={newHost}
                onChange={(e) => setNewHost(e.target.value)}
                placeholder="예: 인재개발팀 김팀장"
                className="w-full px-3 py-2 text-sm bg-gray-50 rounded-xl border border-gray-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                태그 / 미션 구분 (쉼표로 구분)
              </label>
              <input
                type="text"
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
                placeholder="#현장스케치, #1조, #2조, #미션1"
                className="w-full px-3 py-2 text-sm bg-gray-50 rounded-xl border border-gray-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow"
              >
                새 워크숍 생성하기
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {/* Join by Code */}
            <form onSubmit={handleJoinByCode} className="flex items-center space-x-2">
              <input
                type="text"
                value={customRoomCode}
                onChange={(e) => setCustomRoomCode(e.target.value)}
                placeholder="방 코드 직접 입력 (예: workshop-2026)"
                className="flex-1 px-3 py-2 text-xs bg-gray-50 rounded-xl border border-gray-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-gray-800 hover:bg-black text-white text-xs font-bold rounded-xl whitespace-nowrap"
              >
                입장하기
              </button>
            </form>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-semibold text-gray-500">활성 워크숍 방 목록</span>
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-700 font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>새 방 만들기</span>
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {rooms.map((r) => {
                const isCurrent = r.id === currentRoomId;
                return (
                  <div
                    key={r.id}
                    onClick={() => {
                      onSelectRoom(r.id);
                      onClose();
                    }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isCurrent
                        ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50/70'
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-bold text-gray-900">{r.title}</h4>
                        {isCurrent && (
                          <span className="text-[10px] bg-blue-600 text-white font-bold px-2 py-0.5 rounded-full">
                            현재 방
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-3 text-[11px] text-gray-500 mt-1">
                        <span className="flex items-center space-x-1">
                          <ImageIcon className="w-3 h-3 text-gray-400" />
                          <span>사진 {r.photosCount || 0}장</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Users className="w-3 h-3 text-emerald-500" />
                          <span>참여자 {r.activeParticipantsCount || 0}명</span>
                        </span>
                        <span>코드: {r.id}</span>
                      </div>
                    </div>

                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
