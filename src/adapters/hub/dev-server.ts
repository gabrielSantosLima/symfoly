import { randomUUID } from 'node:crypto'
import { EndpointStore, defaultEndpointPath } from '../../domain/services/EndpointStore'
import { createHubServer } from '../../domain/services/HubServer'
import { Persistence, defaultStorePath } from '../../domain/services/Persistence'
import { RoomStore } from '../../domain/services/RoomStore'
import { CloseRoomUseCase } from '../../domain/useCases/CloseRoomUseCase'
import { JoinRoomUseCase } from '../../domain/useCases/JoinRoomUseCase'
import { LeaveRoomUseCase } from '../../domain/useCases/LeaveRoomUseCase'
import { ListRoomsUseCase } from '../../domain/useCases/ListRoomsUseCase'
import { ReceiveMessagesUseCase } from '../../domain/useCases/ReceiveMessagesUseCase'
import { SendMessageUseCase } from '../../domain/useCases/SendMessageUseCase'
import { SetRoomPausedUseCase } from '../../domain/useCases/SetRoomPausedUseCase'
import { DeleteRoomUseCase } from '../../domain/useCases/DeleteRoomUseCase'
import { GetRoomStateUseCase } from '../../domain/useCases/GetRoomStateUseCase'
import { TaskUseCase } from '../../domain/useCases/TaskUseCase'

const rooms = new RoomStore()
const token = process.env.SYMFOLY_TOKEN ?? randomUUID()
const port = Number(process.env.SYMFOLY_PORT ?? 0)
const channel = process.env.SYMFOLY_CHANNEL ?? 'development'

const persistence = new Persistence(defaultStorePath(channel))
const loaded = persistence.load()
if (loaded) rooms.restore(loaded)
rooms.onChange(() => persistence.schedule(rooms.snapshot()))

const hub = await createHubServer(
  {
    joinRoom: new JoinRoomUseCase(rooms),
    leaveRoom: new LeaveRoomUseCase(rooms),
    sendMessage: new SendMessageUseCase(rooms),
    receiveMessages: new ReceiveMessagesUseCase(rooms),
    listRooms: new ListRoomsUseCase(rooms),
    closeRoom: new CloseRoomUseCase(rooms),
    setRoomPaused: new SetRoomPausedUseCase(rooms),
    deleteRoom: new DeleteRoomUseCase(rooms),
    task: new TaskUseCase(rooms),
    getRoomState: new GetRoomStateUseCase(rooms),
  },
  { token, port },
)

const endpointStore = new EndpointStore(defaultEndpointPath(channel))
endpointStore.save({ port: hub.port, token })

console.log(`symfoly hub (${channel}) listening on ws://127.0.0.1:${hub.port}`)
console.log(`token: ${token}`)
console.log('press Ctrl+C to stop')

process.on('SIGINT', async () => {
  persistence.flush()
  endpointStore.clear()
  await hub.close()
  process.exit(0)
})
