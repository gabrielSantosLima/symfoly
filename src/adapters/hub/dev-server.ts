import { randomUUID } from 'node:crypto'
import { EndpointStore } from '../../domain/services/EndpointStore'
import { createHubServer } from '../../domain/services/HubServer'
import { RoomStore } from '../../domain/services/RoomStore'
import { CloseRoomUseCase } from '../../domain/useCases/CloseRoomUseCase'
import { JoinRoomUseCase } from '../../domain/useCases/JoinRoomUseCase'
import { LeaveRoomUseCase } from '../../domain/useCases/LeaveRoomUseCase'
import { ListRoomsUseCase } from '../../domain/useCases/ListRoomsUseCase'
import { ReceiveMessagesUseCase } from '../../domain/useCases/ReceiveMessagesUseCase'
import { SendMessageUseCase } from '../../domain/useCases/SendMessageUseCase'

const rooms = new RoomStore()
const token = process.env.SYMFOLY_TOKEN ?? randomUUID()
const port = Number(process.env.SYMFOLY_PORT ?? 0)

const hub = await createHubServer(
  {
    joinRoom: new JoinRoomUseCase(rooms),
    leaveRoom: new LeaveRoomUseCase(rooms),
    sendMessage: new SendMessageUseCase(rooms),
    receiveMessages: new ReceiveMessagesUseCase(rooms),
    listRooms: new ListRoomsUseCase(rooms),
    closeRoom: new CloseRoomUseCase(rooms),
  },
  { token, port },
)

const endpointStore = new EndpointStore()
endpointStore.save({ port: hub.port, token })

console.log(`symfoly hub listening on ws://127.0.0.1:${hub.port}`)
console.log(`token: ${token}`)
console.log('press Ctrl+C to stop')

process.on('SIGINT', async () => {
  endpointStore.clear()
  await hub.close()
  process.exit(0)
})
