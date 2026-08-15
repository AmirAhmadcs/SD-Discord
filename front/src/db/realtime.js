import { Client } from '@stomp/stompjs';

import {
  applyLiveMessage,
  getAccessTokenValue,
  refreshSessionToken,
  setRealtimeConnected,
} from './store';

let client = null;
let activeChannelId = null;
const subscriptions = new Map();

function brokerUrl() {
  const protocol =
    window.location.protocol ===
    'https:'
      ? 'wss:'
      : 'ws:';

  return `${protocol}//${window.location.host}/ws`;
}

function authHeaders() {
  const token =
    getAccessTokenValue();

  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
}

function subscribeActive() {
  if (
    !client ||
    !client.connected
  ) {
    return;
  }

  if (
    activeChannelId != null &&
    !subscriptions.has(
      activeChannelId,
    )
  ) {
    const subscription =
      client.subscribe(
        `/topic/channel/${activeChannelId}`,
        (frame) => {
          try {
            applyLiveMessage(
              JSON.parse(
                frame.body,
              ),
            );
          } catch {
            // Ignore malformed frames.
          }
        },
      );

    subscriptions.set(
      activeChannelId,
      subscription,
    );
  }
}

export function connectRealtime() {
  if (client) {
    return;
  }

  client = new Client({
    brokerURL: brokerUrl(),

    reconnectDelay: 3000,

    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,

    connectHeaders: authHeaders(),

    onConnect: () => {
      setRealtimeConnected(true);
      subscribeActive();
    },

    onWebSocketClose: () => {
      setRealtimeConnected(false);

      refreshSessionToken()
        .then((refreshed) => {
          if (
            client &&
            refreshed
          ) {
            client.connectHeaders =
              authHeaders();
          }
        })
        .catch(() => {});
    },

    onStompError: () => {
      setRealtimeConnected(false);
    },
  });

  client.activate();
}

export function disconnectRealtime() {
  for (
    const subscription
    of subscriptions.values()
  ) {
    try {
      subscription.unsubscribe();
    } catch {
      // Ignore already-closed subscriptions.
    }
  }

  subscriptions.clear();
  activeChannelId = null;

  if (client) {
    try {
      client.deactivate();
    } catch {
      // Ignore teardown errors.
    }

    client = null;
  }

  setRealtimeConnected(false);
}

export function setActiveChannel(
  channelId,
) {
  activeChannelId =
    channelId ?? null;

  for (
    const [id, subscription]
    of subscriptions
  ) {
    if (id !== activeChannelId) {
      try {
        subscription.unsubscribe();
      } catch {
        // Ignore already-closed subscriptions.
      }

      subscriptions.delete(id);
    }
  }

  subscribeActive();
}
