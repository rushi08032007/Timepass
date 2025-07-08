// This file is machine-generated - edit at your own risk.

'use server';

/**
 * @fileOverview This file contains the Genkit flow for providing feedback on user guesses against an AI-generated secret code in the Code Duel game.
 *
 * - aiVersusCodeFeedback - A function that takes the user's guess and the AI's secret code, provides feedback, and returns the updated game state.
 * - AiVersusCodeFeedbackInput - The input type for the aiVersusCodeFeedback function.
 * - AiVersusCodeFeedbackOutput - The return type for the aiVersusCodeFeedback function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiVersusCodeFeedbackInputSchema = z.object({
  secretCode: z
    .string()
    .length(3)
    .regex(/^[0-9]+$/)
    .describe('The AI opponent secret 3-digit code.'),
  guess: z
    .string()
    .length(3)
    .regex(/^[0-9]+$/)
    .describe('The user 3-digit guess.'),
  guessesRemaining: z
    .number()
    .int()
    .min(0)
    .describe('The number of guesses remaining.'),
});
export type AiVersusCodeFeedbackInput = z.infer<typeof AiVersusCodeFeedbackInputSchema>;

const AiVersusCodeFeedbackOutputSchema = z.object({
  feedback: z
    .string()
    .describe(
      'Feedback on the guess, indicating correct digits and their positions.'
    ),
  guessesRemaining: z
    .number()
    .int()
    .min(0)
    .describe('The updated number of guesses remaining.'),
  isCorrectGuess: z.boolean().describe('Whether the guess was correct.'),
  hasLost: z.boolean().describe('True when the user has run out of guesses.'),
});
export type AiVersusCodeFeedbackOutput = z.infer<typeof AiVersusCodeFeedbackOutputSchema>;

export async function aiVersusCodeFeedback(
  input: AiVersusCodeFeedbackInput
): Promise<AiVersusCodeFeedbackOutput> {
  return aiVersusCodeFeedbackFlow(input);
}

const aiVersusCodeFeedbackFlow = ai.defineFlow(
  {
    name: 'aiVersusCodeFeedbackFlow',
    inputSchema: AiVersusCodeFeedbackInputSchema,
    outputSchema: AiVersusCodeFeedbackOutputSchema,
  },
  async input => {
    let correctDigits = 0;
    let correctPositions = 0;
    const secretCodeArray = input.secretCode.split('');
    const guessArray = input.guess.split('');

    for (let i = 0; i < secretCodeArray.length; i++) {
      if (secretCodeArray[i] === guessArray[i]) {
        correctPositions++;
        correctDigits++;
      } else if (secretCodeArray.includes(guessArray[i])) {
        correctDigits++;
      }
    }

    let feedback = '';
    if (correctDigits === 0) {
      feedback = 'No digits are correct.';
    } else {
      feedback = `You have ${correctDigits} correct digits, with ${correctPositions} in the correct position.`;
    }

    const isCorrectGuess = correctPositions === 3;
    const guessesRemaining = input.guessesRemaining - 1;
    const hasLost = guessesRemaining <= 0 && !isCorrectGuess;

    return {
      feedback,
      guessesRemaining,
      isCorrectGuess,
      hasLost,
    };
  }
);
