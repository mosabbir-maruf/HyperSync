/**
 * ICE configuration for WebRTC peer connections.
 * Includes multiple redundant STUN servers + fallback TURN/TURNS relay servers
 * to ensure connections succeed across different networks, mobile data (CGNAT),
 * symmetric NATs, and strict firewalls.
 */
export function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    {
      urls: [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
        "stun:stun2.l.google.com:19302",
        "stun:stun3.l.google.com:19302",
        "stun:stun4.l.google.com:19302",
        "stun:stun.cloudflare.com:3478",
        "stun:global.stun.twilio.com:3478",
        "stun:openrelay.metered.ca:80",
      ],
    },
    // Fallback TURN relay for strict NATs / Mobile Cellular networks / CGNAT
    {
      urls: [
        "turn:openrelay.metered.ca:80",
        "turn:openrelay.metered.ca:443",
        "turn:openrelay.metered.ca:443?transport=tcp",
        "turns:openrelay.metered.ca:443",
        "turns:openrelay.metered.ca:443?transport=tcp",
      ],
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ]

  const turnUrl = import.meta.env.VITE_TURN_URL as string | undefined
  const turnUser = import.meta.env.VITE_TURN_USERNAME as string | undefined
  const turnCred = import.meta.env.VITE_TURN_CREDENTIAL as string | undefined
  if (turnUrl && turnUser && turnCred) {
    servers.push({ urls: turnUrl, username: turnUser, credential: turnCred })
  }

  return servers
}

export const RTC_CONFIG: RTCConfiguration = {
  iceServers: getIceServers(),
  bundlePolicy: "max-bundle", // single DTLS handshake, lower overhead
  iceCandidatePoolSize: 16,
}
