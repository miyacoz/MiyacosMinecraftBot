import {
  Message,
  Member,
  Role,
  User,
} from 'eris'

export interface IStore {
  // bot: Omit<Member, 'guild'> | null
  members: Map<string, Omit<Member, 'guild'>>
  users: Map<string, User>
  roles: Map<string, Omit<Role, 'guild'>>
  semaphore: Map<string, boolean>
  processingTasks: Message[]
}

export const store = {
  members: new Map(),
  users: new Map(),
  roles: new Map(),
  semaphore: new Map(),
  processingTasks: [],
}


export const semaphoredAction = async (
  store: IStore,
  semaphoreName: string,
  message: Message,
  action: Function,
  actionWhenAwait?: Function,
): Promise<void> => {
  if (store.semaphore.get(semaphoreName)) {
    if (actionWhenAwait) {
      await actionWhenAwait()
    }
    return
  }

  store.semaphore.set(semaphoreName, true)
  store.processingTasks.push(message)

  await action()

  store.semaphore.set(semaphoreName, false)

  const index = store.processingTasks.findIndex(messageOfTask => messageOfTask.id === message.id)
  if (index >= 0) {
    store.processingTasks.splice(index, 1)
  }
}
