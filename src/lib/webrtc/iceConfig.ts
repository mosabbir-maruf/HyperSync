/**
 * ICE configuration for peer connections.
 *
 * Public STUN servers help peers discover their reachable addresses for a
 * direct connection. No TURN relay is configured by default: a TURN server
 * would relay the media/data path through a third party, which we avoid for
 * privacy. Operators who need connectivity across restrictive NATs can supply
 * their OWN TURN credentials via env — bytes still never touch LocalShare.
 */
export function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
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
  bundlePolicy: "balanced",
  iceCandidatePoolSize: 10,
}
