// Browser stub for bittorrent-dht
// DHT (Distributed Hash Table) doesn't work in browsers, so we export an empty stub
// WebTorrent will use WebRTC trackers instead for peer discovery in browsers

import { EventEmitter } from "events";

export class Client extends EventEmitter {
  constructor() {
    super();
  }

  listen() {
    // No-op in browser
  }

  destroy() {
    // No-op in browser
  }

  lookup() {
    // No-op in browser
  }

  announce() {
    // No-op in browser
  }
}

export default Client;
