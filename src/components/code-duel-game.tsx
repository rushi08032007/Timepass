
"use client"

import { useState, useEffect, useCallback, useRef } from "react";
import { aiVersusCodeFeedback } from "@/ai/flows/ai-versus-code-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Trophy, Frown, BrainCircuit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const MAX_GUESSES = 10;

const generateSecretCode = (): string => {
  const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  let secret = '';
  for (let i = 0; i < 3; i++) {
    const randomIndex = Math.floor(Math.random() * digits.length);
    secret += digits.splice(randomIndex, 1)[0];
  }
  return secret;
};

export function CodeDuelGame() {
  const [secretCode, setSecretCode] = useState<string | null>(null);
  const [guesses, setGuesses] = useState<{ guess: string; feedback: string }[]>([]);
  const [currentGuess, setCurrentGuess] = useState<string[]>(['', '', '']);
  const [guessesRemaining, setGuessesRemaining] = useState(MAX_GUESSES);
  const [gameStatus, setGameStatus] = useState<'generating' | 'playing' | 'won' | 'lost'>('generating');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const startNewGame = useCallback(() => {
    setGameStatus('generating');
    const newSecretCode = generateSecretCode();
    setSecretCode(newSecretCode);
    setGuesses([]);
    setCurrentGuess(['', '', '']);
    setGuessesRemaining(MAX_GUESSES);
    setGameStatus('playing');
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  const handleGuessChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value.replace(/\D/g, '');
    const newGuess = [...currentGuess];
    newGuess[index] = value.slice(-1);
    setCurrentGuess(newGuess);

    if (value && index < 2) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !currentGuess[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleGuessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const guessString = currentGuess.join('');

    if (guessString.length !== 3) {
      toast({ variant: "destructive", title: "Invalid Guess", description: "Please enter a 3-digit code." });
      return;
    }
    if (new Set(guessString.split('')).size !== 3) {
      toast({ variant: "destructive", title: "Invalid Guess", description: "Digits must be unique." });
      return;
    }

    setIsLoading(true);

    try {
      if (!secretCode) throw new Error("Secret code not generated.");
      
      const result = await aiVersusCodeFeedback({
        secretCode,
        guess: guessString,
        guessesRemaining,
      });

      setGuesses(prev => [{ guess: guessString, feedback: result.feedback }, ...prev]);
      setGuessesRemaining(result.guessesRemaining);
      
      if (result.isCorrectGuess) {
        setGameStatus('won');
      } else if (result.hasLost) {
        setGameStatus('lost');
      }
      
      setCurrentGuess(['', '', '']);
      inputRefs.current[0]?.focus();

    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "An error occurred. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="w-full max-w-md mx-auto flex flex-col gap-6">
      <header className="text-center">
        <h1 className="font-headline text-5xl sm:text-6xl font-bold text-primary tracking-tight flex items-center justify-center gap-3">
          <BrainCircuit className="h-10 w-10 sm:h-12 sm:w-12" />
          Code Duel
        </h1>
        <p className="text-muted-foreground mt-3 text-base sm:text-lg">
          Guess the AI's secret 3-digit code. Digits are unique.
        </p>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Enter your guess</CardTitle>
          <CardDescription>You have {guessesRemaining} guesses remaining.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGuessSubmit} className="flex gap-2 sm:gap-4 items-center">
            <div className="flex-grow grid grid-cols-3 gap-2 sm:gap-4">
              {currentGuess.map((digit, index) => (
                <Input
                  key={index}
                  ref={el => inputRefs.current[index] = el}
                  type="tel"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleGuessChange(e, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className="text-center text-2xl font-mono h-16 sm:h-20"
                  disabled={isLoading || gameStatus !== 'playing'}
                  aria-label={`Digit ${index + 1}`}
                />
              ))}
            </div>
            <Button type="submit" size="icon" className="h-16 w-16 sm:h-20 sm:w-20 shrink-0" disabled={isLoading || gameStatus !== 'playing'}>
              {isLoading ? <Loader2 className="animate-spin h-8 w-8" /> : <Send className="h-8 w-8" />}
              <span className="sr-only">Submit Guess</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      {guesses.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Guess History</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48 pr-4">
              <div className="space-y-3">
                {guesses.map((g, i) => (
                  <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-muted/50 animate-in fade-in duration-300">
                    <div className="font-mono text-xl sm:text-2xl tracking-widest text-foreground">{g.guess}</div>
                    <div className="text-sm text-right text-muted-foreground">{g.feedback}</div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={gameStatus === 'won' || gameStatus === 'lost'} onOpenChange={(open) => !open && startNewGame()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-2xl">
              {gameStatus === 'won' ? <Trophy className="text-yellow-400 h-8 w-8" /> : <Frown className="h-8 w-8" />}
              {gameStatus === 'won' ? 'You Won!' : 'Game Over!'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base pt-2">
              {gameStatus === 'won' 
                ? `Congratulations! You guessed the code in ${MAX_GUESSES - guessesRemaining} guesses.`
                : `You've run out of guesses. The secret code was `}
              <span className="font-bold text-primary font-mono tracking-widest text-lg">{secretCode}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={startNewGame} className="w-full">Play Again</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
