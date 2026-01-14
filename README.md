# SplatCam - Gaussian Splatting for iPhone

A high-fidelity 3D Gaussian Splatting application demo built for iPhone. This app allows you to capture images of an object, visualize the reconstruction process, and view the resulting high-quality splat.

## Features
- **Premium UI**: Designed with glassmorphism and smooth animations for a premium feel.
- **Image Capture**: Built-in camera interface to capture the necessary photos for a splat.
- **Progress Simulation**: High-fidelity visualization of the 3DGS training stages (Feature Extraction, SfM, Optimization).
- **Mobile-First Viewer**: Interactive 3D viewer powered by `gsplat.js` to explore the finished splat.

## Tech Stack
- **Frontend**: React, Vite, Framer Motion, Lucide React
- **Rendering**: Three.js, gsplat.js
- **Styling**: Vanilla CSS with CSS Variables for theme tokens.

## How to use
1. **Open the app** on your iPhone browser.
2. Click **"Start New Scan"**.
3. **Capture Photos**: Take at least 5 photos (ideally 50+) around an object.
4. **Process**: Watch the simulation as the app "uploads and optimizes" your 3D model.
5. **Explore**: Orbit, pan, and zoom around your finished Gaussian Splat.

---

## Real Backend Integration
To turn this from a demo into a production app, you need a GPU-powered backend. 

### 1. Backend Script (Python)
You can use a library like [nerfstudio](https://docs.nerf.studio/) or the original [3DGS implementation](https://github.com/graphdeco-tergel/gaussian-splatting).

```python
# Simple FastAPI bridge (example)
from fastapi import FastAPI, UploadFile, File
import subprocess

app = FastAPI()

@app.post("/reconstruct")
async def reconstruct(files: list[UploadFile] = File(...)):
    # 1. Save images to a temporary directory
    # 2. Run COLMAP for camera poses
    # 3. Run Gaussian Splatting training
    # 4. Export to .splat or .ply
    # return result_url
    pass
```

### 2. Update Frontend
In `src/App.tsx`, replace the `simulateProcessing` function with a real API call to your backend:

```typescript
const startRealProcessing = async () => {
    setState('processing');
    const formData = new FormData();
    capturedImages.forEach(img => formData.append('images', img.blob));
    
    const response = await fetch('YOUR_BACKEND_URL/reconstruct', {
        method: 'POST',
        body: formData
    });
    const { splatUrl } = await response.json();
    setSplatUrl(splatUrl);
    setState('viewer');
};
```

## Setup & Development
```bash
npm install
npm run dev
```
