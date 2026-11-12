import { randomUUID } from 'node:crypto'
import type { MessageKind, ProtocolMessage } from '../../shared/protocol'

export interface NewMessage {
  room: string
  senderId: string
  senderName: string
  text: string
  kind?: MessageKind
  to?: string
  ref?: string
  expectsReply?: boolean
  done?: boolean
}

export class Message {
  private constructor(
    readonly id: string,
    readonly seq: number,
    readonly room: string,
    readonly senderId: string,
    readonly senderName: string,
    readonly kind: MessageKind,
    readonly text: string,
    readonly ts: number,
    readonly to?: string,
    readonly ref?: string,
    readonly expectsReply?: boolean,
    readonly done?: boolean,
  ) {}

  static create(seq: number, input: NewMessage, now = Date.now()): Message {
    return new Message(
      randomUUID(),
      seq,
      input.room,
      input.senderId,
      input.senderName,
      input.kind ?? 'chat',
      input.text,
      now,
      input.to,
      input.ref,
      input.expectsReply,
      input.done,
    )
  }

  static system(seq: number, room: string, text: string, now = Date.now()): Message {
    return new Message(randomUUID(), seq, room, 'system', 'system', 'system', text, now)
  }

  toProtocol(): ProtocolMessage {
    return {
      id: this.id,
      seq: this.seq,
      room: this.room,
      senderId: this.senderId,
      senderName: this.senderName,
      kind: this.kind,
      text: this.text,
      to: this.to,
      ref: this.ref,
      expectsReply: this.expectsReply,
      done: this.done,
      ts: this.ts,
    }
  }
}
