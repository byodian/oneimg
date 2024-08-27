import type { Content } from '@/types/type'

const DB_NAME = 'ContentDB'
const STORE_NAME = 'contents'

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request: IDBOpenDBRequest = indexedDB.open(DB_NAME, 1)

    request.onerror = () => reject(new Error('Failed to open database'))
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db: IDBDatabase = (event.target as IDBOpenDBRequest).result
      db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
    }
  })
}

export async function getContents(): Promise<Content[]> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction: IDBTransaction = db.transaction(STORE_NAME, 'readonly')
      const store: IDBObjectStore = transaction.objectStore(STORE_NAME)
      const request: IDBRequest<Content[]> = store.getAll()

      request.onerror = () => reject(new Error('Failed to fetch contents'))
      request.onsuccess = () => resolve(request.result)
    })
  } catch (error) {
    console.error('Error in getContents:', error)
    throw error
  }
}

// remove all contents
export async function removeAllContents(): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction: IDBTransaction = db.transaction(STORE_NAME, 'readwrite')
      const store: IDBObjectStore = transaction.objectStore(STORE_NAME)
      const request: IDBRequest = store.clear()

      request.onerror = () => reject(new Error('Failed to remove all contents'))
      request.onsuccess = () => resolve()
    })
  } catch (error) {
    console.error('Error in removeAllContents:', error)
    throw error
  }
}

// add all contents
export async function addAllContents(contents: Content[]): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction: IDBTransaction = db.transaction(STORE_NAME, 'readwrite')
      const store: IDBObjectStore = transaction.objectStore(STORE_NAME)

      contents.forEach((content) => {
        // Remove the id property to allow auto-increment
        store.add(content)
      })

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(new Error('Failed to add all contents'))
    })
  } catch (error) {
    console.error('Error in addAllContents:', error)
    throw error
  }
}

export async function addContent(content: Content): Promise<number> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction: IDBTransaction = db.transaction(STORE_NAME, 'readwrite')
      const store: IDBObjectStore = transaction.objectStore(STORE_NAME)
      const request: IDBRequest<IDBValidKey> = store.add(content)

      request.onerror = () => reject(new Error('Failed to add content'))
      request.onsuccess = () => resolve(request.result as number)
    })
  } catch (error) {
    console.error('Error in addContent:', error)
    throw error
  }
}

export async function updateContent(content: Content): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction: IDBTransaction = db.transaction(STORE_NAME, 'readwrite')
      const store: IDBObjectStore = transaction.objectStore(STORE_NAME)
      const request: IDBRequest<IDBValidKey> = store.put(content)

      request.onerror = () => reject(new Error('Failed to update content'))
      request.onsuccess = () => resolve()
    })
  } catch (error) {
    console.error('Error in updateContent:', error)
    throw error
  }
}

export async function deleteContent(id: number): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction: IDBTransaction = db.transaction(STORE_NAME, 'readwrite')
      const store: IDBObjectStore = transaction.objectStore(STORE_NAME)
      const request: IDBRequest = store.delete(id)

      request.onerror = () => reject(new Error('Failed to delete content'))
      request.onsuccess = () => resolve()
    })
  } catch (error) {
    console.error('Error in deleteContent:', error)
    throw error
  }
}
