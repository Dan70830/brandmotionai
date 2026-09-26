# BrandMotion AI — Short-Form Video Generator

An AI-powered web application that turns a product image and short description into authentic, short-form UGC (User-Generated Content) video clips ready for social platforms like TikTok, Instagram Reels, and YouTube Shorts.

---

## 🌟 Project Overview

BrandMotion AI automates the end-to-end creation of product-led UGC videos using AI and Livepeer. Users upload an image of their product, enter a name and brief description, and choose a creative strategy angle. The application handles fact extraction, scriptwriting, voice narration, image-to-video animation, and subtitle generation to produce a download-ready vertical MP4 video.

---

## 🔄 Product Workflow

1. **Upload Product:** Upload a clear image of the product (PNG, JPG, or WEBP format).
2. **Enter Details:** Supply the product name and a short description of key features or benefits.
3. **Select UGC Style:** Choose a narrative creative strategy:
   - **Problem → Solution:** Opens with a grounded consideration hook, bridging to documented product benefits.
   - **Product Recommendation:** Word-of-mouth style recommendation grounded in real product specs.
   - **First Impression:** Spontaneous discovery hook highlighting standout design or visual details.
4. **Generate:** Watch step-by-step progress as script, voice, animation, and captions compile.
5. **Preview & Download:** Play the resulting vertical 9:16 MP4 with custom controls or download the video directly.

---

## 🏗 Architecture

The application is structured into a React frontend and a Node.js Express backend proxy that orchestrates Livepeer Agent AI capabilities:

```
[ Frontend: React + Vite ] (http://127.0.0.1:3000)
            │
            ▼  (POST /api/generate-ugc & Polling GET /api/generation-status/:jobId)
[ Backend: Express Proxy ] (http://127.0.0.1:3001)
            │
            ▼  (JSON-RPC / MCP Transport over HTTPS)
[ Livepeer Agent Cloud ] (https://agent.livepeer.org/api/mcp)
```

- **Frontend (`127.0.0.1:3000`):** React 19 + Vite + Tailwind CSS v4 interface providing upload drag-and-drop, step progress indicators, and interactive video playback.
- **Backend Proxy (`127.0.0.1:3001`):** Express server executing the multi-stage generation pipeline, handling MCP transport retries, persisting job state, and serving API endpoints.

---

## 🛠 Technology Stack

- **Frontend:** React 19, Vite 8, TypeScript, Tailwind CSS v4, Lucide React
- **Backend:** Node.js, Express 5, Model Context Protocol (MCP) SDK
- **AI & Media Infrastructure:** Livepeer Agent Cloud Infrastructure
- **Media Capabilities:** Chatterbox TTS, LTX Video (I2V), Hyperframes Captions, FFmpeg Mux

---

## 🎥 Livepeer Agent Integration

Livepeer Agent serves as the core media generation and processing engine for the entire video pipeline.

### Pipeline Execution Order

```
Product Payload
       ↓
[ 1. Creative Engine ] ──► Fact extraction & dynamic UGC scriptwriting (local node engine)
       ↓
[ 2. Chatterbox TTS ]  ──► Synthesizes voice narration audio track (Livepeer Agent)
       ↓
[ 3. LTX 2.5 I2V ]     ──► Animates uploaded product image into 9:16 video (Livepeer Agent)
       ↓
[ 4. FFmpeg Mux ]      ──► Combines TTS audio wave and LTX video stream (Livepeer Agent)
       ↓
[ 5. Hyperframes ]     ──► Burns formatted multi-line social subtitles into MP4 (Livepeer Agent)
       ↓
Final UGC MP4 Output
```

---

## 📊 Livepeer Agent Usage & Evaluation

The table below summarizes the Livepeer Agent capabilities integrated into the application, their function, and observed test metrics:

| Component | Tool / Model | Purpose | Result | Observed Cost | Limitations & Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Text-to-Speech** | `chatterbox-tts` | Generate UGC voice narration | Successfully generated WAV narration track | ~$0.0028 observed run | Output quality depends on script formatting and punctuation. |
| **Image-to-Video** | `ltx-25-i2v-fast` | Animate supplied product image into short-form UGC clip | Successfully generated an 8-second MP4 | $1.092 observed 8s generation | Cost represents observed test run; visual motion requires precise prompt direction to achieve an authentic handheld feel. |
| **Captions** | `hyperframes-caption` | Burn subtitles into narration video | Successfully rendered multi-line social captions | Not measured | Long text blocks require explicit newline formatting to prevent horizontal clipping. |
| **Video Composition**| `ffmpeg-mux` | Combine TTS audio and LTX video stream | Successfully produced final synced MP4 | Not measured | Part of deterministic server-side media assembly. |

*Note: The $1.092 figure represents an observed cost for one 8-second generation test during development, not a universal Livepeer pricing guarantee.*

---

## ⚠️ Limitations & Development Learnings

1. **Short Video Duration:** The current MVP generates 8-second video clips tailored for social media attention hooks.
2. **MCP Transport Resilience:** During development, polling Livepeer MCP occasionally returned network transport errors (`mcp-remote: fetch failed`). A generation job could still complete successfully on the server despite polling drops. The backend server implements retry logic and distinguishes transport errors from actual generation failures.
3. **Product Identity Preservation:** Image-to-video generation requires careful prompting to keep the product's visual identity accurate. Prompts explicitly instruct the model to preserve exact product packaging, label text, colors, shape, and proportions from the uploaded source image.
4. **UGC Visual Style vs. Commercial Renders:** Initial prompt tests produced static linear zooms resembling commercial 3D renders. Prompts were refined to specify handheld smartphone camera movement, natural room lighting, and authentic social composition.
5. **Caption Formatting:** Submitting an unformatted multi-line narration script to `hyperframes-caption` caused horizontal text overflow. Subtitles are now formatted into balanced 2–3 line blocks with explicit newlines prior to caption generation.

---

## 🚀 Local Setup & Running

### Prerequisites

- Node.js (v18+ recommended)
- npm

### Installation

```bash
# Clone repository
git clone <repository-url>
cd <repository-folder>

# Install dependencies
npm install
```

### Environment Configuration (Optional)

Copy `.env.example` to `.env` if custom server settings are needed:

```bash
cp .env.example .env
```

### Running Locally

Development requires running two terminal processes concurrently:

**Terminal 1 (Backend API Server):**
```bash
npm run server
```
*Backend server runs on `http://127.0.0.1:3001`*

**Terminal 2 (Frontend Dev Server):**
```bash
npm run dev
```
*Frontend dev server runs on `http://127.0.0.1:3000`*

Open `http://127.0.0.1:3000` in your web browser to test the application.
