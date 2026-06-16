# Convork — Real-Time Communication App

Video conferencing + screen share + whiteboard + file sharing, built with WebRTC, Socket.io, and React.

---

## Phase 1 — Auth + Rooms Setup

### 1. Database (PostgreSQL)
```bash
# Install PostgreSQL, then:
createdb rtcapp
```

### 2. Backend
```bash
cd server
cp .env.example .env
# Edit .env with your DB credentials and a strong JWT_SECRET

npm install
# Initialize tables (run once):
node -e "require('./config/db').initDB()"
npm run dev
```
Server runs on http://localhost:4000

### 3. Frontend
```bash
cd client
npm install
npm run dev
```
App runs on http://localhost:5173

---

## Phase 2 — Video Calling

WebRTC peer connections are handled in `useWebRTC.js`.

**How it works:**
1. User A joins → Socket.io sends them a list of existing users
2. User A creates a `SimplePeer` (initiator=true) for each existing user
3. SimplePeer generates an **offer** → sent via Socket.io to each peer
4. Each peer creates SimplePeer (initiator=false), receives offer, generates **answer**
5. ICE candidates are exchanged until a direct P2P connection forms
6. Media streams flow directly browser-to-browser (no server in the path)

**STUN/TURN:**
- STUN (stun.l.google.com) is free and works for most users
- For production, run `coturn` or use [Xirsys](https://xirsys.com) for TURN
- Add your TURN credentials to `.env` and uncomment the ICE server in `useWebRTC.js`

---

## Phase 3 — Screen Share + Whiteboard + Files

### Screen Share
`getDisplayMedia()` opens the browser's native screen picker.
The video track is then **replaced** on all existing peer connections via `replaceTrack()`.
When sharing stops, the original camera track is restored.

### Whiteboard
Uses Fabric.js (loaded via CDN in `index.html`).
Draw events are broadcast to all peers via Socket.io `whiteboard-event`.
All peers render incoming paths on their own Fabric canvas.

### File Sharing
Files are uploaded to the server via multipart form (with progress tracking).
After upload, a `file-uploaded` Socket.io event notifies all room participants.
Files are stored on disk with UUID filenames to prevent collisions.

---

## Phase 4 — Production Hardening (TODO)

- [ ] **TURN server**: Deploy `coturn` on a VPS or use Xirsys
- [ ] **SFU for large rooms**: Replace mesh WebRTC with [mediasoup](https://mediasoup.org) for 6+ users
- [ ] **Rate limiting**: Add `express-rate-limit` on auth routes
- [ ] **Helmet**: Add `helmet` middleware for security headers
- [ ] **File encryption**: Encrypt files at rest using Node.js `crypto` (AES-256-GCM)
- [ ] **Room expiry**: Add TTL to rooms, auto-delete after 24h
- [ ] **Recording**: Use MediaRecorder API on client or server-side with GStreamer
- [ ] **Waiting room**: Add pre-join lobby with host admit/deny controls
- [ ] **Background blur**: Use `@tensorflow-models/body-segmentation` with canvas

---

## Environment Variables

### server/.env
```
PORT=4000
CLIENT_URL=http://localhost:5173
JWT_SECRET=change_this_to_a_random_64_char_string
JWT_EXPIRES_IN=7d
DATABASE_URL=postgresql://user:password@localhost:5432/rtcapp
TURN_URL=turn:your-turn-server.com:3478
TURN_USERNAME=username
TURN_CREDENTIAL=password
```

### client/.env (optional)
```
VITE_SERVER_URL=http://localhost:4000
```

---

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `simple-peer` | WebRTC abstraction (offer/answer/ICE) |
| `socket.io` | Signaling server + chat + events |
| `fabric` | Whiteboard canvas drawing |
| `jsonwebtoken` | Auth tokens |
| `bcryptjs` | Password hashing |
| `multer` | File uploads |
| `pg` | PostgreSQL client |

---

## WebRTC Flow Diagram

```
User A                  Signal Server              User B
  |                          |                        |
  |-- join-room ------------>|                        |
  |<-- room-users (empty) ---|                        |
  |                          |<-- join-room ----------|
  |<-- user-joined ----------|                        |
  |                          |                        |
  |-- offer (to B) --------->|-- offer (to B) ------->|
  |                          |<-- answer (to A) -------|
  |<-- answer (from B) ------|                        |
  |                          |                        |
  |<--- ICE candidates exchanged -------------------- |
  |                                                   |
  |<========== P2P media stream (no server) =========|
```
