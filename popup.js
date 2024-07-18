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
  const resetButton = document.getElementById('resetButton');
  
  // Function to update UI and send message
  const updateSettings = async () => {
    const intensity = parseInt(intensitySlider.value);
    const frequency = parseInt(frequencySlider.value);
    intensityValue.textContent = `${intensity} dB`;
    frequencyValue.textContent = `${frequency} Hz`;
    await chrome.tabs.sendMessage(tab.id, { 
      action: "updateSettings", 
      intensity: intensity,
      frequency: frequency
    });
    chrome.storage.local.set({intensity: intensity, frequency: frequency});
  };
  
  // Load the saved values
  chrome.storage.local.get(['intensity', 'frequency'], function(result) {
    if (result.intensity) {
      intensitySlider.value = result.intensity;
      intensityValue.textContent = `${result.intensity} dB`;
    }
    if (result.frequency) {
      frequencySlider.value = result.frequency;
      frequencyValue.textContent = `${result.frequency} Hz`;
    }
    updateSettings();
  });
  
  intensitySlider.addEventListener('input', updateSettings);
  frequencySlider.addEventListener('input', updateSettings);
  
  resetButton.addEventListener('click', async () => {
    intensitySlider.value = 0;
    frequencySlider.value = 6000;
    await updateSettings();
  });
});