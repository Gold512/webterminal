type Packages = 'fs' | 'console';

type PackageClasses = {
	fs: WebTerminal.FS,
	console: WebTerminal.Console
}

type FilePath = string | string[];

declare namespace WebTerminal {
	class FS {
		constructor(currentPath: FilePath)
		getCurrentDirectory(): Promise<FileSystemDirectoryHandle>
		getFile(path: string, currentPath: string[]): Promise<FileSystemFileHandle>
		getDirectory(path: FilePath, currentPath: string[]): Promise<FileSystemDirectoryHandle>
		writeFile(path: FilePath, content: string, currentPath: string[]): Promise<void>
		readFile(path: FilePath, currentPath: string[]): Promise<string>
		deleteFile(path: FilePath, currentPath: string[]): Promise<void>
		stringifyPath(path: string[]): string
		relativeStringifyPath(path: string[], currentPath: string[]): string
		mountDirectory(): void
	}

	class Console {
		log(msg: string): void
		prompt(msg: string, defaultValue?: string)
		confirm(msg: string)
		error(msg: string)
	}

}

declare function include<TPackage extends Packages>(name: TPackage): PackageClasses[TPackage];
declare const argv: Record<string | number, string>