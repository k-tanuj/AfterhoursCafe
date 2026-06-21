import { useEffect, useMemo, useRef, useState } from "react";
import { Svg } from "@/lib/svgs";
import rockImg from "@/assets/rps-rock.png";
import paperImg from "@/assets/rps-paper.png";
import scissorsImg from "@/assets/rps-scissors.png";

// ---------- Tic Tac Toe (2P or vs CPU) ----------
type Cell = null | "X" | "O";
const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

function checkWinner(b: Cell[]): "X" | "O" | "draw" | null {
  for (const [a, c, d] of LINES) if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a]!;
  return b.every(Boolean) ? "draw" : null;
}

// dumb-but-fair cpu: win > block > center > corner > random
function cpuPick(b: Cell[], me: "X" | "O"): number {
  const opp = me === "X" ? "O" : "X";
  const empty = b.map((v, i) => v ? -1 : i).filter((i) => i >= 0);
  const tryWin = (who: "X" | "O") => {
    for (const i of empty) { const t = [...b]; t[i] = who; if (checkWinner(t) === who) return i; }
    return -1;
  };
  const w = tryWin(me); if (w >= 0) return w;
  const blk = tryWin(opp); if (blk >= 0) return blk;
  if (empty.includes(4)) return 4;
  const corners = [0,2,6,8].filter((i) => empty.includes(i));
  if (corners.length) return corners[Math.floor(Math.random() * corners.length)];
  return empty[Math.floor(Math.random() * empty.length)];
}

function TicTacToe() {
  const [mode, setMode] = useState<"2p" | "cpu">("cpu");
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [turn, setTurn] = useState<"X" | "O">("X");
  // in CPU mode: you = X, cpu = O
  const winner = useMemo(() => checkWinner(board), [board]);

  const play = (i: number) => {
    if (board[i] || winner) return;
    if (mode === "cpu" && turn === "O") return; // cpu's turn — ignore clicks
    const next = [...board]; next[i] = turn; setBoard(next);
    setTurn(turn === "X" ? "O" : "X");
  };

  // CPU move
  useEffect(() => {
    if (mode !== "cpu" || winner || turn !== "O") return;
    const t = setTimeout(() => {
      const i = cpuPick(board, "O");
      if (i < 0) return;
      const next = [...board]; next[i] = "O"; setBoard(next); setTurn("X");
    }, 450);
    return () => clearTimeout(t);
  }, [mode, turn, board, winner]);

  const reset = (nextMode?: "2p" | "cpu") => {
    if (nextMode) setMode(nextMode);
    setBoard(Array(9).fill(null));
    setTurn("X");
  };

  const status =
    winner === "draw" ? "draw. try again."
    : winner ? (mode === "cpu" ? (winner === "X" ? "you win." : "cpu wins.") : `${winner} wins.`)
    : mode === "cpu" ? (turn === "X" ? "your turn (X)" : "cpu thinking…")
    : `${turn}'s turn`;

  return (
    <GameCard title="tic tac toe" subtitle={mode === "cpu" ? "you vs cpu" : "two players · same device"} rot="-1.5deg">
      <div className="flex justify-center gap-1 mb-3 font-mono text-[10px] uppercase tracking-widest">
        <button
          onClick={() => reset("cpu")}
          className={`px-2 py-1 border border-ink/40 transition-colors ${mode === "cpu" ? "bg-ink text-paper" : "bg-paper hover:bg-accent/15"}`}
        >
          vs cpu
        </button>
        <button
          onClick={() => reset("2p")}
          className={`px-2 py-1 border border-ink/40 transition-colors ${mode === "2p" ? "bg-ink text-paper" : "bg-paper hover:bg-accent/15"}`}
        >
          2 players
        </button>
      </div>
      <p className="font-mono text-[11px] uppercase tracking-widest text-ink/55 mb-3">{status}</p>
      <div className="grid grid-cols-3 gap-1 w-[210px] mx-auto">
        {board.map((c, i) => (
          <button
            key={i}
            onClick={() => play(i)}
            className="size-[68px] bg-paper border-2 border-ink/70 font-display text-4xl text-ink hover:bg-accent/15 transition-colors"
          >
            {c}
          </button>
        ))}
      </div>
      <button onClick={() => reset()} className="mt-4 font-mono text-[11px] uppercase tracking-widest text-ink/60 hover:text-accent">
        ↻ reset
      </button>
    </GameCard>
  );
}

// ---------- Rock · Paper · Scissors (cafe twist: bean · notepad · pencil) ----------
const RPS = ["rock", "paper", "scissors"] as const;
type Move = typeof RPS[number];
const IMG: Record<Move, string> = { rock: rockImg, paper: paperImg, scissors: scissorsImg };
const LABEL: Record<Move, string> = { rock: "rock", paper: "paper", scissors: "scissors" };

function RockPaperScissors() {
  const [you, setYou] = useState<Move | null>(null);
  const [cpu, setCpu] = useState<Move | null>(null);
  const [score, setScore] = useState({ you: 0, cpu: 0 });

  const play = (m: Move) => {
    const c = RPS[Math.floor(Math.random() * 3)];
    setYou(m); setCpu(c);
    if (m === c) return;
    const youWin = (m === "rock" && c === "scissors") || (m === "paper" && c === "rock") || (m === "scissors" && c === "paper");
    setScore((s) => youWin ? { ...s, you: s.you + 1 } : { ...s, cpu: s.cpu + 1 });
  };
  const result = you && cpu ? (you === cpu ? "tie." : ((you === "rock" && cpu === "scissors") || (you === "paper" && cpu === "rock") || (you === "scissors" && cpu === "paper")) ? "you win." : "cpu wins.") : "pick one ↓";

  return (
    <GameCard title="rock paper scissors" subtitle="vs the cafe wifi" rot="1.2deg">
      <p className="font-mono text-[11px] uppercase tracking-widest text-ink/55 mb-3">
        you {score.you} · cpu {score.cpu}
      </p>
      <div className="flex justify-around items-center mb-3 h-16">
        <div className="size-14 grid place-items-center">
          {you ? <img src={IMG[you]} alt={LABEL[you]} className="w-12 h-12 object-contain" loading="lazy" /> : <span className="text-2xl text-ink/30">·</span>}
        </div>
        <span className="font-display text-xl text-ink/60">vs</span>
        <div className="size-14 grid place-items-center">
          {cpu ? <img src={IMG[cpu]} alt={LABEL[cpu]} className="w-12 h-12 object-contain" loading="lazy" /> : <span className="text-2xl text-ink/30">·</span>}
        </div>
      </div>
      <p className="font-display text-2xl text-center mb-4">{result}</p>
      <div className="flex gap-2 justify-center">
        {RPS.map((m) => (
          <button
            key={m}
            onClick={() => play(m)}
            title={LABEL[m]}
            className="size-16 bg-paper border-2 border-ink/70 hover:bg-accent/15 transition-colors grid place-items-center"
          >
            <img src={IMG[m]} alt={LABEL[m]} className="w-10 h-10 object-contain" loading="lazy" />
          </button>
        ))}
      </div>
    </GameCard>
  );
}

// ---------- Memory Match ----------
const PAIRS = ["coffee", "moon", "headphones", "sparkle", "flowers", "vinyl"];
function shuffle<T>(a: T[]) { return [...a].sort(() => Math.random() - 0.5); }

function MemoryMatch() {
  const build = () => shuffle([...PAIRS, ...PAIRS]).map((face, i) => ({ id: i, face, flipped: false, matched: false }));
  const [cards, setCards] = useState(build);
  const [picks, setPicks] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);

  const done = cards.every((c) => c.matched);

  useEffect(() => {
    if (picks.length !== 2) return;
    const [a, b] = picks;
    setMoves((m) => m + 1);
    if (cards[a].face === cards[b].face) {
      setTimeout(() => {
        setCards((cs) => cs.map((c, i) => i === a || i === b ? { ...c, matched: true } : c));
        setPicks([]);
      }, 400);
    } else {
      setTimeout(() => {
        setCards((cs) => cs.map((c, i) => i === a || i === b ? { ...c, flipped: false } : c));
        setPicks([]);
      }, 700);
    }
  }, [picks, cards]);

  const flip = (i: number) => {
    if (picks.length === 2 || cards[i].flipped || cards[i].matched) return;
    setCards((cs) => cs.map((c, idx) => idx === i ? { ...c, flipped: true } : c));
    setPicks((p) => [...p, i]);
  };

  const reset = () => { setCards(build()); setPicks([]); setMoves(0); };

  return (
    <GameCard title="memory match" subtitle="find the pairs" rot="-0.8deg">
      <p className="font-mono text-[11px] uppercase tracking-widest text-ink/55 mb-3">
        {done ? `done in ${moves} flips ✦` : `flips: ${moves}`}
      </p>
      <div className="grid grid-cols-4 gap-2 w-[224px] mx-auto">
        {cards.map((c, i) => (
          <button
            key={c.id}
            onClick={() => flip(i)}
            className={`size-[50px] border-2 border-ink/70 grid place-items-center transition-all ${
              c.matched ? "bg-accent/30 opacity-40" : c.flipped ? "bg-paper" : "bg-ink text-paper hover:bg-ink/80"
            }`}
          >
            {c.flipped || c.matched ? (
              <Svg name={c.face} className="w-8 h-8 object-contain" />
            ) : (
              <span className="font-display text-xl">?</span>
            )}
          </button>
        ))}
      </div>
      <button onClick={reset} className="mt-4 font-mono text-[11px] uppercase tracking-widest text-ink/60 hover:text-accent">
        ↻ shuffle
      </button>
    </GameCard>
  );
}

// ---------- shared journal-card frame ----------
function GameCard({ title, subtitle, rot, children }: { title: string; subtitle: string; rot: string; children: React.ReactNode }) {
  return (
    <div className="relative" style={{ transform: `rotate(${rot})` }}>
      <Svg name="paperclip" className="absolute -top-8 right-6 w-10 h-10 rotate-12 z-20" />
      <div
        className="relative bg-[#fdf6e3] shadow-xl p-6 md:p-7 border border-ink/10 text-center min-h-[340px]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(transparent, transparent 27px, rgba(60,40,20,0.14) 27px, rgba(60,40,20,0.14) 28px)",
          backgroundPositionY: "6px",
        }}
      >
        <h3 className="font-display text-3xl text-ink/90 -rotate-[1deg]">{title}</h3>
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink/45 mb-4">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}

export function LittleEscapes() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 mt-10">
      <TicTacToe />
      <RockPaperScissors />
      <MemoryMatch />
    </div>
  );
}