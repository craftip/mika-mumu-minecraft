# Block Quest

Block Quest is a lightweight voxel building game that runs completely in the browser using [Three.js](https://threejs.org/). Build structures to match level blueprints and unlock a sandbox mode to create anything you like.

## Controls

- **Left Click:** place block
- **Right Click:** remove block
- **WASD:** move
- **Space:** jump
- **F:** toggle float mode
- **Number keys 1–9:** change block color

## Running Locally

Simply open `index.html` in a modern desktop browser (Chrome or Safari). No server is required. Your progress is saved in `localStorage`.

## Deployment

Upload the `block-quest` folder to any static hosting service (GitHub Pages, Netlify, etc.). The game requires only a web server to serve the files.

## Exporting Save Data

Click the **Export Save** button in the HUD to download your progress as a JSON file.

## File Structure

```
block-quest/
├── index.html
├── style.css
├── main.js
└── README.md
```

All blueprint images and the color palette are embedded directly in `main.js` as
base64 data URIs to keep the game self‑contained without binary assets.
