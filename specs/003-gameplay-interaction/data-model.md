# Data Model: Gameplay Interaction

## Entities

### Room (extended from Scenario 2)

```
Room {
  code:                  string           // 4-char uppercase — unchanged
  status:                RoomStatus       // "lobby" | "playing" | "ended"  ← "ended" added
  participants:          Participant[]    // unchanged
  hostId:                string           // unchanged
  currentDrawerId:       string | null    // set on startGame; unchanged
  secretWord:            string | null    // set on startGame; unchanged
  strokes:               Stroke[]         // new — drawer's canvas path list; [] on start
  scores:                Record<string, number>  // new — participantId → score; 0 for all on start
  correctGuessers:       string[]         // new — participantIds who guessed correctly this round
  guesses:               Guess[]          // new — full guess history for the round
  roundStartedAt:        string           // new — ISO 8601; set by startGame
  roundDurationSeconds:  number           // new — always ROUND_DURATION_SECONDS (60)
  createdAt:             string           // unchanged
  updatedAt:             string           // unchanged
}
```

**New fields**: `strokes`, `scores`, `correctGuessers`, `guesses`, `roundStartedAt`, `roundDurationSeconds`
**Changed fields**: `status` broadened from `"lobby" | "playing"` to `"lobby" | "playing" | "ended"`

---

### Stroke (new)

```
Stroke {
  points: Array<{ x: number; y: number }>
}
```

One stroke = one continuous mouseDown→mouseUp path.  
`x` and `y` are canvas pixel coordinates as reported by the browser.

---

### Guess (new)

```
Guess {
  participantId:  string    // guesser's UUID
  text:           string    // trimmed input
  isCorrect:      boolean   // true if text.toLowerCase() === room.secretWord.toLowerCase()
  submittedAt:    string    // ISO 8601
}
```

---

### GameState (new — shape embedded in RoomSnapshot)

```
GameState {
  roundEndsAt:     string                           // ISO 8601 = roundStartedAt + roundDurationSeconds * 1000ms
  strokes:         Stroke[]                         // current canvas strokes
  guesses:         Guess[]                          // full guess history in submission order
  scores:          Array<{ participantId: string; score: number }>  // stable-ordered score list
  correctGuessers: string[]                         // participantIds who have guessed correctly
}
```

---

### RoomSnapshot (extended from Scenario 2)

```
RoomSnapshot {
  code:              string
  status:            "lobby" | "playing" | "ended"   ← "ended" added
  participants:      Participant[]
  availableWords:    string[]
  isHost:            boolean
  currentDrawerId:   string | null
  secretWord:        string | null                   // non-null for drawer only, when playing
  gameState:         GameState | null                // new — non-null when status is "playing" or "ended"
}
```

**New fields**: `gameState`
**Changed fields**: `status` broadened

---

### RoomStatus (extended)

```
type RoomStatus = "lobby" | "playing" | "ended"
```

Previously `"lobby" | "playing"`.

---

### Participant (unchanged)

```
Participant {
  id:       string
  name:     string
  joinedAt: string
}
```

---

## Validation Rules

| Context | Rule |
|---|---|
| `submitGuess.participantId` | Required, non-empty string; must not be the drawer (`participantId === room.currentDrawerId` → 403) |
| `submitGuess` when `status !== "playing"` | Rejected with 409 ("Round is not active") |
| `submitGuess` when expired | `checkRoundExpiry` transitions to `"ended"` before the guard; same 409 fires |
| `submitGuess` when already correct | `room.correctGuessers.includes(participantId)` → 409 ("Already guessed correctly") |
| `submitGuess` empty/whitespace | Trimmed value is empty string → 400 ("Guess cannot be empty") |
| `addStroke.participantId` | Must equal `room.currentDrawerId` → 403 if not |
| `addStroke` when `status !== "playing"` | 409 ("Round is not active") |
| `clearCanvas.participantId` | Must equal `room.currentDrawerId` → 403 if not |
| `startGame` guard | Updated to `room.status !== "lobby"` (rejects both "playing" and "ended") |

---

## State Transitions

```
"lobby"
   │
   │  POST /rooms/:code/start (by host)
   ▼
"playing"  ←── strokes appended (addStroke) ───────┐
   │            guesses recorded (submitGuess)       │
   │            scores updated on correct guess      │
   │                                                  │
   │  checkRoundExpiry: Date.now() >= roundEndsAt
   ▼
"ended"
```

- `"lobby" → "playing"`: `startGame()` — sets `strokes=[]`, `scores={all:0}`, `correctGuessers=[]`, `guesses=[]`, `roundStartedAt=now()`, `roundDurationSeconds=60`
- `"playing" → "ended"`: lazy transition in `checkRoundExpiry()`, called at the start of `submitGuess`, `addStroke`, and `toRoomSnapshot`
- No `"ended" → *` transition in this scenario

---

## `toRoomSnapshot` Visibility Rules

| Viewer | `secretWord` | `gameState` |
|---|---|---|
| Any viewer in lobby | `null` | `null` |
| Drawer in playing | `room.secretWord` | full `GameState` |
| Guesser in playing | `null` | full `GameState` |
| Any viewer in ended | `room.secretWord` | full `GameState` (secret word revealed to all) |

---

## `startGame` Extension

`startGame()` in `roomStore.ts` gains the following initialisations (in addition to existing logic):

```
room.strokes              = []
room.guesses              = []
room.correctGuessers      = []
room.scores               = Object.fromEntries(
                              room.participants.map(p => [p.id, 0])
                            )
room.roundStartedAt       = now()
room.roundDurationSeconds = ROUND_DURATION_SECONDS   // 60
```

---

## Frontend Store State

`RoomSnapshot` gains `gameState: GameState | null`. The existing `setRoomSnapshot` path in `roomStore.ts` flows this through without changes to the store class itself.

The `GamePage` component reads `room.gameState` for strokes, guesses, scores, and `roundEndsAt`.
