import React, { useMemo, useState, useEffect } from 'react';
import CardRow, { Card } from './components/CardRow';

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [deck, setDeck] = useState<'letters' | 'ingredients'>('letters');

  useEffect(() => {
    document.body.classList.toggle('light', theme === 'light');
  }, [theme]);

  const gradients = [
    'linear-gradient(135deg, #ff7ee3 0%, #7afcff 100%)',
    'linear-gradient(135deg, #ffd166 0%, #ff6b6b 100%)',
    'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
    'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
    'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  ];

  const ingredients = ['Tomato','Basil','Garlic','Olive Oil','Parmesan','Lemon','Ginger','Cumin','Paprika','Thyme'];

  const items: Card[] = useMemo(() => {
    if (deck === 'letters') {
      return 'ABCDEFGHIJ'.split('').map((ch, i) => ({
        id: ch,
        label: ch,
        gradient: gradients[i % gradients.length],
      }));
    }
    return ingredients.map((name, i) => ({
      id: name,
      label: name,
      gradient: gradients[(i + 2) % gradients.length],
    }));
  }, [deck]);

  return (
    <div className="app">
      <h1 className="title">Balatro‑Style Card Row</h1>
      <div className="toolbar">
        <button className="btn" onClick={() => setDeck(d => d === 'letters' ? 'ingredients' : 'letters')}>
          Deck: {deck === 'letters' ? 'Letters A–J' : 'Ingredients'}
        </button>
        <button className="btn" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
          Theme: {theme === 'dark' ? 'Dark' : 'Light'}
        </button>
        <span className="kbd-hint">Press R to reset order</span>
      </div>
      <CardRow items={items} theme={theme} />
      <p className="hint">Drag, reorder, or use keyboard (Space, arrows, Enter/Esc). Press R to reset.</p>
    </div>
  );
}
