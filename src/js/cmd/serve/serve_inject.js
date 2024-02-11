(() => {
	let id = '$id';
	
	/** @type {Window} */
	const opener = window.opener;
	
	const chars = 'abcdefghijklmnopqrstuvwxyz1234567890'
	function randomString(len) {
		let result = new Array(len);
		for(let i = 0; i < len; i++) {
			result[i] = chars[Math.floor(Math.random() * chars.length)];
		}
		return result.join('');
	}


	Object.defineProperties(window, {
		parent: {
			value: window
		},
		opener: {
			value: null
		}
	});
	
	const originalFetch = window.fetch;
	window.fetch = function(url, init) {
		return new Promise(resolve => {
			try{
				const src = new URL(url);
				if(src.origin !== location.origin) return originalFetch(url, init);

				const requestID = randomString(16);
				opener.postMessage({
					type: 'GET',
					url: src.pathname,
					id: id,
					requestID: requestID
				}, '*');

				window.addEventListener('message', function recieve(ev) {
					const d = ev.data;
					if(!d.requestID) return;
					if(d.requestID !== requestID) throw new Error('invalid ID');
					window.removeEventListener('message', recieve);
					resolve(new Response(d.response));
				});
				return;
			} catch {}

			const requestID = randomString(16);

			window.addEventListener('message', function recieve(ev) {
				ev.preventDefault();
				ev.stopImmediatePropagation();
				
				const d = ev.data;
				if(!d.requestID) return;
				if(d.requestID !== requestID) throw new Error('invalid ID');
				window.removeEventListener('message', recieve);
				
				if(d.response === 404) {
					resolve(new Response(null, {ok:false, status: 404}))
				}
				resolve(new Response(d.response), {ok:true, status: 200});
			});
			
			opener.postMessage({
				type: 'GET',
				url: url,
				id: id,
				requestID: requestID
			}, '*');

		});
	}
	window.fetch.toString = originalFetch.toString.bind(originalFetch);

	// class XMLHttpRequestCustom extends XMLHttpRequest {
	// 	open() {

	// 	}
	// }
	// Object.defineProperties(XMLHttpRequestCustom, {
	// 	name: {
	// 		get() {
	// 			return XMLHttpRequest.name;
	// 		}
	// 	},
	// 	toString: {
	// 		value: XMLHttpRequest.toString.bind(XMLHttpRequest)
	// 	}
	// });
	// XMLHttpRequest = XMLHttpRequestCustom;
})();