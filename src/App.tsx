/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LobbyView } from './components/LobbyView';
import { GameRoomView } from './components/GameRoomView';
import { Choice, RoomState, ReactionMessage } from './types';
import { getBotChoice } from './utils/bot';
import { gameEngine } from './services/hybridGameEngine';

export default function App() {
  const [initialRoomCode, setInitialRoomCode] = useState<string>('');
  const [room, setRoom] = useState<RoomState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string>('');
  const [isBotMode, setIsBotMode] = useState<boolean>(false);
  const [reactions, setReactions] = useState<ReactionMessage[]>([]);

  const botHistoryRef = useRef<Choice[]>([]);

  // Check URL query parameters for ?room=CODE
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const roomParam = urlParams.get('room');
      if (roomParam) {
        setInitialRoomCode(roomParam.toUpperCase());
      }
    } catch (e) {}
  }, []);

  // Cleanup when leaving
  useEffect(() => {
    return () => {
      gameEngine.leaveRoom();
    };
  }, []);

  // Handle Create Room (Works in AI Studio, Vercel, Supabase and überall)
  const handleCreateRoom = (
    name: string,
    avatar: string,
    maxScore: number,
    title?: string,
    isPublic: boolean = true
  ) => {
    const { code, playerId, state } = gameEngine.createRoom(
      name,
      avatar,
      maxScore,
      title,
      (updatedState) => {
        setRoom({ ...updatedState });
      },
      (reaction) => {
        setReactions((prev) => [...prev.slice(-10), reaction]);
      }
    );

    setMyPlayerId(playerId);
    setRoom(state);
    setIsBotMode(false);
    window.history.replaceState({}, '', `?room=${code}`);
  };

  // Handle Join Room
  const handleJoinRoom = (code: string, name: string, avatar: string) => {
    const cleanCode = code.trim().toUpperCase();
    const { playerId } = gameEngine.joinRoom(
      cleanCode,
      name,
      avatar,
      (updatedState) => {
        setRoom({ ...updatedState });
      },
      (reaction) => {
        setReactions((prev) => [...prev.slice(-10), reaction]);
      }
    );

    setMyPlayerId(playerId);
    setIsBotMode(false);
    // Temporary waiting state until Host syncs the full room
    setRoom({
      code: cleanCode,
      title: `Sala ${cleanCode}`,
      status: 'roundResult',
      p1: null,
      p2: {
        id: playerId,
        name,
        avatar,
        score: 0,
        choice: null,
        readyForNext: false,
        connected: true,
      },
      round: 1,
      maxScore: 3,
      history: [],
      winner: null,
      lastActionTime: Date.now(),
    });
    window.history.replaceState({}, '', `?room=${cleanCode}`);
  };

  // Handle Solo Practice Mode (Bot)
  const handlePlayBot = (name: string, avatar: string, maxScore: number) => {
    const pid = 'p1_' + Math.random().toString(36).substring(2, 7);
    setMyPlayerId(pid);
    setIsBotMode(true);
    botHistoryRef.current = [];

    const localRoom: RoomState = {
      code: 'BOT-SOLO',
      status: 'roundResult',
      p1: {
        id: pid,
        name,
        avatar,
        score: 0,
        choice: null,
        readyForNext: false,
        connected: true,
      },
      p2: {
        id: 'bot_p2',
        name: 'IncaBot 🤖',
        avatar: '🦙',
        score: 0,
        choice: null,
        readyForNext: false,
        connected: true,
      },
      round: 1,
      maxScore,
      history: [],
      winner: null,
      lastActionTime: Date.now(),
    };

    setRoom(localRoom);
  };

  // User submits choice (Piedra, Papel o Tijera)
  const handlePlayChoice = (choice: Choice) => {
    if (!room) return;

    if (isBotMode) {
      // Handle locally in bot mode
      botHistoryRef.current.push(choice);
      const botChoice = getBotChoice(botHistoryRef.current);

      // Set player choice and trigger reveal state
      const updatedRoom: RoomState = {
        ...room,
        p1: room.p1 ? { ...room.p1, choice } : null,
        p2: room.p2 ? { ...room.p2, choice: botChoice } : null,
        status: 'revealing',
      };
      setRoom(updatedRoom);

      // Reveal after 1.8 seconds
      setTimeout(() => {
        let winner: 'p1' | 'p2' | 'draw' = 'draw';
        if (choice !== botChoice) {
          if (
            (choice === 'piedra' && botChoice === 'tijera') ||
            (choice === 'papel' && botChoice === 'piedra') ||
            (choice === 'tijera' && botChoice === 'papel')
          ) {
            winner = 'p1';
          } else {
            winner = 'p2';
          }
        }

        const newP1Score = (room.p1?.score || 0) + (winner === 'p1' ? 1 : 0);
        const newP2Score = (room.p2?.score || 0) + (winner === 'p2' ? 1 : 0);

        const newHistory = [
          ...room.history,
          {
            round: room.round,
            p1Choice: choice,
            p2Choice: botChoice,
            winner,
            timestamp: Date.now(),
          },
        ];

        let finalStatus: RoomState['status'] = 'roundResult';
        let matchWinner: 'p1' | 'p2' | null = null;

        if (room.maxScore > 0 && (newP1Score >= room.maxScore || newP2Score >= room.maxScore)) {
          finalStatus = 'matchOver';
          matchWinner = newP1Score >= room.maxScore ? 'p1' : 'p2';
        }

        setRoom({
          ...room,
          status: finalStatus,
          winner: matchWinner,
          p1: room.p1 ? { ...room.p1, choice, score: newP1Score } : null,
          p2: room.p2 ? { ...room.p2, choice: botChoice, score: newP2Score } : null,
          history: newHistory,
        });
      }, 1800);
    } else {
      gameEngine.submitChoice(choice);
    }
  };

  // Next Round
  const handleNextRound = () => {
    if (!room) return;

    if (isBotMode) {
      setRoom({
        ...room,
        round: room.round + 1,
        status: 'roundResult',
        p1: room.p1 ? { ...room.p1, choice: null, readyForNext: false } : null,
        p2: room.p2 ? { ...room.p2, choice: null, readyForNext: false } : null,
      });
    } else {
      gameEngine.setReadyForNext();
    }
  };

  // Restart match (Revancha)
  const handleRestartMatch = () => {
    if (!room) return;

    if (isBotMode) {
      setRoom({
        ...room,
        round: 1,
        status: 'roundResult',
        winner: null,
        history: [],
        p1: room.p1 ? { ...room.p1, score: 0, choice: null, readyForNext: false } : null,
        p2: room.p2 ? { ...room.p2, score: 0, choice: null, readyForNext: false } : null,
      });
    } else {
      gameEngine.restartMatch();
    }
  };

  // Send Reaction
  const handleSendReaction = (text: string, emoji?: string) => {
    if (isBotMode) {
      const msg: ReactionMessage = {
        id: Math.random().toString(36).substring(2, 8),
        senderId: myPlayerId,
        senderName: room?.p1?.name || 'Tú',
        text,
        emoji,
        timestamp: Date.now(),
      };
      setReactions((prev) => [...prev.slice(-10), msg]);
    } else {
      gameEngine.sendReaction(text, emoji || '🔥', room?.p1?.id === myPlayerId ? room?.p1?.name || 'Jugador' : room?.p2?.name || 'Jugador');
    }
  };

  // Leave room
  const handleLeaveRoom = () => {
    gameEngine.leaveRoom();
    setRoom(null);
    setIsBotMode(false);
    setReactions([]);
    window.history.replaceState({}, '', window.location.pathname);
  };

  return (
    <main className="min-h-screen bg-neutral-100/90 text-neutral-900 flex flex-col justify-start items-center p-2 sm:p-6 select-none font-sans antialiased safe-top safe-bottom">
      {/* Background Graphic Accents */}
      <div className="fixed inset-0 pointer-events-none opacity-30 overflow-hidden flex items-center justify-center">
        <div className="w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] bg-red-200/40 rounded-full blur-3xl -translate-y-24"></div>
        <div className="w-[300px] sm:w-[400px] h-[300px] sm:h-[400px] bg-blue-200/30 rounded-full blur-3xl translate-y-36 translate-x-24"></div>
      </div>

      <div className="w-full relative z-10">
        {!room ? (
          <LobbyView
            initialCode={initialRoomCode}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            onPlayBot={handlePlayBot}
          />
        ) : (
          <GameRoomView
            room={room}
            myPlayerId={myPlayerId}
            isBotMode={isBotMode}
            onPlayChoice={handlePlayChoice}
            onNextRound={handleNextRound}
            onRestartMatch={handleRestartMatch}
            onSendReaction={handleSendReaction}
            onLeaveRoom={handleLeaveRoom}
            reactions={reactions}
            isConnected={true}
          />
        )}
      </div>
    </main>
  );
}
