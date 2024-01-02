type Packages = 'fs' | 'console';

type FilePath = string | string[];

class FS {
	constructor(currentPath? = null)
	async getCurrentDirectory(): Promise<FileSystemDirectoryHandle>
	async getFile(path: string, currentPath: string[] = ['opfs']): Promise<FileSystemFileHandle>
	async getDirectory(path: FilePath, currentPath: string[] = ['opfs']): Promise<FileSystemDirectoryHandle>
	async writeFile(path: FilePath, content: string, currentPath: string[] = ['opfs']): Promise<void>
	async readFile(path: FilePath, currentPath: string[] = ['opfs']): Promise<string>
	async deleteFile(path: FilePath, currentPath: string[] = ['opfs']): Promise<void>
	stringifyPath(path: string[]): string
	relativeStringifyPath(path: string[], currentPath: string[]): string
	mountDirectory(): void
}

interface PackageClasses {
	fs: FS
}

declare function include<TPackage extends Packages>(name: TPackage): PackageClasses[TPackage];
