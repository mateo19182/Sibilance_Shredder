if (typeof window.audioModifierInjected === 'undefined') {
    window.audioModifierInjected = true;

    let audioContext;
    let filterNode;

    function setupAudio() {
        if (audioContext) return;

        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        filterNode = audioContext.createBiquadFilter();

        filterNode.type = 'peaking';
        filterNode.frequency.value = 6000; // Default to 6 kHz
        filterNode.Q.value = 2;
        filterNode.gain.value = 0; // Start with no reduction

        // Connect all audio elements to our filter node
        const audioElements = document.querySelectorAll('audio, video');
        audioElements.forEach(element => {
            const source = audioContext.createMediaElementSource(element);
            source.connect(filterNode).connect(audioContext.destination);
        });

        // Handle dynamically added audio/video elements
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.tagName === 'AUDIO' || node.tagName === 'VIDEO') {
                        const source = audioContext.createMediaElementSource(node);
                        source.connect(filterNode).connect(audioContext.destination);
                    }
                });
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "updateSettings") {
            setupAudio();
            filterNode.frequency.setValueAtTime(request.frequency, audioContext.currentTime);
            filterNode.gain.setValueAtTime(-request.intensity*2, audioContext.currentTime);
        }
    });

    // Send a message to the popup to indicate that the content script is ready
    chrome.runtime.sendMessage({ action: "contentScriptReady" });
}