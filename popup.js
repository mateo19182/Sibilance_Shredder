document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Check if the content script is already injected
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => window.audioModifierInjected === true
  });
  
  if (!result) {
    // Inject the content script only if it's not already injected
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
  }
  
  const intensitySlider = document.getElementById('intensitySlider');
  const intensityValue = document.getElementById('intensityValue');
  const frequencySlider = document.getElementById('frequencySlider');
  const frequencyValue = document.getElementById('frequencyValue');
  const qSlider = document.getElementById('qSlider');
  const qValue = document.getElementById('qValue');
  const resetButton = document.getElementById('resetButton');
  const canvas = document.getElementById('visualizer');
  const ctx = canvas.getContext('2d');
  
  let spectrumData = new Uint8Array(1024);
  let currentAttenuation = 0;
  
  function drawVisualization() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw spectrum
    ctx.beginPath();
    ctx.strokeStyle = '#4a4a4a';
    for (let i = 0; i < spectrumData.length; i++) {
      const x = i / spectrumData.length * canvas.width;
      const y = canvas.height - (spectrumData[i] / 255) * canvas.height;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    
    // Draw EQ curve
    const frequency = parseInt(frequencySlider.value);
    const intensity = parseInt(intensitySlider.value);
    const q = parseFloat(qSlider.value);
    ctx.beginPath();
    ctx.strokeStyle = '#e0e0e0';
    for (let x = 0; x < canvas.width; x++) {
      const f = 2000 * Math.pow(5, x / canvas.width);
      const response = -intensity / (1 + Math.pow((f - frequency) / (frequency / q), 2));
      const y = canvas.height / 2 - response * canvas.height / 40;
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    
    // Draw current attenuation
    const attenuationX = Math.log(frequency / 2000) / Math.log(5) * canvas.width;
    const attenuationY = canvas.height / 2 - currentAttenuation * canvas.height / 40;
    ctx.beginPath();
    ctx.arc(attenuationX, attenuationY, 5, 0, 2 * Math.PI);
    ctx.fillStyle = '#a0a0a0';
    ctx.fill();
    
    requestAnimationFrame(drawVisualization);
  }
  
  // Function to update UI and send message
  const updateSettings = async () => {
    const intensity = parseInt(intensitySlider.value);
    const frequency = parseInt(frequencySlider.value);
    const q = parseFloat(qSlider.value);
    intensityValue.textContent = `${intensity} dB`;
    frequencyValue.textContent = `${frequency} Hz`;
    qValue.textContent = q.toFixed(1);
    await chrome.tabs.sendMessage(tab.id, { 
      action: "updateSettings", 
      intensity: intensity,
      frequency: frequency,
      q: q
    });
    chrome.storage.local.set({intensity: intensity, frequency: frequency, q: q});
  };
  
  // Load the saved values
  chrome.storage.local.get(['intensity', 'frequency', 'q'], function(result) {
    if (result.intensity) {
      intensitySlider.value = result.intensity;
      intensityValue.textContent = `${result.intensity} dB`;
    }
    if (result.frequency) {
      frequencySlider.value = result.frequency;
      frequencyValue.textContent = `${result.frequency} Hz`;
    }
    if (result.q) {
      qSlider.value = result.q;
      qValue.textContent = result.q.toFixed(1);
    }
    updateSettings();
  });
  
  intensitySlider.addEventListener('input', updateSettings);
  frequencySlider.addEventListener('input', updateSettings);
  qSlider.addEventListener('input', updateSettings);
  
  resetButton.addEventListener('click', async () => {
    intensitySlider.value = 0;
    frequencySlider.value = 6000;
    qSlider.value = 5;
    await updateSettings();
  });

  // Start visualization
  drawVisualization();
  
  // Listen for spectrum data updates
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateSpectrum") {
      spectrumData = new Uint8Array(request.spectrum);
      const frequency = parseInt(frequencySlider.value);
      const binIndex = Math.round(frequency * spectrumData.length / 22050); // Assuming 44.1kHz sample rate
      const volume = spectrumData[binIndex] / 255;
      currentAttenuation = -parseInt(intensitySlider.value) * volume;
    }
  });
});