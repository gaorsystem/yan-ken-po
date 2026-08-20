import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Swords, Users, Bot, Sparkles, Copy, Check, ArrowRight, ShieldAlert, Volume2, VolumeX } from 'lucide-react';
import { sounds } from '../utils/audio';

interface LobbyProps {
  onJoinRoom: (code: string, name: string, avatar: string) => void;
  onCreateRoom: (name: string, avatar: string, maxScore: number) => void;
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
  const [tab, setTab] = useState<'create' | 'join' | 'bot'>(initialCode ? 'join' : 'create');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('🇵🇪');
  const [joinCode, setJoinCode] = useState(initialCode);
  const [maxScore, setMaxScore] = useState<number>(3);
  const [isMuted, setIsMuted] = useState(sounds.isMuted());
  const [errorMsg, setErrorMsg] = useState('');

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

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playClick();
    const finalName = name.trim() || 'Jugador 1';
    saveProfile(finalName, avatar);
    onCreateRoom(finalName, avatar, maxScore);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playClick();
    const code = joinCode.trim().toUpperCase();
    if (!code || code.length < 3) {
      setErrorMsg('Ingresa un código de sala válido (ej: ABCDE).');
      return;
    }
    const finalName = name.trim() || 'Jugador 2';
    saveProfile(finalName, avatar);
    onJoinRoom(code, finalName, avatar);
  };

  const handleBot = () => {
    sounds.playClick();
    const finalName = name.trim() || 'Tú';
    saveProfile(finalName, avatar);
    onPlayBot(finalName, avatar, maxScore);
  };

  const toggleSound = () => {
    const muted = sounds.toggleMute();
    setIsMuted(muted);
    if (!muted) sounds.playClick();
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Brand Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <div className="inline-flex items-center justify-center gap-2 px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold tracking-wider uppercase mb-3 border border-red-200 shadow-sm">
          <span>🇵🇪 Tradición Peruana</span>
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
          <span>Multijugador en Vivo</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight flex items-center justify-center gap-2">
          <span>Yan Ken Po</span>
          <span className="text-2xl">✂️🪨📄</span>
        </h1>
        <p className="text-neutral-600 text-sm mt-1">
          Piedra, Papel o Tijera — Juega en tiempo real con un amigo a distancia
        </p>
      </motion.div>

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl border border-neutral-200/80 p-6 backdrop-blur-sm"
      >
        {/* Profile Customizer */}
        <div className="mb-5 pb-5 border-b border-neutral-100">
          <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-2">
            Tu Jugador
          </label>
          <div className="flex gap-2 items-center mb-3">
            <div className="relative group">
              <div className="w-12 h-12 rounded-xl bg-neutral-100 border border-neutral-300 flex items-center justify-center text-2xl shadow-inner">
                {avatar}
              </div>
            </div>
            <input
              id="player-name-input"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrorMsg('');
              }}
              placeholder="Ingresa tu apodo o nombre"
              maxLength={15}
              className="flex-1 h-12 px-3.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 placeholder-neutral-400 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
            />
            <button
              id="toggle-sound-btn"
              type="button"
              onClick={toggleSound}
              className="w-12 h-12 rounded-xl bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-neutral-700 flex items-center justify-center transition-colors"
              title={isMuted ? 'Activar sonido' : 'Silenciar'}
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-neutral-400" /> : <Volume2 className="w-5 h-5 text-neutral-800" />}
            </button>
          </div>

          {/* Quick Avatar Picker */}
          <div>
            <span className="text-[11px] text-neutral-600 mb-1.5 block font-medium">Elige tu ícono:</span>
            <div className="flex flex-wrap gap-1.5">
              {AVATARS.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => {
                    setAvatar(av);
                    sounds.playClick();
                  }}
                  className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all ${
                    avatar === av
                      ? 'bg-red-500 text-white scale-110 shadow-md ring-2 ring-red-300'
                      : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-200'
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-neutral-100 rounded-xl mb-5">
          <button
            id="tab-create"
            type="button"
            onClick={() => {
              setTab('create');
              sounds.playClick();
              setErrorMsg('');
            }}
            className={`py-2 px-1 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${
              tab === 'create'
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Crear Sala</span>
          </button>

          <button
            id="tab-join"
            type="button"
            onClick={() => {
              setTab('join');
              sounds.playClick();
              setErrorMsg('');
            }}
            className={`py-2 px-1 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${
              tab === 'join'
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-blue-500" />
            <span>Unirse</span>
          </button>

          <button
            id="tab-bot"
            type="button"
            onClick={() => {
              setTab('bot');
              sounds.playClick();
              setErrorMsg('');
            }}
            className={`py-2 px-1 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${
              tab === 'bot'
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-emerald-500" />
            <span>Solitario</span>
          </button>
        </div>

        {/* CREATE ROOM TAB */}
        {tab === 'create' && (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-2">
                Modo de Partida
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMaxScore(3);
                    sounds.playClick();
                  }}
                  className={`py-2.5 px-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                    maxScore === 3
                      ? 'border-red-500 bg-red-50/70 text-red-900 ring-2 ring-red-200'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <div className="font-bold text-sm">3 Puntos</div>
                  <div className="text-[10px] text-neutral-500">Rápido</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMaxScore(5);
                    sounds.playClick();
                  }}
                  className={`py-2.5 px-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                    maxScore === 5
                      ? 'border-red-500 bg-red-50/70 text-red-900 ring-2 ring-red-200'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <div className="font-bold text-sm">5 Puntos</div>
                  <div className="text-[10px] text-neutral-500">Duelo largo</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMaxScore(0);
                    sounds.playClick();
                  }}
                  className={`py-2.5 px-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                    maxScore === 0
                      ? 'border-red-500 bg-red-50/70 text-red-900 ring-2 ring-red-200'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <div className="font-bold text-sm">Libre ♾️</div>
                  <div className="text-[10px] text-neutral-500">Sin límite</div>
                </button>
              </div>
            </div>

            <button
              id="btn-create-room"
              type="submit"
              className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              <Sparkles className="w-4 h-4" />
              <span>Crear Sala Online</span>
            </button>
          </form>
        )}

        {/* JOIN ROOM TAB */}
        {tab === 'join' && (
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1.5">
                Código de la Sala
              </label>
              <input
                id="room-code-input"
                type="text"
                value={joinCode}
                onChange={(e) => {
                  setJoinCode(e.target.value.toUpperCase());
                  setErrorMsg('');
                }}
                placeholder="Ejemplo: ABC23"
                maxLength={6}
                className="w-full h-12 px-4 bg-neutral-50 border border-neutral-300 rounded-xl text-center text-xl font-mono tracking-widest font-bold text-neutral-900 uppercase placeholder-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <p className="text-[11px] text-neutral-500 mt-1 text-center">
                Pide el código de 5 letras a tu amigo que creó la sala
              </p>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              id="btn-join-room"
              type="submit"
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              <Users className="w-4 h-4" />
              <span>Unirse a la Partida</span>
            </button>
          </form>
        )}

        {/* BOT TAB */}
        {tab === 'bot' && (
          <div className="space-y-4 text-center">
            <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-xs">
              <p className="font-semibold mb-1">🤖 Modo Práctica contra IncaBot</p>
              <p className="text-emerald-700">
                Entrena tus reflejos y tácticas de Yan Ken Po al instante sin esperar a nadie.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-2 text-left">
                Objetivo
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMaxScore(3);
                    sounds.playClick();
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all ${
                    maxScore === 3
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-200'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-700'
                  }`}
                >
                  Primero a 3 victorias
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMaxScore(5);
                    sounds.playClick();
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all ${
                    maxScore === 5
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-200'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-700'
                  }`}
                >
                  Primero a 5 victorias
                </button>
              </div>
            </div>

            <button
              id="btn-play-bot"
              type="button"
              onClick={handleBot}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              <Bot className="w-4 h-4" />
              <span>Comenzar Práctica</span>
            </button>
          </div>
        )}

        {/* Rules Footer */}
        <div className="mt-5 pt-4 border-t border-neutral-100 flex justify-between items-center text-[11px] text-neutral-500 font-medium">
          <span>🪨 Piedra vence a ✂️ Tijera</span>
          <span>📄 Papel vence a 🪨 Piedra</span>
          <span>✂️ Tijera vence a 📄 Papel</span>
        </div>
      </motion.div>
    </div>
  );
};
