import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { X, Trophy, Medal, Sparkles, Heart } from 'lucide-react';
import type { PhotoItem } from '../types';

interface AwardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: PhotoItem[];
  onSelectPhoto: (photo: PhotoItem) => void;
}

export const AwardsModal: React.FC<AwardsModalProps> = ({
  isOpen,
  onClose,
  photos,
  onSelectPhoto
}) => {
  useEffect(() => {
    if (isOpen) {
      // Fire confetti bursts!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      setTimeout(() => {
        confetti({
          particleCount: 60,
          angle: 60,
          spread: 55,
          origin: { x: 0 }
        });
        confetti({
          particleCount: 60,
          angle: 120,
          spread: 55,
          origin: { x: 1 }
        });
      }, 350);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Calculate top photos by reaction sum
  const rankedPhotos = [...photos]
    .map((p) => {
      const score = Object.values(p.reactions || {}).reduce((a, b) => a + b, 0);
      return { photo: p, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const medalStyles = [
    { title: '1위 대상 (금메달)', border: 'border-yellow-400 bg-yellow-50/50', badge: 'bg-yellow-500 text-yellow-950', icon: '🥇' },
    { title: '2위 최우수상 (은메달)', border: 'border-slate-300 bg-slate-50/50', badge: 'bg-slate-400 text-slate-950', icon: '🥈' },
    { title: '3위 우수상 (동메달)', border: 'border-amber-600 bg-amber-50/40', badge: 'bg-amber-600 text-white', icon: '🥉' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden my-auto p-6 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-inner">
            <Trophy className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-black text-gray-900">🏆 워크숍 베스트 포토 어워드</h3>
          <p className="text-xs text-gray-500 mt-1">
            참가자들의 실시간 반응과 투표를 가장 많이 받은 명예의 전당 사진입니다!
          </p>
        </div>

        {rankedPhotos.length === 0 || rankedPhotos[0].score === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            아직 리액션을 받은 사진이 없습니다. 마음에 드는 사진에 이모지 반응을 남겨보세요!
          </div>
        ) : (
          <div className="space-y-4">
            {rankedPhotos.map(({ photo, score }, index) => {
              const style = medalStyles[index] || medalStyles[2];
              return (
                <div
                  key={photo.id}
                  onClick={() => {
                    onClose();
                    onSelectPhoto(photo);
                  }}
                  className={`p-4 rounded-2xl border-2 ${style.border} flex flex-col sm:flex-row items-center gap-4 cursor-pointer hover:shadow-lg transition-all group`}
                >
                  <div className="flex items-center space-x-3 w-full sm:w-auto">
                    <span className="text-3xl shrink-0">{style.icon}</span>
                    <div className="w-20 h-20 rounded-xl overflow-hidden border border-gray-200 shrink-0 bg-gray-100">
                      <img
                        src={photo.url}
                        alt="ranked"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${style.badge}`}>
                        {style.title}
                      </span>
                      <span className="text-xs font-bold text-gray-900 truncate">
                        {photo.authorName} {photo.authorTeam && `(${photo.authorTeam})`}
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                      {photo.caption || photo.tag}
                    </p>

                    <div className="mt-2 flex items-center space-x-3 text-xs text-gray-500">
                      <span className="font-semibold text-blue-600">
                        총 {score}개 리액션 획득
                      </span>
                      <span className="text-gray-400">태그: {photo.tag}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-gray-100 text-center">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-900 hover:bg-black text-white text-sm font-bold rounded-xl transition-colors"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
