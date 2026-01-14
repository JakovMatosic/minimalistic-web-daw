# 🎵 Minimalistic Web DAW

A beginner-friendly web-based Digital Audio Workstation built with **Angular**, **Tone.js**, and the **Web Audio API**. Create and loop synth-based beats right in your browser.

## ✨ Features

- 🎹 Piano roll interface for composing melodies
- 🎛️ Instrument settings for sound customization
- 🔁 Loop and playback controls
- 🎵 Real-time audio synthesis with Tone.js

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- npm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/minimalistic-web-daw.git
   cd minimalistic-web-daw/web-daw
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   ng serve
   ```

4. Open your browser and navigate to `http://localhost:4200/`

The application will automatically reload whenever you modify any source files.

## 📁 Project Structure

- `src/app/` - Main application components
  - `audio/` - Audio engine and synthesis logic
  - `piano-roll/` - Piano roll UI component
  - `instrument-settings-bar/` - Sound customization controls
  - `song/` - Song management and playback

## 🛠️ Tech Stack

- **Framework**: Angular
- **Audio**: Tone.js + Web Audio API
- **Styling**: CSS
- **Testing**: Jasmine/Karma