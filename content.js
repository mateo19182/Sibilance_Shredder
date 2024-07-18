if (typeof window.audioModifierInjected === 'undefined') {
    window.audioModifierInjected = true;

    let audioContext;
    let filterNode;
    let analyserNode;
    let maxIntensity = 20; // Maximum attenuation in dB
    let targetFrequency = 6000; // Default target frequency
    let qValue = 5; // Default Q value

    function setupAudio() {
        if (audioContext) return;

        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        filterNode = audioContext.createBiquadFilter();
        analyserNode = audioContext.createAnalyser();

        filterNode.type = 'peaking';
        filterNode.frequency.value = targetFrequency;
        filterNode.Q.value = qValue;
        filterNode.gain.value = 0; // Start with no reduction

        analyserNode.fftSize = 2048; // Increased for better frequency resolution
        const bufferLength = analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        // Connect all audio elements to our filter node and analyser
        const audioElements = document.querySelectorAll('audio, video');
        audioElements.forEach(element => {
            const source = audioContext.createMediaElementSource(element);
            source.connect(filterNode).connect(analyserNode).connect(audioContext.destination);
        });

        // Handle dynamically added audio/video elements
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.tagName === 'AUDIO' || node.tagName === 'VIDEO') {
                        const source = audioContext.createMediaElementSource(node);
                        source.connect(filterNode).connect(analyserNode).connect(audioContext.destination);
                    }
                });
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });

        // Start sending spectrum data to popup and updating filter
        function updateAudio() {
            analyserNode.getByteFrequencyData(dataArray);

            // Find the bin corresponding to our target frequency
            const binIndex = Math.round(targetFrequency * bufferLength / audioContext.sampleRate);

            // Get the volume at the target frequency
            const volume = dataArray[binIndex] / 255; // Normalize to 0-1

            // Calculate attenuation based on volume
            const attenuation = -maxIntensity * volume;

            // Update filter gain
            filterNode.gain.setTargetAtTime(attenuation, audioContext.currentTime, 0.01);

            // Send spectrum data to popup
            chrome.runtime.sendMessage({ 
                action: "updateSpectrum", 
                spectrum: Array.from(dataArray)
            });

            requestAnimationFrame(updateAudio);
        }
        updateAudio();
    }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "updateSettings") {
            setupAudio();
            maxIntensity = request.intensity*5;
            targetFrequency = request.frequency;
            qValue = request.q;
            filterNode.frequency.setValueAtTime(targetFrequency, audioContext.currentTime);
            filterNode.Q.setValueAtTime(qValue, audioContext.currentTime);
        }
    });

    // Function to check if an element is visible
    function isElementVisible(el) {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        return style.width !== "0" && style.height !== "0" && style.opacity !== "0" && style.display !== 'none' && style.visibility !== 'hidden';
    }

    // Function to find the main video element
    function findMainVideoElement() {
        const videos = Array.from(document.getElementsByTagName('video'));
        return videos.find(video => isElementVisible(video) && video.offsetWidth > 200 && video.offsetHeight > 200);
    }

    // Setup audio when the page loads
    window.addEventListener('load', () => {
        const mainVideo = findMainVideoElement();
        if (mainVideo) {
            setupAudio();
        }
    });

    // Listen for changes in the DOM to detect dynamically added video elements
    const observer = new MutationObserver((mutations) => {
        for (let mutation of mutations) {
            for (let node of mutation.addedNodes) {
                if (node.tagName === 'VIDEO' && isElementVisible(node)) {
                    setupAudio();
                    return;
                }
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Send a message to the popup to indicate that the content script is ready
    chrome.runtime.sendMessage({ action: "contentScriptReady" });
}