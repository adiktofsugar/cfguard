# Authentication ideas

Check cookie. If nothing, redirect to auth flow. If something, validate it's real.

## Validate with encrypted secret idea

The general idea is based on public/private keys. With the public key, you can generate some value. You send that encrypted value to the client and expect the unencrypted value back, which you can only generate with the private key.

In my case, I'll have one device that needs to be authorized, but a different device is authorizing it.

The auth flow will create a random id that it assigns to the device. Then the device can show a url to authorize that id. The other device goes to that url, which has them sign in, which provides them with a token.

The token could (somehow) be the cipher key. The problem is that the device that's authorized doesn't know the cipher key. Just the authorizing device does. It kinda seems like this is the whole point of this scheme... But maybe there's a way.

The goal, I guess, of doing this, is to prevent someone from just using the id to log in. Without this, you could just spoof a cookie with the id and you're good to go.

If we're doing signed urls (or similar), then you need a cookie to allow you to get those. Maybe that's separate from the auth part. Let's say you have your id in localstorage (so you can't spoof a request as it's not even part of the request). You make a request to a page with that id that should set the signed cookie. It may respond "no". If so, you need to authorize that id. That's the /authorize/$id endpoint that you open on your phone. Maybe it could open up a socket that you could stream the secret to directly? See [this](#webrtc-data-channel-with-server-assisted-signaling) for more info on how this would work. It seems...much harder than I'd like.

## Key Generation Options

Since the token from the auth provider is just a random value (not used for API access), it can be used directly or as a seed:

1. **Direct usage**: Use the auth provider token directly as the cipher key
2. **HKDF derivation**: Use the token as input to HKDF (HMAC-based Key Derivation Function) to generate a proper encryption key
3. **Hash-based**: SHA-256(token + device_id) to create a device-specific key
4. **PBKDF2**: If concerned about entropy, use PBKDF2 with the token as password and device_id as salt

## Secure Browser-to-Browser Transfer Methods

WebRTC seems like the only viable option, and it's complicated.

### WebRTC Data Channel with Server-Assisted Signaling

**Implementation Flow:**

1. **Target device (needs auth):**
   ```javascript
   // Create peer connection with STUN server
   const pc = new RTCPeerConnection({
     iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
   });
   
   // Create data channel for secret transfer
   const channel = pc.createDataChannel('auth');
   
   // Generate offer
   const offer = await pc.createOffer();
   await pc.setLocalDescription(offer);
   
   // Wait for ICE gathering to complete
   await new Promise(resolve => {
     pc.onicecandidate = (e) => {
       if (!e.candidate) resolve();
     };
   });
   
   // PUT offer to server
   const sessionId = crypto.randomUUID();
   await fetch(`/api/auth-session/${sessionId}`, {
     method: 'PUT',
     body: JSON.stringify({ 
       offer: pc.localDescription,
       timestamp: Date.now()
     })
   });
   
   // Show auth URL to user
   const authUrl = `https://app.com/authorize/${sessionId}`;
   ```

2. **Authorizing device (has auth token):**
   ```javascript
   // GET offer from server
   const sessionId = getSessionIdFromUrl();
   const { offer } = await fetch(`/api/auth-session/${sessionId}`).then(r => r.json());
   
   // Create peer connection and set remote offer
   const pc = new RTCPeerConnection({
     iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
   });
   await pc.setRemoteDescription(offer);
   
   // Create answer
   const answer = await pc.createAnswer();
   await pc.setLocalDescription(answer);
   
   // Wait for ICE gathering
   await new Promise(resolve => {
     pc.onicecandidate = (e) => {
       if (!e.candidate) resolve();
     };
   });
   
   // PUT answer to server
   await fetch(`/api/auth-session/${sessionId}/answer`, {
     method: 'PUT',
     body: JSON.stringify({ 
       answer: pc.localDescription,
       timestamp: Date.now()
     })
   });
   
   // Wait for data channel and send secret
   pc.ondatachannel = (e) => {
     e.channel.onopen = () => {
       e.channel.send(JSON.stringify({
         secret: authToken,
         timestamp: Date.now(),
         checksum: sha256(authToken + sessionId)
       }));
     };
   };
   ```

3. **Target device receives answer:**
   ```javascript
   // Poll for answer (or use SSE/WebSocket)
   const pollForAnswer = async () => {
     const res = await fetch(`/api/auth-session/${sessionId}/answer`);
     if (res.ok) {
       const { answer } = await res.json();
       await pc.setRemoteDescription(answer);
       
       // Wait for connection and secret
       channel.onopen = () => console.log('Connected');
       channel.onmessage = (e) => {
         const { secret, checksum } = JSON.parse(e.data);
         // Verify and use secret
       };
     } else {
       setTimeout(pollForAnswer, 2000);
     }
   };
   pollForAnswer();
   ```


**Alternative: WebSocket with Durable Objects:**
   ```javascript
   // Client connects to WebSocket endpoint backed by Durable Object
   const ws = new WebSocket(`wss://app.com/signal/${sessionId}`);
   ws.onmessage = async (e) => {
     const { answer } = JSON.parse(e.data);
     await pc.setRemoteDescription(answer);
   };
   
   // Durable Object coordinates between both devices
   // When answer arrives via PUT, it broadcasts to connected WebSocket
   ```


**Server endpoints needed:**
- `PUT /api/auth-session/:id` - Store offer (TTL ~5 minutes)
- `GET /api/auth-session/:id` - Retrieve offer
- `PUT /api/auth-session/:id/answer` - Store answer
- `GET /api/auth-session/:id/answer` - Retrieve answer (or wait for it)

**Security considerations:**
- Delete session data after successful connection or timeout
- Rate limit session creation
- Add CSRF protection on endpoints
- Consider encrypting SDP data at rest
- Validate session age (expire after 5 minutes)