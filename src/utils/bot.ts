import { Choice } from '../types';

export function getBotChoice(userHistory: Choice[], difficulty: 'casual' | 'smart' = 'smart'): Choice {
  const choices: Choice[] = ['piedra', 'papel', 'tijera'];

  if (difficulty === 'casual' || userHistory.length === 0) {
    return choices[Math.floor(Math.random() * choices.length)];
  }

  // Smart strategy:
  // Psychological heuristic in RPS/Yan Ken Po:
  // 1. Beginners often repeat winning moves and switch losing moves.
  // 2. People rarely pick the same move 3 times in a row.
  const lastUserChoice = userHistory[userHistory.length - 1];

  // 60% chance to predict user repeats or switches, 40% random
  const rand = Math.random();
  if (rand < 0.35) {
    // Expect user to counter bot's counter -> pick what beats user's last move
    if (lastUserChoice === 'piedra') return 'papel';
    if (lastUserChoice === 'papel') return 'tijera';
    return 'piedra';
  } else if (rand < 0.7) {
    // Expect user to switch to the move that wasn't played
    if (lastUserChoice === 'piedra') return 'tijera'; // draw or beat their switch
    if (lastUserChoice === 'papel') return 'piedra';
    return 'papel';
  }

  return choices[Math.floor(Math.random() * choices.length)];
}
