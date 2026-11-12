import { contextBridge, ipcRenderer } from 'electron'
import type { SymfolyApi } from '../shared/api'

const api: SymfolyApi = {
  getVersion: () => ipcRenderer.invoke('app:version'),
}

contextBridge.exposeInMainWorld('symfoly', api)
