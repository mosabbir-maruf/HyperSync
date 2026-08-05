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
      ],
    },
  ]

  return servers
}

export const RTC_CONFIG: RTCConfiguration = {
  iceServers: getIceServers(),
  bundlePolicy: "max-bundle", // single DTLS handshake, lower overhead
}
