// ==meta==
// @autocomplete file file
// @help usage: dd <source> <destination>
// ==/meta==

const fs = include('fs');
const console = include('console');

fs.move(argv[0], argv[1]);