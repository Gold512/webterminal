# Webtermial 

Quick and easy way to do automation with javascript (ie mass rename files, convert image folders to cbz etc)

## Features

- Filesystem with opfs 
- simple script manager
- command parser

## API

[typescript definitions](./types/globals.d.ts)

- globals

### globals

```
include(script: string)
```

import a class / library

use the `lib:` prefix to import scripts from /src/lib

to add libraries use `pkg addlib <url>`

for libraries that define a global variable, add an @export tag [example here](./src/js/cmd/lib/jszip.min.js)

```
argv: string[]
```

Array of arguments passed after the name of the script ( non inclusive )

ie `myscript 1` would have `'1'` in `argv[0]`