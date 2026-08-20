/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LobbyView } from './components/LobbyView';
import { GameRoomView } from './components/GameRoomView';
import { Choice, RoomState, ReactionMessage } from './types';
import { getBotChoice } from './utils/bot';
import { sounds } from './utils/audio';

export default function App() {
  const [initialRoomCode, setInitialRoomCode] = useState<string>('');
  const [room, setRoom] = useState<RoomState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string>('');
  const [isBotMode, setIsBotMode] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [reactions, setReactions] = useState<ReactionMessage[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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

  // WebSocket Connection Handler
  const connectWebSocket = useCallback(
    (code: string, playerId: string, name: string, avatar: string) => {
      if (wsRef.current) {
        wsRef.current.close();
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
          ws.send(
            JSON.stringify({
              type: 'join',
              payload: { code, playerId, name, avatar },
            })
          );
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'state') {
              setRoom(data.payload);
            } else if (data.type === 'reaction') {
              setReactions((prev) => [...prev.slice(-10), data.payload]);
            }
          } catch (err) {
            console.error('Error handling WS message:', err);
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          // Try to reconnect if still in a room
          if (room?.code && !isBotMode) {
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = setTimeout(() => {
              connectWebSocket(code, playerId, name, avatar);
            }, 2000);
          }
        };

        ws.onerror = (err) => {
          console.error('WebSocket error:', err);
        };
      } catch (e) {
        console.error('WebSocket init failed:', e);
      }
    },
    [room?.code, isBotMode]
  );

  // Keep-alive ping
  useEffect(() => {
    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 15000);

    return () => clearInterval(pingInterval);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, []);

  // Handle Create Room
  const handleCreateRoom = async (name: string, avatar: string, maxScore: number) => {
    try {
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, avatar, maxScore }),
      });
      const data = await res.json();
      if (data.code) {
        setMyPlayerId(data.playerId);
        setRoom(data.state);
        setIsBotMode(false);
        connectWebSocket(data.code, data.playerId, name, avatar);
        // Update URL query without refresh
        window.history.replaceState({}, '', `?room=${data.code}`);
      }
    } catch (err) {
      alert('Error de conexión al crear la sala');
    }
  };

  // Handle Join Room
  const handleJoinRoom = async (code: string, name: string, avatar: string) => {
    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, name, avatar }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'No se pudo unir a la sala');
        return;
      }
      setMyPlayerId(data.playerId);
      setRoom(data.state);
      setIsBotMode(false);
      connectWebSocket(data.code, data.playerId, name, avatar);
      window.history.replaceState({}, '', `?room=${data.code}`);
    } catch (err) {
      alert('Error al conectar con la sala');
    }
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

  // User submits choice
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
      // Send to WebSocket server
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'playChoice',
            payload: { choice },
          })
        );
      }
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
        p1: room.p1 ? { ...room.p1, choice: null } : null,
        p2: room.p2 ? { ...room.p2, choice: null } : null,
      });
    } else {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'nextRound' }));
      }
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
        p1: room.p1 ? { ...room.p1, score: 0, choice: null } : null,
        p2: room.p2 ? { ...room.p2, score: 0, choice: null } : null,
      });
    } else {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'restartMatch' }));
      }
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
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'reaction',
            payload: { text, emoji },
          })
        );
      }
    }
  };

  // Leave room
  const handleLeaveRoom = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    setRoom(null);
    setIsBotMode(false);
    setReactions([]);
    window.history.replaceState({}, '', window.location.pathname);
  };

  return (
    <main className="min-h-screen bg-neutral-100/80 text-neutral-900 flex flex-col justify-start items-center p-3 sm:p-6 select-none font-sans antialiased">
      {/* Background Graphic Accents */}
      <div className="fixed inset-0 pointer-events-none opacity-40 overflow-hidden flex items-center justify-center">
        <div className="w-[500px] h-[500px] bg-red-200/40 rounded-full blur-3xl -translate-y-24"></div>
        <div className="w-[400px] h-[400px] bg-blue-200/30 rounded-full blur-3xl translate-y-36 translate-x-24"></div>
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
            isConnected={isConnected}
          />
        )}
      </div>
    </main>
  );
}
