import { joinRoom, selfId } from 'trystero';
import { Player, ChatMessage, GameStatus } from '../types';

// Actions we can transmit
type ActionType = 'PLAYER_UPDATE' | 'CHAT_MESSAGE' | 'GAME_STATE_UPDATE' | 'PLAYER_TAGGED';

interface Payload {
    type: ActionType;
    data: any;
}

interface GameStatePayload {
    status: GameStatus;
    timer: number;
    seekerId: string;
}

class RealtimeService {
  private room: any;
  private sendAction: any;
  private getAction: any;
  
  // Listeners
  private onPlayerUpdate: ((players: Player[]) => void) | null = null;
  private onChat: ((msg: ChatMessage) => void) | null = null;
  private onStream: ((stream: MediaStream, peerId: string) => void) | null = null;
  private onPeerLeaveCallback: ((peerId: string) => void) | null = null;
  private onGameStateChange: ((state: GameStatePayload) => void) | null = null;

  // Local State
  public peers: Map<string, Player> = new Map(); // Made public for direct access if needed
  public selfPlayer: Player | null = null;
  private roomId = 'neon-hide-seek-v2';
  
  // Throttling
  private lastBroadcastTime = 0;

  constructor() {
    // Service initialized, waiting for connect()
  }

  public async connect(username: string): Promise<Player> {
    // 1. Join Room (using public torrent trackers via Trystero)
    const config = { appId: 'neon-hide-seek-game' };
    this.room = joinRoom(config, this.roomId);

    // 2. Setup Data Channels
    const [send, get] = this.room.makeAction('gameEvents');
    this.sendAction = send;
    this.getAction = get;

    // 3. Create Self Player with random 2D position
    this.selfPlayer = {
        id: selfId,
        name: username,
        y: 50, 
        x: Math.floor(Math.random() * 80) + 10,
        color: this.getRandomColor(),
        isTalking: false,
        isSelf: true,
        role: 'HIDER',
        status: 'ALIVE',
        facing: 'right'
    };
    this.peers.set(selfId, this.selfPlayer);

    // 4. Setup Listeners
    this.setupNetworkListeners();

    // 5. Broadcast our existence immediately to any existing peers
    setTimeout(() => this.broadcastUpdate(), 500);

    return this.selfPlayer;
  }

  public moveSelf(x: number, y: number, facing: 'left' | 'right') {
    if (!this.selfPlayer) return;
    
    // Update local state immediately
    this.selfPlayer.x = x;
    this.selfPlayer.y = y;
    this.selfPlayer.facing = facing;

    // Throttle network broadcasts to ~20fps (50ms)
    const now = Date.now();
    if (now - this.lastBroadcastTime > 50) {
        this.broadcastUpdate();
        this.lastBroadcastTime = now;
    }
  }

  public updateMyStatus(status: 'ALIVE' | 'CAUGHT', role: 'SEEKER' | 'HIDER') {
      if(!this.selfPlayer) return;
      this.selfPlayer.status = status;
      this.selfPlayer.role = role;
      this.broadcastUpdate();
  }

  public broadcastGameState(status: GameStatus, timer: number, seekerId: string) {
      this.sendAction({
          type: 'GAME_STATE_UPDATE',
          data: { status, timer, seekerId }
      });
  }

  public broadcastTagged(victimId: string) {
      // Logic for the seeker to tell everyone "I got him!"
      this.sendAction({
          type: 'PLAYER_TAGGED',
          data: { victimId }
      });
  }

  public sendChat(text: string) {
    if (!this.selfPlayer) return;
    
    const msg: ChatMessage = {
        id: Date.now().toString() + '-' + selfId,
        senderId: selfId,
        senderName: this.selfPlayer.name,
        text,
        timestamp: Date.now()
    };
    
    // Broadcast to others
    this.sendAction({ type: 'CHAT_MESSAGE', data: msg });
    // Trigger local
    if (this.onChat) this.onChat(msg);
  }

  public broadcastTalking(isTalking: boolean) {
      if(!this.selfPlayer) return;
      if (this.selfPlayer.isTalking !== isTalking) {
          this.selfPlayer.isTalking = isTalking;
          this.broadcastUpdate(); // Talking status updates are important, send immediately
      }
  }

  public async joinVoice(stream: MediaStream) {
      if (!this.room) return;
      try {
        this.room.addStream(stream);
      } catch (e) {
        console.error("Error adding stream:", e);
      }
  }

  // --- Internals ---

  private setupNetworkListeners() {
    // A. Handle Peer Join
    this.room.onPeerJoin((peerId: string) => {
        console.log(`Peer ${peerId} joined`);
        // Send them our current state immediately so they know who we are
        this.broadcastUpdate();
    });

    // B. Handle Peer Leave
    this.room.onPeerLeave((peerId: string) => {
        console.log(`Peer ${peerId} left`);
        this.peers.delete(peerId);
        this.emitPlayerList();
        if (this.onPeerLeaveCallback) this.onPeerLeaveCallback(peerId);
    });

    // C. Handle Data
    this.getAction((payload: Payload, peerId: string) => {
        switch (payload.type) {
            case 'PLAYER_UPDATE':
                const pData = payload.data as Player;
                const updatedPlayer = { ...pData, id: peerId, isSelf: false };
                this.peers.set(peerId, updatedPlayer);
                this.emitPlayerList();
                break;
            case 'CHAT_MESSAGE':
                if (this.onChat) this.onChat(payload.data);
                break;
            case 'GAME_STATE_UPDATE':
                if (this.onGameStateChange) this.onGameStateChange(payload.data);
                break;
            case 'PLAYER_TAGGED':
                // Check if *I* am the victim
                if (payload.data.victimId === selfId && this.selfPlayer) {
                    this.selfPlayer.status = 'CAUGHT';
                    this.broadcastUpdate(); // Tell everyone I'm dead
                }
                break;
        }
    });

    // D. Handle Audio Streams
    this.room.onPeerStream((stream: MediaStream, peerId: string) => {
        console.log("Received stream from", peerId);
        if (this.onStream) this.onStream(stream, peerId);
    });
  }

  private broadcastUpdate() {
    if (!this.selfPlayer) return;
    this.sendAction({ 
        type: 'PLAYER_UPDATE', 
        data: { ...this.selfPlayer, isSelf: false } 
    });
    this.emitPlayerList();
  }

  private emitPlayerList() {
      if (this.onPlayerUpdate) {
          this.onPlayerUpdate(Array.from(this.peers.values()));
      }
  }

  private getRandomColor() {
    const colors = ['bg-red-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // --- External Event Registration ---
  
  public onPlayersChange(cb: (players: Player[]) => void) {
      this.onPlayerUpdate = cb;
  }

  public onChatMessage(cb: (msg: ChatMessage) => void) {
      this.onChat = cb;
  }

  public onRemoteStream(cb: (stream: MediaStream, peerId: string) => void) {
      this.onStream = cb;
  }

  public onPeerDisconnect(cb: (peerId: string) => void) {
      this.onPeerLeaveCallback = cb;
  }

  public onGameStateUpdate(cb: (state: GameStatePayload) => void) {
      this.onGameStateChange = cb;
  }

  public disconnect() {
      if (this.room) this.room.leave();
  }
}

export const realtimeService = new RealtimeService();
