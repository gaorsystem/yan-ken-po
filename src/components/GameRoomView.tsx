import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Copy,
  Check,
  RotateCcw,
  LogOut,
  Volume2,
  VolumeX,
  History,
  Share2,
  Flame,
  MessageCircle,
} from 'lucide-react';
import { Choice, Player, RoomState, ReactionMessage } from '../types';
import { sounds } from '../utils/audio';

interface GameRoomProps {
  room: RoomState;
  myPlayerId: string;
  isBotMode?: boolean;
  onPlayChoice: (choice: Choice) => void;
  onNextRound: () => void;
  onRestartMatch: () => void;
  onSendReaction: (text: string, emoji?: string) => void;
  onLeaveRoom: () => void;
  reactions: ReactionMessage[];
  isConnected: boolean;
}

const CHOICE_EMOJIS: Record<Choice, string> = {
  piedra: '🪨',
  papel: '📄',
  tijera: '✂️',
};

const CHOICE_LABELS: Record<Choice, string> = {
  piedra: 'Piedra',
  papel: 'Papel',
  tijera: 'Tijera',
};

const QUICK_REACTIONS = [
  { text: '¡Buena!', emoji: '👏' },
  { text: '¡Qué salado!', emoji: '🧂' },
  { text: '¡Revancha!', emoji: '🔥' },
  { text: '¡Chócala!', emoji: '🤝' },
  { text: '¡Vamos!', emoji: '💪' },
  { text: '😂', emoji: '😂' },
  { text: '😎', emoji: '😎' },
  { text: '🇵🇪', emoji: '🇵🇪' },
];

export const GameRoomView: React.FC<GameRoomProps> = ({
  room,
  myPlayerId,
  isBotMode = false,
  onPlayChoice,
  onNextRound,
  onRestartMatch,
  onSendReaction,
  onLeaveRoom,
  reactions,
  isConnected,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isMuted, setIsMuted] = useState(sounds.isMuted());
  const [chantStep, setChantStep] = useState<number | null>(null);

  const prevStatusRef = useRef<string>(room.status);

  // Identify who is me and who is rival
  const isP1 = room.p1?.id === myPlayerId;
  const me: Player | null = isP1 ? room.p1 : room.p2;
  const rival: Player | null = isP1 ? room.p2 : room.p1;
  const myRole = isP1 ? 'p1' : 'p2';
  const rivalRole = isP1 ? 'p2' : 'p1';

  // Dramatic "Yan - Ken - Po" sequence when revealing starts
  useEffect(() => {
    if (room.status === 'revealing' && prevStatusRef.current !== 'revealing') {
      setChantStep(0);
      sounds.playChantBeat(0);

      const t1 = setTimeout(() => {
        setChantStep(1);
        sounds.playChantBeat(1);
      }, 600);

      const t2 = setTimeout(() => {
        setChantStep(2);
        sounds.playChantBeat(2);
      }, 1200);

      const t3 = setTimeout(() => {
        setChantStep(null);
      }, 1800);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
    prevStatusRef.current = room.status;
  }, [room.status]);

  // Audio & Confetti triggers
  useEffect(() => {
    if (room.status === 'roundResult' && room.history.length > 0) {
      const last = room.history[room.history.length - 1];
      if (last.winner === 'draw') {
        sounds.playDraw();
      } else if (last.winner === myRole) {
        sounds.playWin();
      } else {
        sounds.playLose();
      }
    } else if (room.status === 'matchOver') {
      if (room.winner === myRole) {
        sounds.playWin();
        try {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#ef4444', '#ffffff', '#eab308', '#3b82f6'],
          });
        } catch (e) {}
      } else {
        sounds.playLose();
      }
    }
  }, [room.status, room.round, room.winner, myRole]);

  const copyInviteLink = () => {
    sounds.playClick();
    const url = `${window.location.origin}${window.location.pathname}?room=${room.code}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyCode = () => {
    sounds.playClick();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(room.code);
    }
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const shareNative = () => {
    sounds.playClick();
    const url = `${window.location.origin}${window.location.pathname}?room=${room.code}`;
    if (navigator.share) {
      navigator
        .share({
          title: room.title || 'Yan Ken Po en Vivo',
          text: `¡Únete a mi partida de Yan Ken Po en vivo (${room.title || 'Sala de Yan Ken Po'})! Código: ${room.code}`,
          url,
        })
        .catch(() => {});
    } else {
      copyInviteLink();
    }
  };

  const toggleSound = () => {
    const muted = sounds.toggleMute();
    setIsMuted(muted);
    if (!muted) sounds.playClick();
  };

  const lastRound = room.history.length > 0 ? room.history[room.history.length - 1] : null;
  const isRoundResolved = room.status === 'roundResult' || room.status === 'matchOver';

  return (
    <div className="w-full max-w-lg mx-auto relative pb-6 px-1">
      {/* Floating Reaction Bubble Layer */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        <AnimatePresence>
          {reactions.slice(-4).map((r) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 80, scale: 0.8 }}
              animate={{ opacity: 1, y: -160, scale: 1.05 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.8, ease: 'easeOut' }}
              className="absolute bottom-36 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900/90 text-white rounded-full text-xs font-semibold shadow-xl border border-white/20 backdrop-blur-sm"
            >
              {r.emoji && <span className="text-base">{r.emoji}</span>}
              <span>
                <strong className="text-red-400 font-normal">{r.senderName}: </strong>
                {r.text}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Top Header Bar */}
      <div className="flex items-center justify-between bg-white/95 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 border border-neutral-200 shadow-sm mb-3">
        {/* Room Name & Code Badge */}
        <div className="flex items-center gap-1.5 min-w-0">
          {!isBotMode ? (
            <div className="flex items-center gap-1.5 bg-neutral-100 px-2.5 py-1 rounded-xl border border-neutral-200 min-w-0">
              <div className="min-w-0">
                {room.title && (
                  <div className="text-[10px] font-bold text-neutral-600 truncate max-w-[110px] sm:max-w-[160px]">
                    {room.title}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Cód:</span>
                  <span className="font-mono font-black text-xs tracking-wider text-neutral-900">{room.code}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={copyCode}
                className="p-1 min-w-[26px] min-h-[26px] flex items-center justify-center text-neutral-500 active:text-neutral-900 rounded transition-colors touch-manipulation"
                title="Copiar código"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-xl border border-emerald-200 text-xs font-bold">
              <span>🤖 IncaBot (Práctica)</span>
            </div>
          )}

          {!isBotMode && (
            <div className="flex items-center gap-1 text-[10px] font-semibold text-neutral-500">
              {isConnected ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  En Vivo
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">
                  Reconectando...
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          {!isBotMode && (
            <button
              id="btn-share-link"
              type="button"
              onClick={shareNative}
              className="p-2 min-w-[36px] min-h-[36px] text-neutral-700 active:bg-neutral-200 bg-neutral-100 rounded-xl transition-colors text-xs font-bold flex items-center justify-center gap-1 touch-manipulation"
              title="Compartir o invitar"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setShowHistory(!showHistory);
              sounds.playClick();
            }}
            className="p-2 min-w-[36px] min-h-[36px] text-neutral-700 active:bg-neutral-200 bg-neutral-100 rounded-xl transition-colors flex items-center justify-center touch-manipulation"
            title="Historial de rondas"
          >
            <History className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={toggleSound}
            className="p-2 min-w-[36px] min-h-[36px] text-neutral-700 active:bg-neutral-200 bg-neutral-100 rounded-xl transition-colors flex items-center justify-center touch-manipulation"
            title={isMuted ? 'Activar sonido' : 'Silenciar'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-neutral-400" /> : <Volume2 className="w-4 h-4 text-neutral-800" />}
          </button>

          <button
            id="btn-leave-game"
            type="button"
            onClick={() => {
              sounds.playClick();
              onLeaveRoom();
            }}
            className="p-2 min-w-[36px] min-h-[36px] text-red-600 active:bg-red-200 bg-red-50 rounded-xl transition-colors flex items-center justify-center touch-manipulation"
            title="Salir"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* WAITING FOR OPPONENT */}
      {room.status === 'waiting' && !rival && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl border border-neutral-200 p-5 sm:p-6 text-center shadow-md mb-3"
        >
          <div className="w-14 h-14 rounded-full bg-red-50 text-red-600 border border-red-200 flex items-center justify-center text-2xl mx-auto mb-3 animate-bounce">
            ⏳
          </div>

          <h2 className="text-lg sm:text-xl font-extrabold text-neutral-900 mb-1">
            {room.title || 'Esperando al Rival...'}
          </h2>
          <p className="text-neutral-600 text-xs mb-4 max-w-xs mx-auto">
            {room.isPublic
              ? 'Tu sala es pública y aparecerá en la lista de salas para que cualquiera entre, o también puedes compartir el enlace directo.'
              : 'Envía el enlace o código a tu amigo para empezar a jugar en tiempo real.'}
          </p>

          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 mb-4">
            <span className="text-[10px] text-neutral-400 font-bold block uppercase tracking-wider mb-0.5">
              CÓDIGO DE SALA
            </span>
            <div className="text-2xl sm:text-3xl font-mono font-black tracking-widest text-neutral-900">
              {room.code}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              id="btn-copy-invite"
              type="button"
              onClick={copyInviteLink}
              className="h-12 min-h-[48px] bg-red-600 active:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow transition-all touch-manipulation"
            >
              {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? '¡Enlace Copiado!' : 'Copiar Enlace Directo'}</span>
            </button>

            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                `¡Te desafío a Yan Ken Po en vivo en ${room.title || 'mi sala'}! Únete aquí con 1 clic: ${window.location.origin}${window.location.pathname}?room=${room.code}`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="h-12 min-h-[48px] px-3 bg-emerald-600 active:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow transition-all touch-manipulation"
            >
              <span>Invitar por WhatsApp 📲</span>
            </a>
          </div>
        </motion.div>
      )}

      {/* ACTIVE GAME PLAYGROUND */}
      {(room.status !== 'waiting' || rival) && (
        <div className="space-y-3">
          {/* Scoreboard Card */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-3 shadow-xs">
            <div className="flex justify-between items-center text-[11px] font-bold text-neutral-500 mb-2 px-1">
              <span>Ronda {room.round}</span>
              <span className="bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-full border border-neutral-200 text-[10px]">
                {room.maxScore > 0 ? `Meta: ${room.maxScore} pts` : 'Modo Libre'}
              </span>
            </div>

            <div className="grid grid-cols-11 items-center gap-1.5">
              {/* Player 1 (You) */}
              <div className="col-span-5 flex items-center gap-2 p-2 rounded-xl bg-neutral-50 border border-neutral-200">
                <div className="relative flex-shrink-0">
                  <motion.div
                    animate={
                      isRoundResolved && lastRound?.winner === myRole
                        ? {
                            scale: [1, 1.25, 1.05, 1.2, 1],
                            rotate: [0, -8, 8, -4, 0],
                          }
                        : {}
                    }
                    transition={{ duration: 0.8, ease: 'easeInOut' }}
                    className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-xl transition-all duration-300 ${
                      isRoundResolved && lastRound?.winner === myRole
                        ? 'bg-amber-100 border-2 border-amber-400 ring-4 ring-amber-200 shadow-md'
                        : 'bg-white border border-neutral-200 shadow-xs'
                    }`}
                  >
                    {me?.avatar || '👤'}
                  </motion.div>

                  {/* Choice sent tick */}
                  {me?.choice && !isRoundResolved && room.status !== 'revealing' && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center text-[9px] text-white font-bold">
                      ✓
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold text-neutral-900 truncate">
                    {me?.name || 'Tú'} <span className="text-[9px] text-neutral-400 font-normal">(Tú)</span>
                  </div>
                  <div className="text-lg sm:text-xl font-black text-neutral-900 leading-none mt-0.5">
                    {me?.score || 0}
                  </div>
                </div>
              </div>

              {/* VS Divider */}
              <div className="col-span-1 text-center font-black text-neutral-300 text-[11px]">
                VS
              </div>

              {/* Player 2 (Rival) */}
              <div className="col-span-5 flex items-center justify-end gap-2 p-2 rounded-xl bg-neutral-50 border border-neutral-200 text-right">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold text-neutral-900 truncate">
                    {rival?.name || (isBotMode ? 'IncaBot' : 'Esperando...')}
                  </div>
                  <div className="text-lg sm:text-xl font-black text-neutral-900 leading-none mt-0.5">
                    {rival?.score || 0}
                  </div>
                </div>
                <div className="relative flex-shrink-0">
                  <motion.div
                    animate={
                      isRoundResolved && lastRound?.winner === rivalRole
                        ? {
                            scale: [1, 1.25, 1.05, 1.2, 1],
                            rotate: [0, 8, -8, 4, 0],
                          }
                        : {}
                    }
                    transition={{ duration: 0.8, ease: 'easeInOut' }}
                    className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-xl transition-all duration-300 ${
                      isRoundResolved && lastRound?.winner === rivalRole
                        ? 'bg-amber-100 border-2 border-amber-400 ring-4 ring-amber-200 shadow-md'
                        : 'bg-white border border-neutral-200 shadow-xs'
                    }`}
                  >
                    {rival?.avatar || '🦙'}
                  </motion.div>
                  {rival?.choice && !isRoundResolved && room.status !== 'revealing' && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 border-2 border-white rounded-full flex items-center justify-center text-[9px] text-white font-bold">
                      ✓
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Center Battle Field */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-4 sm:p-5 text-center shadow-md relative overflow-hidden min-h-[220px] sm:min-h-[250px] flex flex-col justify-between">
            {/* Status Announcement Banner */}
            <div className="min-h-[28px] flex items-center justify-center">
              {room.status === 'revealing' ? (
                <motion.div
                  key={chantStep}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1.25, opacity: 1 }}
                  className="text-2xl sm:text-3xl font-black text-red-600 tracking-wider uppercase drop-shadow-xs"
                >
                  {chantStep === 0 && '¡YAN! ✊'}
                  {chantStep === 1 && '¡KEN! ✊'}
                  {chantStep === 2 && '¡PO! 🖐️'}
                </motion.div>
              ) : isRoundResolved ? (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="font-bold text-xs sm:text-sm"
                >
                  {lastRound?.winner === 'draw' ? (
                    <span className="text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                      🤝 ¡Empate! Misma jugada
                    </span>
                  ) : lastRound?.winner === myRole ? (
                    <span className="text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                      🎉 ¡Punto para ti!
                    </span>
                  ) : (
                    <span className="text-red-700 bg-red-50 px-3 py-1 rounded-full border border-red-200">
                      😢 ¡Punto para {rival?.name || 'Rival'}!
                    </span>
                  )}
                </motion.div>
              ) : (
                <div className="text-[11px] font-semibold text-neutral-500">
                  {me?.choice
                    ? rival?.choice
                      ? '¡Revelando jugadas!'
                      : `Esperando a ${rival?.name || 'rival'}...`
                    : '¡Elige Piedra, Papel o Tijera abajo!'}
                </div>
              )}
            </div>

            {/* Duel Battle Hands Visual */}
            <div className="my-2 sm:my-4 flex items-center justify-center gap-8 sm:gap-14">
              {/* My Hand */}
              <div className="text-center">
                <motion.div
                  animate={
                    room.status === 'revealing'
                      ? { y: [0, -20, 0], rotate: [0, -10, 0] }
                      : isRoundResolved && lastRound?.winner === myRole
                      ? { scale: [1, 1.15, 1], rotate: [0, 6, -6, 0] }
                      : {}
                  }
                  transition={{ duration: 0.35, repeat: room.status === 'revealing' ? Infinity : 0 }}
                  className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center text-4xl sm:text-5xl shadow-xs border transition-all ${
                    isRoundResolved && lastRound?.winner === myRole
                      ? 'bg-emerald-50 border-emerald-300 ring-4 ring-emerald-100'
                      : isRoundResolved && lastRound?.winner === rivalRole
                      ? 'bg-neutral-100 border-neutral-200 opacity-60'
                      : 'bg-neutral-50 border-neutral-200'
                  }`}
                >
                  {room.status === 'revealing'
                    ? '✊'
                    : isRoundResolved && me?.choice
                    ? CHOICE_EMOJIS[me.choice]
                    : me?.choice
                    ? CHOICE_EMOJIS[me.choice]
                    : '❓'}
                </motion.div>
                <div className="mt-1.5 text-[11px] font-bold text-neutral-800">
                  {room.status === 'revealing'
                    ? '¡Listo!'
                    : isRoundResolved && me?.choice
                    ? CHOICE_LABELS[me.choice]
                    : me?.choice
                    ? CHOICE_LABELS[me.choice]
                    : 'Tu jugada'}
                </div>
              </div>

              {/* Clash Divider */}
              <div className="text-neutral-300 font-black text-sm">⚡</div>

              {/* Rival Hand */}
              <div className="text-center">
                <motion.div
                  animate={
                    room.status === 'revealing'
                      ? { y: [0, -20, 0], rotate: [0, 10, 0] }
                      : isRoundResolved && lastRound?.winner === rivalRole
                      ? { scale: [1, 1.15, 1], rotate: [0, -6, 6, 0] }
                      : {}
                  }
                  transition={{ duration: 0.35, repeat: room.status === 'revealing' ? Infinity : 0 }}
                  className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center text-4xl sm:text-5xl shadow-xs border transition-all ${
                    isRoundResolved && lastRound?.winner === rivalRole
                      ? 'bg-emerald-50 border-emerald-300 ring-4 ring-emerald-100'
                      : isRoundResolved && lastRound?.winner === myRole
                      ? 'bg-neutral-100 border-neutral-200 opacity-60'
                      : 'bg-neutral-50 border-neutral-200'
                  }`}
                >
                  {room.status === 'revealing'
                    ? '✊'
                    : isRoundResolved && rival?.choice
                    ? CHOICE_EMOJIS[rival.choice]
                    : rival?.choice
                    ? '🔒'
                    : '❓'}
                </motion.div>
                <div className="mt-1.5 text-[11px] font-bold text-neutral-800">
                  {room.status === 'revealing'
                    ? '¡Listo!'
                    : isRoundResolved && rival?.choice
                    ? CHOICE_LABELS[rival.choice]
                    : rival?.choice
                    ? '¡Eligió!'
                    : 'Esperando...'}
                </div>
              </div>
            </div>

            {/* Next Round Button */}
            {room.status === 'roundResult' && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-1">
                <button
                  id="btn-next-round"
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    onNextRound();
                  }}
                  className="w-full h-11 min-h-[44px] bg-neutral-900 active:bg-neutral-800 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation active:scale-[0.98]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Siguiente Ronda</span>
                </button>
              </motion.div>
            )}
          </div>

          {/* LARGE TOUCH-OPTIMIZED CHOICE BUTTONS */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-3 sm:p-4 shadow-sm">
            <div className="text-center text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-2.5">
              {room.status === 'matchOver'
                ? 'Partida Terminada'
                : me?.choice && !isRoundResolved
                ? 'Jugada enviada (esperando rival)'
                : 'Toca tu jugada:'}
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {(['piedra', 'papel', 'tijera'] as Choice[]).map((choiceKey) => {
                const isSelected = me?.choice === choiceKey;
                const isDisabled = room.status === 'revealing' || room.status === 'matchOver';

                return (
                  <button
                    key={choiceKey}
                    id={`choice-btn-${choiceKey}`}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                      sounds.playSelect();
                      onPlayChoice(choiceKey);
                    }}
                    className={`min-h-[76px] sm:min-h-[88px] py-3 px-1 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all touch-manipulation cursor-pointer ${
                      isSelected
                        ? 'bg-red-600 text-white shadow-lg ring-4 ring-red-200 scale-[1.02]'
                        : 'bg-neutral-50 active:bg-neutral-200 text-neutral-900 border border-neutral-200 active:scale-95'
                    } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span className="text-3xl sm:text-4xl filter drop-shadow-xs">{CHOICE_EMOJIS[choiceKey]}</span>
                    <span className="text-xs font-extrabold capitalize tracking-tight">{CHOICE_LABELS[choiceKey]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Horizontal Quick Reactions Bar (Smooth Touch Scroll) */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-2.5 shadow-xs">
            <div className="flex items-center gap-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5 px-1">
              <MessageCircle className="w-3 h-3 text-red-500" />
              <span>Reacciones rápidas</span>
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none touch-pan-x">
              {QUICK_REACTIONS.map((reac, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    sounds.playPop();
                    onSendReaction(reac.text, reac.emoji);
                  }}
                  className="flex-shrink-0 min-h-[38px] px-3 py-1.5 bg-neutral-100 active:bg-neutral-200 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-800 transition-transform active:scale-95 flex items-center gap-1 touch-manipulation"
                >
                  <span className="text-sm">{reac.emoji}</span>
                  <span className="text-[11px] whitespace-nowrap">{reac.text}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MATCH OVER MODAL */}
      <AnimatePresence>
        {room.status === 'matchOver' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-6 max-w-xs sm:max-w-sm w-full text-center shadow-2xl border border-neutral-200"
            >
              <div className="w-18 h-18 rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-4xl mx-auto mb-3">
                {room.winner === myRole ? '🏆' : '💀'}
              </div>

              <h2 className="text-2xl font-black text-neutral-900 mb-1">
                {room.winner === myRole ? '¡VICTORIA TOTAL!' : '¡FIN DEL DUELO!'}
              </h2>
              <p className="text-neutral-600 text-xs mb-4">
                {room.winner === myRole
                  ? '¡Has ganado la partida de Yan Ken Po!'
                  : `${rival?.name || 'Tu rival'} ganó esta partida.`}
              </p>

              {/* Final Scores */}
              <div className="bg-neutral-50 rounded-2xl border border-neutral-200 p-3 mb-5">
                <div className="grid grid-cols-2 gap-2 divide-x divide-neutral-200">
                  <div>
                    <div className="text-[11px] font-bold text-neutral-500 mb-0.5 truncate">{me?.name || 'Tú'}</div>
                    <div className="text-2xl font-black text-neutral-900">{me?.score || 0}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-neutral-500 mb-0.5 truncate">{rival?.name || 'Rival'}</div>
                    <div className="text-2xl font-black text-neutral-900">{rival?.score || 0}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  id="btn-restart-match"
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    onRestartMatch();
                  }}
                  className="w-full h-12 min-h-[48px] bg-red-600 active:bg-red-700 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all touch-manipulation active:scale-[0.98]"
                >
                  <Flame className="w-4 h-4" />
                  <span>¡Pedir Revancha!</span>
                </button>

                <button
                  id="btn-leave-after-match"
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    onLeaveRoom();
                  }}
                  className="w-full h-11 min-h-[44px] bg-neutral-100 active:bg-neutral-200 text-neutral-700 font-bold text-xs rounded-xl transition-all touch-manipulation"
                >
                  Volver al Menú Principal
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ROUND HISTORY DRAWER */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs z-50 flex justify-end"
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white w-full max-w-xs sm:max-w-sm h-full shadow-2xl p-4 sm:p-5 flex flex-col justify-between safe-top safe-bottom"
            >
              <div>
                <div className="flex justify-between items-center pb-3 border-b border-neutral-100 mb-3">
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-neutral-700" />
                    <h3 className="font-bold text-neutral-900 text-sm">Historial de Rondas</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowHistory(false)}
                    className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-neutral-400 active:text-neutral-700 rounded-lg touch-manipulation"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-2 overflow-y-auto max-h-[70vh] pr-1">
                  {room.history.length === 0 ? (
                    <div className="text-center py-10 text-neutral-400 text-xs">
                      Aún no se ha jugado ninguna ronda.
                    </div>
                  ) : (
                    room.history.map((h, i) => (
                      <div
                        key={i}
                        className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between text-xs"
                      >
                        <span className="font-bold text-neutral-500">R{h.round}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">{CHOICE_EMOJIS[h.p1Choice]}</span>
                          <span className="text-neutral-300 font-bold">vs</span>
                          <span className="text-base">{CHOICE_EMOJIS[h.p2Choice]}</span>
                        </div>
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                            h.winner === 'draw'
                              ? 'bg-neutral-200 text-neutral-700'
                              : (h.winner === 'p1' && isP1) || (h.winner === 'p2' && !isP1)
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {h.winner === 'draw'
                            ? 'Empate'
                            : (h.winner === 'p1' && isP1) || (h.winner === 'p2' && !isP1)
                            ? 'Victoria'
                            : 'Derrota'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowHistory(false)}
                className="w-full h-11 min-h-[44px] bg-neutral-900 active:bg-neutral-800 text-white font-bold text-xs rounded-xl touch-manipulation"
              >
                Cerrar Historial
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
