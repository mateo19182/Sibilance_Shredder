if (typeof window.audioModifierInjected === 'undefined') {
	window.audioModifierInjected = true;
  
	let audioContext;
	let filterNode;
	let compressorNode;
  
	function setupAudio() {
	  if (audioContext) return;
  
	  audioContext = new (window.AudioContext || window.webkitAudioContext)();
	  filterNode = audioContext.createBiquadFilter();
	  compressorNode = audioContext.createDynamicsCompressor();
  
	  filterNode = audioContext.createBiquadFilter();
	  filterNode.type = 'peaking';
	  filterNode.frequency.value = 6000; // 6 kHz
	  filterNode.Q.value = 5;
	  filterNode.gain.value = 0; // Start with no reduction
	
	  compressorNode.threshold.value = -24; // Adjust the threshold as needed
	  compressorNode.knee.value = 30; // Adjust the knee as needed
	  compressorNode.ratio.value = 12; // Adjust the ratio as needed
	  compressorNode.attack.value = 0.003; // Adjust the attack time as needed
	  compressorNode.release.value = 0.25; // Adjust the release time as needed
  
	  // Connect all audio elements to our filter and compressor nodes
	  const audioElements = document.querySelectorAll('audio, video');
	  audioElements.forEach(element => {
		const source = audioContext.createMediaElementSource(element);
		source.connect(filterNode).connect(compressorNode).connect(audioContext.destination);
	  });
  
	  // Handle dynamically added audio/video elements
	  const observer = new MutationObserver(mutations => {
		mutations.forEach(mutation => {
		  mutation.addedNodes.forEach(node => {
			if (node.tagName === 'AUDIO' || node.tagName === 'VIDEO') {
			  const source = audioContext.createMediaElementSource(node);
			  source.connect(filterNode).connect(compressorNode).connect(audioContext.destination);
			}
		  });
		});
	  });
  
	  observer.observe(document.body, { childList: true, subtree: true });
	}
  
	chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	  if (request.action === "setIntensity") {
		setupAudio();
		filterNode.gain.setValueAtTime(-request.intensity, audioContext.currentTime);
	  }
	});
  
	// Send a message to the popup to indicate that the content script is ready
	chrome.runtime.sendMessage({ action: "contentScriptReady" });
  }