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
  Trophy,
  Share2,
  Sparkles,
  Wifi,
  WifiOff,
  Flame,
  MessageCircle,
} from 'lucide-react';
import { Choice, Player, RoomState, RoundResult, ReactionMessage } from '../types';
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
  { text: '¡Buena jugada!', emoji: '👏' },
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

  const prevRoundRef = useRef<number>(room.round);
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

  // Audio & Confetti triggers when round ends or match ends
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
            particleCount: 100,
            spread: 70,
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
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyCode = () => {
    sounds.playClick();
    navigator.clipboard.writeText(room.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const toggleSound = () => {
    const muted = sounds.toggleMute();
    setIsMuted(muted);
    if (!muted) sounds.playClick();
  };

  // Determine current round result text
  const lastRound = room.history.length > 0 ? room.history[room.history.length - 1] : null;
  const isRoundResolved = room.status === 'roundResult' || room.status === 'matchOver';

  return (
    <div className="w-full max-w-lg mx-auto relative pb-8">
      {/* Floating Reaction Bubble Layer */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        <AnimatePresence>
          {reactions.slice(-6).map((r) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 100, scale: 0.8, x: Math.random() * 80 - 40 }}
              animate={{ opacity: 1, y: -200, scale: 1.1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 3, ease: 'easeOut' }}
              className="absolute bottom-28 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900/90 text-white rounded-full text-sm font-semibold shadow-xl border border-white/20 backdrop-blur-sm"
            >
              {r.emoji && <span className="text-lg">{r.emoji}</span>}
              <span>
                <strong className="text-red-400 font-normal text-xs">{r.senderName}: </strong>
                {r.text}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between bg-white/90 backdrop-blur-md rounded-2xl p-3 border border-neutral-200 shadow-sm mb-4">
        {/* Room Code Badge */}
        <div className="flex items-center gap-2">
          {!isBotMode ? (
            <div className="flex items-center gap-1.5 bg-neutral-100 px-2.5 py-1 rounded-xl border border-neutral-200">
              <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Sala</span>
              <span className="font-mono font-extrabold text-sm tracking-wider text-neutral-900">{room.code}</span>
              <button
                type="button"
                onClick={copyCode}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded transition-colors"
                title="Copiar código"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-xl border border-emerald-200 text-xs font-bold">
              <span>🤖 Modo Práctica</span>
            </div>
          )}

          {!isBotMode && (
            <div className="flex items-center gap-1 text-[11px] font-medium text-neutral-500">
              {isConnected ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  En Vivo
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  Conectando...
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
              onClick={copyInviteLink}
              className="p-2 text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors text-xs font-semibold flex items-center gap-1"
              title="Copiar link para invitar a un amigo"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
              <span className="hidden sm:inline">{copiedLink ? '¡Copiado!' : 'Invitar'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setShowHistory(!showHistory);
              sounds.playClick();
            }}
            className="p-2 text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
            title="Historial de rondas"
          >
            <History className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={toggleSound}
            className="p-2 text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
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
            className="p-2 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-xl transition-colors ml-1"
            title="Salir de la partida"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* WAITING FOR OPPONENT SCREEN */}
      {room.status === 'waiting' && !rival && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl border border-neutral-200 p-8 text-center shadow-lg mb-4"
        >
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 border border-red-200 flex items-center justify-center text-3xl mx-auto mb-4 animate-bounce">
            ⏳
          </div>

          <h2 className="text-xl font-bold text-neutral-900 mb-1">Esperando al Rival...</h2>
          <p className="text-neutral-600 text-xs mb-6 max-w-xs mx-auto">
            Comparte este código o enlace con tu amigo para que se una a tu partida de Yan Ken Po en tiempo real.
          </p>

          <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 mb-5">
            <span className="text-xs text-neutral-500 font-medium block mb-1">CÓDIGO DE SALA</span>
            <div className="text-3xl font-mono font-black tracking-widest text-neutral-900">{room.code}</div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              id="btn-copy-invite"
              type="button"
              onClick={copyInviteLink}
              className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow transition-all cursor-pointer"
            >
              {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? '¡Enlace Copiado!' : 'Copiar Enlace Directo'}</span>
            </button>

            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                `¡Te desafío a una partida de Yan Ken Po en vivo! Únete aquí: ${window.location.origin}${window.location.pathname}?room=${room.code}`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="h-11 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow transition-all"
            >
              <span>WhatsApp 📲</span>
            </a>
          </div>
        </motion.div>
      )}

      {/* ACTIVE ARENA (WHEN BOTH PLAYERS ARE IN) */}
      {(room.status !== 'waiting' || rival) && (
        <div className="space-y-4">
          {/* Match Header / Scoreboard Card */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm">
            <div className="flex justify-between items-center text-xs font-semibold text-neutral-500 mb-3 px-1">
              <span>Ronda {room.round}</span>
              <span className="bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-full border border-neutral-200">
                {room.maxScore > 0 ? `Primero a ${room.maxScore} pts` : 'Modo Libre'}
              </span>
            </div>

            <div className="grid grid-cols-11 items-center gap-2">
              {/* Player 1 (You) */}
              <div className="col-span-5 flex items-center gap-3 p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/80">
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-white border border-neutral-200 flex items-center justify-center text-2xl shadow-sm">
                    {me?.avatar || '👤'}
                  </div>
                  {me?.choice && !isRoundResolved && room.status !== 'revealing' && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center text-[9px] text-white font-bold">
                      ✓
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-neutral-900 truncate">
                    {me?.name || 'Tú'} <span className="text-[10px] text-neutral-600 font-medium">(Tú)</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xl font-extrabold text-neutral-900">{me?.score || 0}</span>
                    <span className="text-[10px] text-neutral-500 font-medium">pts</span>
                  </div>
                </div>
              </div>

              {/* VS Pill */}
              <div className="col-span-1 text-center font-extrabold text-neutral-400 text-xs tracking-tighter">
                VS
              </div>

              {/* Player 2 (Rival) */}
              <div className="col-span-5 flex items-center justify-end gap-3 p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/80 text-right">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-neutral-900 truncate">
                    {rival?.name || (isBotMode ? 'IncaBot' : 'Esperando...')}
                  </div>
                  <div className="flex items-center justify-end gap-1.5 mt-0.5">
                    <span className="text-[10px] text-neutral-500 font-medium">pts</span>
                    <span className="text-xl font-extrabold text-neutral-900">{rival?.score || 0}</span>
                  </div>
                </div>
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-white border border-neutral-200 flex items-center justify-center text-2xl shadow-sm">
                    {rival?.avatar || '🦙'}
                  </div>
                  {rival?.choice && !isRoundResolved && room.status !== 'revealing' && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 border-2 border-white rounded-full flex items-center justify-center text-[9px] text-white font-bold">
                      ✓
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Central Duel Arena */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 text-center shadow-md relative overflow-hidden min-h-[260px] flex flex-col justify-between">
            {/* Chant / Status Header */}
            <div className="min-h-[32px] flex items-center justify-center">
              {room.status === 'revealing' ? (
                <motion.div
                  key={chantStep}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1.2, opacity: 1 }}
                  className="text-2xl font-black text-red-600 tracking-wider uppercase"
                >
                  {chantStep === 0 && '¡YAN! ✊'}
                  {chantStep === 1 && '¡KEN! ✊'}
                  {chantStep === 2 && '¡PO! 🖐️'}
                </motion.div>
              ) : isRoundResolved ? (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="font-bold text-base"
                >
                  {lastRound?.winner === 'draw' ? (
                    <span className="text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                      🤝 ¡Empate! ¡Misma jugada!
                    </span>
                  ) : lastRound?.winner === myRole ? (
                    <span className="text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                      🎉 ¡Ganaste esta ronda!
                    </span>
                  ) : (
                    <span className="text-red-700 bg-red-50 px-3 py-1 rounded-full border border-red-200">
                      😢 ¡Punto para {rival?.name || 'Rival'}!
                    </span>
                  )}
                </motion.div>
              ) : (
                <div className="text-xs font-semibold text-neutral-500">
                  {me?.choice
                    ? rival?.choice
                      ? '¡Revelando jugadas!'
                      : `Esperando a que ${rival?.name || 'tu rival'} elija...`
                    : '¡Elige tu jugada abajo!'}
                </div>
              )}
            </div>

            {/* Duel Battle Hands Visual */}
            <div className="my-4 flex items-center justify-center gap-12 sm:gap-16">
              {/* My Hand */}
              <div className="text-center">
                <motion.div
                  animate={
                    room.status === 'revealing'
                      ? { y: [0, -25, 0], rotate: [0, -10, 0] }
                      : isRoundResolved && lastRound?.winner === myRole
                      ? { scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }
                      : {}
                  }
                  transition={{ duration: 0.35, repeat: room.status === 'revealing' ? Infinity : 0 }}
                  className={`w-24 h-24 rounded-2xl flex items-center justify-center text-5xl shadow-sm border transition-all ${
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
                <div className="mt-2 text-xs font-bold text-neutral-800">
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
              <div className="text-neutral-300 font-extrabold text-lg">⚡</div>

              {/* Rival Hand */}
              <div className="text-center">
                <motion.div
                  animate={
                    room.status === 'revealing'
                      ? { y: [0, -25, 0], rotate: [0, 10, 0] }
                      : isRoundResolved && lastRound?.winner === rivalRole
                      ? { scale: [1, 1.15, 1], rotate: [0, -5, 5, 0] }
                      : {}
                  }
                  transition={{ duration: 0.35, repeat: room.status === 'revealing' ? Infinity : 0 }}
                  className={`w-24 h-24 rounded-2xl flex items-center justify-center text-5xl shadow-sm border transition-all ${
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
                <div className="mt-2 text-xs font-bold text-neutral-800">
                  {room.status === 'revealing'
                    ? '¡Listo!'
                    : isRoundResolved && rival?.choice
                    ? CHOICE_LABELS[rival.choice]
                    : rival?.choice
                    ? '¡Eligió!'
                    : 'Pensando...'}
                </div>
              </div>
            </div>

            {/* Next Round Button if Round Completed and Match Not Over */}
            {room.status === 'roundResult' && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-2">
                <button
                  id="btn-next-round"
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    onNextRound();
                  }}
                  className="w-full h-11 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Siguiente Ronda</span>
                </button>
              </motion.div>
            )}
          </div>

          {/* CHOICE BUTTONS (Piedra, Papel, Tijera) */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm">
            <div className="text-center text-xs font-bold text-neutral-600 uppercase tracking-wider mb-3">
              {room.status === 'matchOver'
                ? 'Partida Terminada'
                : me?.choice && !isRoundResolved
                ? 'Jugada elegida (esperando rival)'
                : 'Selecciona tu jugada:'}
            </div>

            <div className="grid grid-cols-3 gap-2.5">
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
                    className={`py-3.5 px-2 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-red-600 text-white shadow-lg ring-4 ring-red-200 scale-[1.03]'
                        : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-900 border border-neutral-200 active:scale-95'
                    } ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <span className="text-3xl sm:text-4xl">{CHOICE_EMOJIS[choiceKey]}</span>
                    <span className="text-xs font-bold capitalize">{CHOICE_LABELS[choiceKey]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Chat / Reactions Bar */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-3 shadow-sm">
            <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-600 uppercase tracking-wider mb-2 px-1">
              <MessageCircle className="w-3.5 h-3.5 text-red-500" />
              <span>Reacciones en vivo</span>
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {QUICK_REACTIONS.map((reac, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    sounds.playPop();
                    onSendReaction(reac.text, reac.emoji);
                  }}
                  className="flex-shrink-0 px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 active:scale-95 border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-800 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span>{reac.emoji}</span>
                  <span className="text-[11px]">{reac.text}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MATCH OVER MODAL / OVERLAY */}
      <AnimatePresence>
        {room.status === 'matchOver' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl border border-neutral-200"
            >
              <div className="w-20 h-20 rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-4xl mx-auto mb-4 shadow-inner">
                {room.winner === myRole ? '🏆' : '💀'}
              </div>

              <h2 className="text-2xl font-black text-neutral-900 mb-1">
                {room.winner === myRole ? '¡VICTORIA TOTAL!' : '¡DERROTA!'}
              </h2>
              <p className="text-neutral-600 text-xs mb-5">
                {room.winner === myRole
                  ? '¡Has ganado la partida de Yan Ken Po con honor!'
                  : `${rival?.name || 'Tu rival'} se llevó esta partida.`}
              </p>

              {/* Final Scoreboard */}
              <div className="bg-neutral-50 rounded-2xl border border-neutral-200 p-4 mb-6">
                <div className="grid grid-cols-2 gap-4 divide-x divide-neutral-200">
                  <div>
                    <div className="text-xs font-semibold text-neutral-500 mb-1">{me?.name || 'Tú'}</div>
                    <div className="text-2xl font-black text-neutral-900">{me?.score || 0}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-neutral-500 mb-1">{rival?.name || 'Rival'}</div>
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
                  className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
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
                  className="w-full h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold text-xs rounded-xl transition-all"
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
              className="bg-white w-full max-w-sm h-full shadow-2xl p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center pb-4 border-b border-neutral-100 mb-4">
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-neutral-700" />
                    <h3 className="font-bold text-neutral-900 text-sm">Historial de Rondas</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowHistory(false)}
                    className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-2.5 overflow-y-auto max-h-[70vh] pr-1">
                  {room.history.length === 0 ? (
                    <div className="text-center py-10 text-neutral-400 text-xs">
                      Aún no se ha jugado ninguna ronda en esta partida.
                    </div>
                  ) : (
                    room.history.map((h, i) => (
                      <div
                        key={i}
                        className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between text-xs"
                      >
                        <span className="font-bold text-neutral-500">Ronda {h.round}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-lg" title={CHOICE_LABELS[h.p1Choice]}>
                            {CHOICE_EMOJIS[h.p1Choice]}
                          </span>
                          <span className="text-neutral-300 font-bold">vs</span>
                          <span className="text-lg" title={CHOICE_LABELS[h.p2Choice]}>
                            {CHOICE_EMOJIS[h.p2Choice]}
                          </span>
                        </div>
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[11px] ${
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
                className="w-full py-2.5 bg-neutral-900 text-white font-bold text-xs rounded-xl"
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
