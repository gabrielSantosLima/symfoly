import type { CreateRoomRequest } from '../shared/ipc'
import type { RoomDetail, RoomInfo } from '../shared/protocol'
import type { CloseRoomUseCase } from '../domain/useCases/CloseRoomUseCase'
import type { CreateRoomUseCase } from '../domain/useCases/CreateRoomUseCase'
import type { GetRoomDetailUseCase } from '../domain/useCases/GetRoomDetailUseCase'
import type { ListRoomsUseCase } from '../domain/useCases/ListRoomsUseCase'

export interface RoomsControllerDependencies {
  createRoom: CreateRoomUseCase
  closeRoom: CloseRoomUseCase
  listRooms: ListRoomsUseCase
  getRoomDetail: GetRoomDetailUseCase
}

/** Thin IPC-facing controller: translates requests into use cases. */
export class RoomsController {
  constructor(private readonly dependencies: RoomsControllerDependencies) {}

  list(): RoomInfo[] {
    return this.dependencies.listRooms.execute()
  }

  create(input: CreateRoomRequest): RoomInfo {
    return this.dependencies.createRoom.execute({
      name: input.name,
      brief: input.brief,
      topic: input.topic,
      createdBy: 'human',
    })
  }

  detail(room: string): RoomDetail | undefined {
    return this.dependencies.getRoomDetail.execute(room)
  }

  close(room: string): RoomInfo | undefined {
    return this.dependencies.closeRoom.execute(room)
  }
}
