import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Users,
  Bot,
  Volume2,
  VolumeX,
  ShieldAlert,
  Globe,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { sounds } from '../utils/audio';
import { PublicRoomItem } from '../types';

interface LobbyProps {
  onJoinRoom: (code: string, name: string, avatar: string) => void;
  onCreateRoom: (
    name: string,
    avatar: string,
    maxScore: number,
    title?: string,
    isPublic?: boolean
  ) => void;
  onPlayBot: (name: string, avatar: string, maxScore: number) => void;
  initialCode?: string;
}

const AVATARS = ['🇵🇪', '🦙', '🌽', '🏔️', '☀️', '🥑', '🎮', '⚡', '👑', '🥊', '🦊', '🥋'];

export const LobbyView: React.FC<LobbyProps> = ({
  onJoinRoom,
  onCreateRoom,
  onPlayBot,
  initialCode = '',
}) => {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('🇵🇪');
  const [showJoinModal, setShowJoinModal] = useState(Boolean(initialCode));
  const [showPublicRoomsModal, setShowPublicRoomsModal] = useState(false);
  const [joinCode, setJoinCode] = useState(initialCode);
  const [isMuted, setIsMuted] = useState(sounds.isMuted());
  const [errorMsg, setErrorMsg] = useState('');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // Public live rooms
  const [publicRooms, setPublicRooms] = useState<PublicRoomItem[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  useEffect(() => {
    const savedName = localStorage.getItem('yankenpo_name');
    const savedAvatar = localStorage.getItem('yankenpo_avatar');
    if (savedName) setName(savedName);
    if (savedAvatar) setAvatar(savedAvatar);
  }, []);

  const saveProfile = (n: string, a: string) => {
    localStorage.setItem('yankenpo_name', n);
    localStorage.setItem('yankenpo_avatar', a);
  };

  const fetchPublicRooms = async () => {
    setLoadingRooms(true);
    try {
      const res = await fetch('/api/rooms/public');
      const data = await res.json();
      if (data.rooms) {
        setPublicRooms(data.rooms);
      }
    } catch (e) {
      console.error('Error fetching public rooms:', e);
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleCreateInstant = () => {
    sounds.playClick();
    const finalName = name.trim() || 'Jugador 1';
    saveProfile(finalName, avatar);
    // Creates room and takes user straight to room waiting screen where they choose 3, 5 or Libre!
    onCreateRoom(finalName, avatar, 3, `Sala de ${finalName}`, true);
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playClick();
    const code = joinCode.trim().toUpperCase();
    if (!code || code.length < 3) {
      setErrorMsg('Ingresa un código de sala válido.');
      return;
    }
    const finalName = name.trim() || 'Jugador 2';
    saveProfile(finalName, avatar);
    onJoinRoom(code, finalName, avatar);
  };

  const handleJoinDirect = (code: string) => {
    sounds.playClick();
    const finalName = name.trim() || 'Jugador 2';
    saveProfile(finalName, avatar);
    onJoinRoom(code, finalName, avatar);
  };

  const handlePlayBot = () => {
    sounds.playClick();
    const finalName = name.trim() || 'Tú';
    saveProfile(finalName, avatar);
    onPlayBot(finalName, avatar, 3);
  };

  const toggleSound = () => {
    const muted = sounds.toggleMute();
    setIsMuted(muted);
    if (!muted) sounds.playClick();
  };

  return (
    <div className="w-full max-w-sm mx-auto px-2 pb-6">
      {/* Top Floating Badge & Mute Toggle */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100/90 text-red-800 rounded-full text-[11px] font-bold tracking-wider uppercase border border-red-200 shadow-xs">
          <span>🇵🇪 Yan Ken Po</span>
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
          <span>En Vivo</span>
        </div>

        <button
          type="button"
          onClick={toggleSound}
          className="w-9 h-9 rounded-xl bg-white/90 active:bg-neutral-100 border border-neutral-200 text-neutral-700 flex items-center justify-center transition-colors shadow-xs touch-manipulation"
          title={isMuted ? 'Activar sonido' : 'Silenciar'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-neutral-400" /> : <Volume2 className="w-4 h-4 text-neutral-800" />}
        </button>
      </div>

      {/* ANIMATED FLOATING HERO ILLUSTRATION */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center my-3"
      >
        <div className="relative inline-flex items-center justify-center my-2">
          {/* Floating Glow backdrop */}
          <div className="absolute inset-0 bg-red-400/20 rounded-full blur-2xl transform scale-150"></div>

          {/* Floating animated hand icons */}
          <div className="relative flex items-center justify-center gap-3 bg-white/90 backdrop-blur-md p-4 rounded-3xl border border-neutral-200 shadow-xl">
            <motion.span
              animate={{ y: [0, -7, 0], rotate: [-4, -9, -4] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              className="text-4xl filter drop-shadow-md select-none"
            >
              ✂️
            </motion.span>
            <motion.span
              animate={{ y: [0, 7, 0], scale: [1, 1.12, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
              className="text-5xl filter drop-shadow-lg select-none"
            >
              🪨
            </motion.span>
            <motion.span
              animate={{ y: [0, -7, 0], rotate: [4, 9, 4] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
              className="text-4xl filter drop-shadow-md select-none"
            >
              📄
            </motion.span>
          </div>
        </div>

        <h1 className="text-3xl font-black text-neutral-900 tracking-tight mt-2">
          Yan Ken Po
        </h1>
        <p className="text-neutral-500 text-xs mt-0.5">
          ¡Duelo en vivo al instante para 2 personas!
        </p>
      </motion.div>

      {/* PLAYER PROFILE PILL */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-2.5 shadow-sm mb-3.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAvatarPicker(!showAvatarPicker)}
            className="w-11 h-11 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-2xl flex-shrink-0 active:scale-95 transition-transform touch-manipulation relative"
            title="Cambiar avatar"
          >
            {avatar}
            <span className="absolute -bottom-1 -right-1 text-[9px] bg-neutral-900 text-white rounded-full px-1 font-bold">
              ✎
            </span>
          </button>

          <div className="flex-1 min-w-0">
            <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider">
              Tu Nombre / Apodo
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                saveProfile(e.target.value, avatar);
              }}
              placeholder="Escribe tu apodo..."
              maxLength={15}
              className="w-full text-xs font-bold text-neutral-900 bg-transparent placeholder-neutral-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Expandable Avatar Picker */}
        <AnimatePresence>
          {showAvatarPicker && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden pt-2 mt-2 border-t border-neutral-100"
            >
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none touch-pan-x">
                {AVATARS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => {
                      setAvatar(av);
                      saveProfile(name, av);
                      setShowAvatarPicker(false);
                      sounds.playClick();
                    }}
                    className={`w-9 h-9 min-w-[36px] rounded-lg text-lg flex items-center justify-center active:scale-90 transition-transform ${
                      avatar === av ? 'bg-red-500 text-white shadow-md ring-2 ring-red-300' : 'bg-neutral-100'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* MAIN BIG ACTION BUTTONS */}
      <div className="space-y-2.5">
        {/* BIG HERO BUTTON: CREAR SALA */}
        <motion.button
          id="btn-create-room-hero"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          onClick={handleCreateInstant}
          className="w-full h-15 min-h-[60px] bg-red-600 active:bg-red-700 text-white rounded-2xl shadow-lg shadow-red-500/25 flex items-center justify-between px-5 font-black text-base transition-all touch-manipulation cursor-pointer border border-red-500"
        >
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">
              ✨
            </div>
            <div>
              <div className="leading-tight">Crear Sala</div>
              <div className="text-[11px] font-medium text-red-100">Elige 3, 5 o libre y comparte</div>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-white/90" />
        </motion.button>

        {/* SECONDARY BUTTON: UNIRSE CON CÓDIGO */}
        <button
          id="btn-open-join-modal"
          type="button"
          onClick={() => {
            setShowJoinModal(true);
            sounds.playClick();
          }}
          className="w-full h-12 min-h-[48px] bg-white active:bg-neutral-50 text-neutral-800 rounded-2xl border border-neutral-200 shadow-xs flex items-center justify-between px-4 text-xs font-bold transition-all touch-manipulation"
        >
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-blue-500" />
            <span>Tengo un Código de Sala</span>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-400" />
        </button>

        {/* SECONDARY BUTTON: SALAS PÚBLICAS / BUSCADOR */}
        <button
          id="btn-open-public-rooms"
          type="button"
          onClick={() => {
            fetchPublicRooms();
            setShowPublicRoomsModal(true);
            sounds.playClick();
          }}
          className="w-full h-12 min-h-[48px] bg-white active:bg-neutral-50 text-neutral-800 rounded-2xl border border-neutral-200 shadow-xs flex items-center justify-between px-4 text-xs font-bold transition-all touch-manipulation"
        >
          <div className="flex items-center gap-2.5">
            <Globe className="w-4 h-4 text-emerald-600" />
            <span>Buscar Salas Abiertas</span>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-400" />
        </button>

        {/* BOT PRACTICE BUTTON */}
        <button
          id="btn-play-bot-hero"
          type="button"
          onClick={handlePlayBot}
          className="w-full h-11 min-h-[44px] bg-neutral-100 active:bg-neutral-200 text-neutral-600 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition-all touch-manipulation"
        >
          <Bot className="w-4 h-4 text-neutral-500" />
          <span>Práctica en Solitario contra Bot</span>
        </button>
      </div>

      {/* MODAL: UNIRSE CON CÓDIGO */}
      <AnimatePresence>
        {showJoinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-5 max-w-xs w-full shadow-2xl border border-neutral-200"
            >
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <h3 className="font-extrabold text-sm text-neutral-900">Unirse a Sala</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleJoinByCode} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    Código de Sala
                  </label>
                  <input
                    id="room-code-input"
                    type="text"
                    value={joinCode}
                    onChange={(e) => {
                      setJoinCode(e.target.value.toUpperCase());
                      setErrorMsg('');
                    }}
                    placeholder="EJ: ABC23"
                    maxLength={6}
                    autoCapitalize="characters"
                    autoCorrect="off"
                    className="w-full h-12 px-3 bg-neutral-50 border border-neutral-300 rounded-xl text-center text-xl font-mono tracking-widest font-black text-neutral-900 uppercase focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {errorMsg && (
                  <div className="p-2 rounded-lg bg-red-50 text-red-700 text-[11px] flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full h-11 min-h-[44px] bg-blue-600 active:bg-blue-700 text-white font-bold text-xs rounded-xl shadow flex items-center justify-center gap-2 touch-manipulation cursor-pointer"
                >
                  <span>Entrar al Duelo</span>
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: SALAS PÚBLICAS */}
      <AnimatePresence>
        {showPublicRoomsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-neutral-200 max-h-[85vh] flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center pb-2 border-b border-neutral-100 mb-3">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-extrabold text-sm text-neutral-900">Salas Abiertas en Vivo</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPublicRoomsModal(false)}
                    className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-2 overflow-y-auto max-h-60 pr-1">
                  {publicRooms.length > 0 ? (
                    publicRooms.map((r) => (
                      <div
                        key={r.code}
                        className="p-2.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-xl flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-white border border-neutral-200 flex items-center justify-center text-base shadow-xs flex-shrink-0">
                            {r.hostAvatar}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-neutral-900 truncate">
                              {r.title}
                            </div>
                            <div className="text-[10px] text-neutral-500">
                              Host: {r.hostName} • {r.maxScore > 0 ? `${r.maxScore} pts` : 'Libre'}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setShowPublicRoomsModal(false);
                            handleJoinDirect(r.code);
                          }}
                          className="h-8 px-2.5 bg-blue-600 active:bg-blue-700 text-white font-bold text-[11px] rounded-lg shadow-xs touch-manipulation"
                        >
                          Entrar
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-neutral-400 text-xs">
                      {loadingRooms ? 'Buscando salas...' : 'No hay salas abiertas en este momento.'}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-100 mt-2">
                <button
                  type="button"
                  onClick={fetchPublicRooms}
                  disabled={loadingRooms}
                  className="w-full h-10 bg-neutral-100 active:bg-neutral-200 text-neutral-700 font-bold text-xs rounded-xl"
                >
                  {loadingRooms ? 'Actualizando...' : 'Refrescar Lista'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rules Mini Footer */}
      <div className="mt-5 text-center text-[10px] text-neutral-400 font-medium">
        <span>🪨 vence a ✂️</span> • <span>📄 vence a 🪨</span> • <span>✂️ vence a 📄</span>
      </div>
    </div>
  );
};
