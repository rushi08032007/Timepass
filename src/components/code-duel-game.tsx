
"use client"

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Trophy, Users, Swords } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const MAX_TURNS = 10;

type GameStatus = 'setupP1' | 'setupP2' | 'playing' | 'gameOver';
type Player = 'Player 1' | 'Player 2';
type Guess = { guess: string; feedback: string };

const getFeedback = (guess: string, secretCode: string): { feedback: string; isCorrectGuess: boolean } => {
    const secret = secretCode.split('');
    const g = guess.split('');

    let correctPositions = 0;
    let correctDigitsInWrongPosition = 0;

    const secretCopy = [...secret];
    const guessCopy = [...g];

    // First pass: check for correct digits in correct positions (bulls)
    for (let i = 0; i < 3; i++) {
        if (guessCopy[i] === secretCopy[i]) {
            correctPositions++;
            secretCopy[i] = 'X'; // Mark as checked
            guessCopy[i] = 'Y'; // Mark as checked
        }
    }

    // Second pass: check for correct digits in wrong positions (cows)
    for (let i = 0; i < 3; i++) {
        if (guessCopy[i] !== 'Y') {
            const indexInSecret = secretCopy.indexOf(guessCopy[i]);
            if (indexInSecret !== -1) {
                correctDigitsInWrongPosition++;
                secretCopy[indexInSecret] = 'X'; // Mark as checked
            }
        }
    }
    
    let feedback = '';
    if (correctPositions === 3) {
      feedback = 'Correct! You cracked the code!';
    } else if (correctPositions === 0 && correctDigitsInWrongPosition === 0) {
        feedback = 'All incorrect.';
    } else {
        feedback = `${correctPositions} correct position, ${correctDigitsInWrongPosition} wrong position.`;
    }
    
    return {
        feedback,
        isCorrectGuess: correctPositions === 3
    };
};

export function CodeDuelGame() {
    const [gameStatus, setGameStatus] = useState<GameStatus>('setupP1');
    const [winner, setWinner] = useState<Player | 'draw' | null>(null);
    const [turn, setTurn] = useState<number>(1);
    
    const [p1Secret, setP1Secret] = useState<string>('');
    const [p2Secret, setP2Secret] = useState<string>('');
    const [p1Guesses, setP1Guesses] = useState<Guess[]>([]);
    const [p2Guesses, setP2Guesses] = useState<Guess[]>([]);
    const [currentPlayer, setCurrentPlayer] = useState<Player>('Player 1');

    const [currentCode, setCurrentCode] = useState<string[]>(['', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const startNewGame = useCallback(() => {
        setGameStatus('setupP1');
        setWinner(null);
        setTurn(1);
        setP1Secret('');
        setP2Secret('');
        setP1Guesses([]);
        setP2Guesses([]);
        setCurrentPlayer('Player 1');
        setCurrentCode(['', '', '']);
        setTimeout(() => inputRefs.current[0]?.focus(), 0);
    }, []);
    
    useEffect(() => {
        startNewGame();
    }, [startNewGame]);

    useEffect(() => {
        inputRefs.current[0]?.focus();
    }, [gameStatus, currentPlayer]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const value = e.target.value.replace(/\D/g, '');
        const newCode = [...currentCode];
        newCode[index] = value.slice(-1);
        setCurrentCode(newCode);

        if (value && index < 2) {
            inputRefs.current[index + 1]?.focus();
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === 'Backspace' && !currentCode[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const validateCode = (code: string): boolean => {
        if (code.length !== 3) {
            toast({ variant: "destructive", title: "Invalid Input", description: "Please enter a 3-digit code." });
            return false;
        }
        if (new Set(code.split('')).size !== 3) {
            toast({ variant: "destructive", title: "Invalid Input", description: "Digits must be unique." });
            return false;
        }
        return true;
    }

    const handleSetupSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const codeString = currentCode.join('');
        if (!validateCode(codeString)) return;

        if (gameStatus === 'setupP1') {
            setP1Secret(codeString);
            setGameStatus('setupP2');
            setCurrentCode(['', '', '']);
        } else if (gameStatus === 'setupP2') {
            setP2Secret(codeString);
            setGameStatus('playing');
            setCurrentCode(['', '', '']);
        }
    }

    const handleGuessSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const guessString = currentCode.join('');
        if (!validateCode(guessString)) return;

        setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, 300));

        try {
            if (currentPlayer === 'Player 1') {
                const { feedback, isCorrectGuess } = getFeedback(guessString, p2Secret);
                setP1Guesses(prev => [{ guess: guessString, feedback }, ...prev]);
                if (isCorrectGuess) {
                    setWinner('Player 1');
                    setGameStatus('gameOver');
                } else if (turn >= MAX_TURNS) {
                     setCurrentPlayer('Player 2'); // Give P2 their final turn
                } else {
                    setCurrentPlayer('Player 2');
                }
            } else { // Player 2's turn
                const { feedback, isCorrectGuess } = getFeedback(guessString, p1Secret);
                setP2Guesses(prev => [{ guess: guessString, feedback }, ...prev]);
                if (isCorrectGuess) {
                    setWinner('Player 2');
                    setGameStatus('gameOver');
                } else if (turn >= MAX_TURNS) {
                    setWinner('draw');
                    setGameStatus('gameOver');
                } else {
                    setCurrentPlayer('Player 1');
                    setTurn(t => t + 1);
                }
            }
            
            setCurrentCode(['', '', '']);
            inputRefs.current[0]?.focus();

        } catch (e) {
            toast({ variant: "destructive", title: "Error", description: "An error occurred. Please try again." });
        } finally {
            setIsLoading(false);
        }
    };

    const renderSetupScreen = () => {
        const player = gameStatus === 'setupP1' ? 'Player 1' : 'Player 2';
        return (
            <Card className="w-full max-w-md mx-auto shadow-lg animate-in fade-in duration-500">
                <CardHeader>
                    <CardTitle>{player}, set your secret code</CardTitle>
                    <CardDescription>Enter a 3-digit code with unique digits. The other player won't see it.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSetupSubmit} className="flex gap-2 sm:gap-4 items-center">
                        <div className="flex-grow grid grid-cols-3 gap-2 sm:gap-4">
                            {currentCode.map((digit, index) => (
                                <Input
                                    key={index}
                                    ref={el => inputRefs.current[index] = el}
                                    type="password"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleInputChange(e, index)}
                                    onKeyDown={(e) => handleKeyDown(e, index)}
                                    className="text-center text-2xl font-mono h-16 sm:h-20"
                                    autoComplete="off"
                                />
                            ))}
                        </div>
                        <Button type="submit" size="icon" className="h-16 w-16 sm:h-20 sm:w-20 shrink-0">
                            <Send className="h-8 w-8" />
                            <span className="sr-only">Set Code</span>
                        </Button>
                    </form>
                </CardContent>
            </Card>
        );
    }
    
    const renderGameScreen = () => (
        <div className="w-full max-w-4xl mx-auto flex flex-col gap-6">
            <Card className="shadow-lg animate-in fade-in duration-500">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl">{currentPlayer}'s Turn</CardTitle>
                    <CardDescription>Turn {turn} of {MAX_TURNS}. Guess your opponent's code.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleGuessSubmit} className="flex gap-2 sm:gap-4 items-center max-w-md mx-auto">
                        <div className="flex-grow grid grid-cols-3 gap-2 sm:gap-4">
                            {currentCode.map((digit, index) => (
                                <Input
                                    key={index}
                                    ref={el => inputRefs.current[index] = el}
                                    type="tel"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleInputChange(e, index)}
                                    onKeyDown={(e) => handleKeyDown(e, index)}
                                    className="text-center text-2xl font-mono h-16 sm:h-20"
                                    disabled={isLoading}
                                    aria-label={`Digit ${index + 1}`}
                                />
                            ))}
                        </div>
                        <Button type="submit" size="icon" className="h-16 w-16 sm:h-20 sm:w-20 shrink-0" disabled={isLoading}>
                            {isLoading ? <Loader2 className="animate-spin h-8 w-8" /> : <Send className="h-8 w-8" />}
                            <span className="sr-only">Submit Guess</span>
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <PlayerGuesses player="Player 1" guesses={p1Guesses} />
                <PlayerGuesses player="Player 2" guesses={p2Guesses} />
            </div>
        </div>
    );

    const GameOverDialog = () => {
      let title: string = '';
      let description: React.ReactNode = '';

      if (winner === 'draw') {
        title = "It's a Draw!";
        description = "Neither player guessed the code within 10 turns.";
      } else if (winner === 'Player 1') {
        title = "Player 1 Wins!";
        description = <>Congratulations! You cracked Player 2's code (<span className="font-bold text-primary font-mono tracking-widest">{p2Secret}</span>) in {turn} turns.</>;
      } else if (winner === 'Player 2') {
        title = "Player 2 Wins!";
        description = <>Congratulations! You cracked Player 1's code (<span className="font-bold text-primary font-mono tracking-widest">{p1Secret}</span>) in {turn} turns.</>;
      }
      
      return (
        <AlertDialog open={gameStatus === 'gameOver'} onOpenChange={(open) => !open && startNewGame()}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-2xl">
                {winner === 'draw' ? <Users className="h-8 w-8" /> : <Trophy className="text-yellow-400 h-8 w-8" />}
                {title}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-base pt-2">
                {description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={startNewGame} className="w-full">Play Again</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
    };

    return (
        <div className="w-full flex flex-col gap-6">
            <header className="text-center">
                <h1 className="font-headline text-5xl sm:text-6xl font-bold text-primary tracking-tight flex items-center justify-center gap-3">
                    <Swords className="h-10 w-10 sm:h-12 sm:w-12" />
                    Code Duel
                </h1>
                <p className="text-muted-foreground mt-3 text-base sm:text-lg">
                    A 2-player logic battle. Who can crack the code first?
                </p>
            </header>

            {gameStatus === 'setupP1' && renderSetupScreen()}
            {gameStatus === 'setupP2' && renderSetupScreen()}
            {gameStatus === 'playing' && renderGameScreen()}
            <GameOverDialog />
        </div>
    );
}

function PlayerGuesses({ player, guesses }: { player: Player, guesses: Guess[] }) {
    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>{player}'s Guesses</CardTitle>
            </CardHeader>
            <CardContent>
                {guesses.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No guesses yet.</p>
                ) : (
                    <ScrollArea className="h-64 pr-4">
                        <div className="space-y-3">
                            {guesses.map((g, i) => (
                                <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-muted/50 animate-in fade-in duration-300">
                                    <div className="font-mono text-xl sm:text-2xl tracking-widest text-foreground">{g.guess}</div>
                                    <div className="text-sm text-right text-muted-foreground">{g.feedback}</div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    )
}
