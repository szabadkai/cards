Create a React component called CardRow that displays a horizontal row of cards,
inspired by Balatro's style. Requirements:

- Each card: colorful gradient background, rounded corners, drop shadow,
  subtle hover glow and scale-up animation.
- Supports fluid drag-and-drop reordering:
    - While dragging, card lifts with elevation, rotates slightly based
      on cursor position, and follows pointer with spring physics.
    - When dropped, other cards smoothly shift into place with spring
      animation.
- Use framer-motion for animations and @dnd-kit for drag and drop.
- The layout should be responsive: cards centered, with slight overlap,
  and elastic spacing adjustments on reorder.
- Code should be clean and functional, using React + TypeScript,
  with inline demo data (e.g. 5 sample cards labeled A–E).

Output a single complete file with all imports included.
