const { execute, log } = include('console');
const start = performance.now();
await execute(argv[0])
const elapsed = performance.now() - start;
log(`deltaTime = ${elapsed}ms`)