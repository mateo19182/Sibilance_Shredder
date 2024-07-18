if (typeof window.audioModifierInjected === 'undefined') {
	window.audioModifierInjected = true;
  
	let audioContext;
	let gainNode;
  
	function setupAudio() {
	  if (audioContext) return;
  
	  audioContext = new (window.AudioContext || window.webkitAudioContext)();
	  gainNode = audioContext.createGain();
  
	  // Connect all audio elements to our gain node
	  const audioElements = document.querySelectorAll('audio, video');
	  audioElements.forEach(element => {
		const source = audioContext.createMediaElementSource(element);
		source.connect(gainNode).connect(audioContext.destination);
	  });
  
	  // Handle dynamically added audio/video elements
	  const observer = new MutationObserver(mutations => {
		mutations.forEach(mutation => {
		  mutation.addedNodes.forEach(node => {
			if (node.tagName === 'AUDIO' || node.tagName === 'VIDEO') {
			  const source = audioContext.createMediaElementSource(node);
			  source.connect(gainNode).connect(audioContext.destination);
			}
		  });
		});
	  });
  
	  observer.observe(document.body, { childList: true, subtree: true });
	}
  
	chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	  if (request.action === "setGain") {
		setupAudio();
		gainNode.gain.setValueAtTime(request.gain, audioContext.currentTime);
	  }
	});
  
	// Send a message to the popup to indicate that the content script is ready
	chrome.runtime.sendMessage({ action: "contentScriptReady" });
  }