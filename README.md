# Web Board Arcade - Next.js Frontend

This is the Next.js frontend application for the Web Board Arcade platform. It incorporates premium dark-theme elements, glassmorphic card grids, 3D dice physics matching Ludo King, and a shared reusable component design system.

## 🚀 Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 🎛️ Shared Component Library

We have created five highly flexible, reusable React components in `app/_components/`. Use them to ensure styling consistency and avoid code duplication:

### 1. Button
Wraps standard HTML button properties with custom styling, icon injections, and loading spinner controls.
```tsx
import { Button } from "./_components/button";
import { Play } from "lucide-react";

<Button
  variant="primary" // primary, secondary, outline, danger, ghost
  size="md" // sm, md, lg
  leftIcon={<Play />}
  isLoading={loading}
>
  Start Game
</Button>
```

### 2. Input
Input element with top uppercase label, left/right inset icons, and animated validation error text.
```tsx
import { Input } from "./_components/input";
import { Key } from "lucide-react";

<Input
  label="Admin Passcode"
  type="password"
  value={passcode}
  onChange={e => setPasscode(e.target.value)}
  leftIcon={<Key />}
  error={authError}
/>
```

### 3. Table
Generic type-safe table rendering component with responsive horizontal scrolling container wrappers.
```tsx
import { Table } from "./_components/table";

<Table
  headers={["Name", "Score", "Rank"]}
  data={playersList}
  renderRow={(player, index) => (
    <tr key={player.id}>
      <td className="px-5 py-4 font-bold text-white">{player.name}</td>
      <td className="px-5 py-4 text-zinc-350">{player.score}</td>
      <td className="px-5 py-4 text-indigo-400">#{index + 1}</td>
    </tr>
  )}
/>
```

### 4. Card
Shared card box used on both the main dashboard and game lobby pages. Incorporates sparkles badges, description paragraphs, icons, and nested custom action buttons.
```tsx
import { Card } from "./_components/card";
import { Shield } from "lucide-react";

<Card
  name="Classic Ludo"
  description="Roll dice, capture opponent tokens, and race home."
  route="/ludo"
  color="from-rose-500 to-orange-500"
  accentColor="text-rose-500"
  bgGradient="bg-rose-500/10"
  borderColor="border-rose-500/20"
  shadow="shadow-rose-500/10"
  badge="Popular"
  icon={Shield}
  buttonText="Play Game"
/>
```

### 5. GameGate
Lobby gatekeeper. Standardizes the loading logic and displays a clean lock alert screen if a game has been set to private by the administrator.
```tsx
import { GameGate } from "./_components/game-gate";

return (
  <GameGate config={config} loading={loading}>
    <div>
      {/* Rest of the lobby page goes here */}
    </div>
  </GameGate>
);
```
