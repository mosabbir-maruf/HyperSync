import type { BrowserAdapter } from "./BrowserAdapter"
import { browserAdapter } from "./BrowserAdapter"

export type FileOrigin = "input" | "drag-drop" | "paste" | "mobile-picker" | "directory"

export interface SelectedFiles {
  files: readonly File[]
  origin: FileOrigin
}

export interface FileSelectionOptions {
  multiple?: boolean
  directory?: boolean
  accept?: string
}

export interface InputFileProvider {
  pick(options?: FileSelectionOptions): Promise<SelectedFiles>
}

export interface DragDropProvider {
  fromDataTransfer(data: DataTransfer): SelectedFiles
}

export interface MobilePickerProvider {
  pick(options?: FileSelectionOptions): Promise<SelectedFiles>
}

export interface StorageProvider {
  pick(options?: FileSelectionOptions): Promise<SelectedFiles>
  fromDrop(data: DataTransfer): SelectedFiles
  fromPaste(data: DataTransfer): SelectedFiles
}

function filesFrom(list: FileList | null, origin: FileOrigin): SelectedFiles {
  return { files: list ? Array.from(list) : [], origin }
}

class NativeInputFileProvider implements InputFileProvider {
  constructor(private readonly browser: BrowserAdapter = browserAdapter) {}

  pick(options: FileSelectionOptions = {}): Promise<SelectedFiles> {
    const document = this.browser.document
    if (!document)
      return Promise.reject(new Error("File picker is unavailable"))
    if (options.directory)
      return Promise.reject(
        new Error("Directory selection is not available in this browser"),
      )
    return new Promise((resolve) => {
      const input = document.createElement("input")
      input.type = "file"
      input.multiple = options.multiple ?? true
      if (options.accept) input.accept = options.accept
      input.addEventListener(
        "change",
        () => resolve(filesFrom(input.files, "input")),
        { once: true },
      )
      input.click()
    })
  }
}

class NativeDragDropProvider implements DragDropProvider {
  fromDataTransfer(data: DataTransfer): SelectedFiles {
    return filesFrom(data.files, "drag-drop")
  }
}

class NativeMobilePickerProvider implements MobilePickerProvider {
  constructor(private readonly input: InputFileProvider) {}

  async pick(options: FileSelectionOptions = {}): Promise<SelectedFiles> {
    const selection = await this.input.pick(options)
    return { ...selection, origin: "mobile-picker" }
  }
}

/**
 * File System Access API adapter. It is deliberately optional: native input is
 * the interoperable fallback, and no UI needs to know which provider supplied a file.
 */
class FileSystemAccessProvider {
  constructor(private readonly browser: BrowserAdapter = browserAdapter) {}

  async pickDirectory(): Promise<SelectedFiles> {
    const picker = (this.browser.window as Window & {
      showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>
    } | undefined)?.showDirectoryPicker
    if (!picker)
      throw new Error("Directory selection is not available in this browser")
    const directory = (await picker.call(
      this.browser.window,
    )) as FileSystemDirectoryHandle & {
      values(): AsyncIterable<{
        kind: "file" | "directory"
        getFile?: () => Promise<File>
      }>
    }
    const files: File[] = []
    for await (const entry of directory.values()) {
      if (entry.kind === "file" && entry.getFile)
        files.push(await entry.getFile())
    }
    return { files, origin: "directory" }
  }
}

export class NativeStorageProvider implements StorageProvider {
  private readonly input = new NativeInputFileProvider(this.browser)
  private readonly mobile = new NativeMobilePickerProvider(this.input)
  private readonly dragDrop = new NativeDragDropProvider()
  private readonly fileSystem = new FileSystemAccessProvider(this.browser)

  constructor(private readonly browser: BrowserAdapter = browserAdapter) {}

  pick(options: FileSelectionOptions = {}): Promise<SelectedFiles> {
    if (options.directory) return this.fileSystem.pickDirectory()
    return this.browser.navigator?.maxTouchPoints
      ? this.mobile.pick(options)
      : this.input.pick(options)
  }

  fromDrop(data: DataTransfer): SelectedFiles {
    return this.dragDrop.fromDataTransfer(data)
  }

  fromPaste(data: DataTransfer): SelectedFiles {
    return filesFrom(data.files, "paste")
  }
}

export const storageProvider: StorageProvider = new NativeStorageProvider()
