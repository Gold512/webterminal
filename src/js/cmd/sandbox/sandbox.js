onmessage = ev => {
    const data = ev.data;
    const result = eval('(' + data + ')');
    postMessage(result);
}