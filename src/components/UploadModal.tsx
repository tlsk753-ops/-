import React, { useState, useRef } from 'react';
import { X, Upload, Camera, Image as ImageIcon, Loader2, Plus, Sparkles, Check } from 'lucide-react';
import { compressImage } from '../utils/imageCompressor';
import type { Participant } from '../types';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (items: { url: string; caption?: string; tag?: string; width?: number; height?: number }[]) => Promise<unknown>;
  currentUser: Participant;
  onUpdateUser: (user: Partial<Participant>) => void;
  availableTags: string[];
}

interface SelectedFilePreview {
  id: string;
  file: File;
  previewUrl: string;
  caption: string;
  tag: string;
  status: 'pending' | 'compressing' | 'ready';
  compressedData?: { dataUrl: string; width: number; height: number };
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  currentUser,
  onUpdateUser,
  availableTags
}) => {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFilePreview[]>([]);
  const [activeTag, setActiveTag] = useState<string>(availableTags[1] || '#현장스케치');
  const [customTagInput, setCustomTagInput] = useState<string>('');
  const [globalCaption, setGlobalCaption] = useState<string>('');
  const [authorName, setAuthorName] = useState<string>(currentUser.name);
  const [authorTeam, setAuthorTeam] = useState<string>(currentUser.team || '');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFilesChosen = async (files: FileList | File[]) => {
    setErrorMessage(null);
    const newItems: SelectedFilePreview[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      const id = 'pre-' + Math.random().toString(36).substring(2, 9);
      const previewUrl = URL.createObjectURL(file);
      newItems.push({
        id,
        file,
        previewUrl,
        caption: globalCaption,
        tag: activeTag,
        status: 'pending'
      });
    }

    if (newItems.length === 0) return;

    setSelectedFiles((prev) => [...prev, ...newItems]);

    // Compress in background
    for (const item of newItems) {
      try {
        const compressed = await compressImage(item.file);
        setSelectedFiles((prev) =>
          prev.map((p) =>
            p.id === item.id
              ? { ...p, status: 'ready', compressedData: compressed }
              : p
          )
        );
      } catch (err) {
        console.error('Compression error:', err);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesChosen(e.dataTransfer.files);
    }
  };

  const removeFile = (id: string) => {
    setSelectedFiles((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      setErrorMessage('공유할 사진을 1장 이상 선택해 주세요.');
      return;
    }

    // Save user profile updates
    if (authorName.trim() && (authorName !== currentUser.name || authorTeam !== currentUser.team)) {
      onUpdateUser({ name: authorName.trim(), team: authorTeam.trim() });
    }

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const itemsToUpload = await Promise.all(
        selectedFiles.map(async (item) => {
          let data = item.compressedData;
          if (!data) {
            data = await compressImage(item.file);
          }
          return {
            url: data.dataUrl,
            caption: item.caption.trim() || globalCaption.trim(),
            tag: item.tag || activeTag,
            width: data.width,
            height: data.height
          };
        })
      );

      await onUpload(itemsToUpload);
      setSelectedFiles([]);
      setGlobalCaption('');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '업로드 중 문제가 발생했습니다.';
      setErrorMessage(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddCustomTag = () => {
    if (!customTagInput.trim()) return;
    let formatted = customTagInput.trim();
    if (!formatted.startsWith('#')) formatted = '#' + formatted;
    setActiveTag(formatted);
    setCustomTagInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden my-auto max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-purple-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 leading-tight">사진 실시간 공유하기</h3>
              <p className="text-xs text-gray-500">올리는 즉시 모든 워크숍 참가자의 화면에 동기화됩니다</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* User Profile bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-gray-50/90 rounded-xl border border-gray-200/70">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">참가자 이름</label>
              <input
                type="text"
                required
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="홍길동"
                className="w-full px-3 py-1.5 text-sm bg-white rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">소속 팀 / 조 (선택)</label>
              <input
                type="text"
                value={authorTeam}
                onChange={(e) => setAuthorTeam(e.target.value)}
                placeholder="예: 1조, 기획팀, A팀"
                className="w-full px-3 py-1.5 text-sm bg-white rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Mission / Tag Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2 flex items-center justify-between">
              <span>워크숍 태그 / 미션 구분</span>
              <span className="text-[11px] text-gray-400 font-normal">사진 분류 및 발표 시 필터링에 사용됩니다</span>
            </label>
            <div className="flex flex-wrap gap-1.5 items-center">
              {availableTags.filter(t => t !== '#전체').map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setActiveTag(tag)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    activeTag === tag
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25 ring-2 ring-blue-600/30 font-semibold'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200/80'
                  }`}
                >
                  {tag}
                </button>
              ))}

              <div className="inline-flex items-center space-x-1 pl-1">
                <input
                  type="text"
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomTag();
                    }
                  }}
                  placeholder="#태그직접입력"
                  className="w-28 px-2 py-1 text-xs border border-dashed border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddCustomTag}
                  className="px-2 py-1 text-xs font-medium bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg"
                >
                  추가
                </button>
              </div>
            </div>
          </div>

          {/* Upload drop zone & camera triggers */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
              isDragging
                ? 'border-blue-500 bg-blue-50/60 scale-[1.01]'
                : selectedFiles.length > 0
                ? 'border-gray-200 bg-gray-50/50'
                : 'border-gray-300 hover:border-blue-400 bg-gray-50/30'
            }`}
          >
            {/* Hidden native inputs */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleFilesChosen(e.target.files);
              }}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleFilesChosen(e.target.files);
              }}
            />

            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-500/20 transition-all transform active:scale-95"
                >
                  <Upload className="w-4 h-4" />
                  <span>사진 파일 선택</span>
                </button>

                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-emerald-500/20 transition-all transform active:scale-95"
                >
                  <Camera className="w-4 h-4" />
                  <span>카메라로 즉시 촬영</span>
                </button>
              </div>

              <p className="text-xs text-gray-500">
                또는 사진을 여기로 드래그 앤 드롭 하세요 (여러 장 동시 업로드 가능)
              </p>
            </div>

            {/* Selected files preview strip */}
            {selectedFiles.length > 0 && (
              <div className="mt-5 pt-4 border-t border-gray-200/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-700">
                    선택된 사진 ({selectedFiles.length}장)
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>더 추가하기</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-48 overflow-y-auto p-1">
                  {selectedFiles.map((item) => (
                    <div key={item.id} className="relative group rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white aspect-square">
                      <img
                        src={item.previewUrl}
                        alt="preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile(item.id)}
                        className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/80 text-white rounded-full opacity-80 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-[2px] px-1.5 py-0.5 text-[10px] text-white truncate text-center">
                        {item.tag}
                      </div>
                      {item.status === 'compressing' && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Loader2 className="w-5 h-5 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Caption Input */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              사진 한 줄 설명 / 캡션 (선택)
            </label>
            <textarea
              rows={2}
              value={globalCaption}
              onChange={(e) => setGlobalCaption(e.target.value)}
              placeholder="예: 2조 팀 미션 현장 브레인스토밍! 다들 초집중 모드 🔥"
              className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
            />
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
              {errorMessage}
            </div>
          )}

          {/* Footer Submit */}
          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              disabled={isUploading}
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isUploading || selectedFiles.length === 0}
              className="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-500/25 transition-all transform active:scale-95 cursor-pointer disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>실시간 동기화 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{selectedFiles.length > 0 ? `${selectedFiles.length}장 즉시 올리기` : '사진 올리기'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
