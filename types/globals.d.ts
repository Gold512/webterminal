type Packages = 'fs' | 'console' | 'sys';

type PackageClasses = {
	fs: WebTerminal.FS,
	console: WebTerminal.Console,
	sys: WebTerminal.Sys
}

type FilePath = string | string[];

declare namespace WebTerminal {
	class FS {
		constructor(currentPath: FilePath)
		getCurrentDirectory(): Promise<FileSystemDirectoryHandle>
		getFile(path: string, currentPath: string[]): Promise<FileSystemFileHandle>
		getDirectory(path: FilePath, currentPath: string[]): Promise<FileSystemDirectoryHandle>
		writeFile(path: FilePath, content: string | DataView | Blob | ArrayBuffer, currentPath: string[]): Promise<void>
		readFile(path: FilePath, currentPath: string[]): Promise<string>
		deleteFile(path: FilePath, currentPath: string[]): Promise<void>
		stringifyPath(path: string[]): string
		relativeStringifyPath(path: string[], currentPath: string[]): string
		mountDirectory(): void
		resolvePath(path: string, currentPath: string[]): string[]
	}

	class Console {
		log(msg: string): void
		prompt(msg: string, defaultValue?: string)
		confirm(msg: string)
		error(msg: string)
		execute(cmd: string): Promise<void>
	}

	class Sys {
		fetchScript(script: string): Promise<Response>
		execute(cmd: string): Promise<void>
	}
}

declare function include<TPackage extends Packages | `lib:${string}`>(name: TPackage): TPackage extends Packages ? PackageClasses[TPackage] : Promise<any>;
declare const argv: Record<string | number, string>

// proper typescript annotations for fileSystemdirectory handle 
declare interface FileSystemDirectoryHandle {
	[Symbol.asyncIterator](): AsyncIterableIterator<[string, FileSystemHandle]>;
	entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
	keys(): AsyncIterableIterator<string>;
	values(): AsyncIterableIterator<FileSystemHandle>;
}