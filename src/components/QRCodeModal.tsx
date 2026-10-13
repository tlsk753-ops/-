import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, QrCode as QrIcon, Smartphone, ExternalLink } from 'lucide-react';
import type { WorkshopRoom } from '../types';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: WorkshopRoom | null;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ isOpen, onClose, room }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const roomUrl = typeof window !== 'undefined'
    ? `${window.location.origin}?room=${room?.id || ''}`
    : '';

  useEffect(() => {
    if (!isOpen || !room) return;

    QRCode.toDataURL(roomUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#1e293b',
        light: '#ffffff'
      }
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR code:', err));
  }, [isOpen, room, roomUrl]);

  if (!isOpen || !room) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(roomUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
          <QrIcon className="w-6 h-6" />
        </div>

        <h3 className="text-xl font-bold text-gray-900 mb-1">참가자 스마트폰 즉시 접속 QR</h3>
        <p className="text-xs text-gray-500 mb-5">
          스마트폰 기본 카메라로 비추면 별도 앱 설치 없이 즉시 사진을 올릴 수 있습니다.
        </p>

        {/* QR Code Graphic */}
        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/80 mx-auto mb-4 flex items-center justify-center shadow-sm">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Workshop Room QR Code" className="w-56 h-56 rounded-lg" />
          ) : (
            <div className="w-56 h-56 flex items-center justify-center text-xs text-gray-400">
              QR 코드 생성 중...
            </div>
          )}
        </div>

        {/* Room Code Badge */}
        <div className="bg-blue-50/70 border border-blue-200/60 rounded-xl py-2 px-3 mb-4">
          <span className="text-xs text-blue-600 font-medium">워크숍 방 코드: </span>
          <span className="text-sm font-bold text-blue-900 tracking-wider ml-1">{room.id}</span>
        </div>

        {/* Copy Link Input */}
        <div className="flex items-center space-x-2">
          <input
            type="text"
            readOnly
            value={roomUrl}
            className="flex-1 px-3 py-2 text-xs bg-gray-100 text-gray-700 rounded-xl border border-gray-200 focus:outline-none select-all truncate"
          />
          <button
            type="button"
            onClick={handleCopy}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-all shadow-sm ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? '복사됨!' : '링크 복사'}</span>
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-center space-x-2 text-xs text-gray-500">
          <Smartphone className="w-4 h-4 text-gray-400" />
          <span>모바일 화면에서 바로 카메라 촬영 & 다중 업로드 가능</span>
        </div>
      </div>
    </div>
  );
};
