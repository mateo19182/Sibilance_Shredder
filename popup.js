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
  
  const slider = document.getElementById('intensitySlider');
  const intensityValue = document.getElementById('intensityValue');
  const resetButton = document.getElementById('resetButton');
  
  // Function to update UI and send message
  const updateIntensity = async (intensity) => {
    slider.value = intensity;
    intensityValue.textContent = `${intensity} dB`;
    await chrome.tabs.sendMessage(tab.id, { action: "setIntensity", intensity: parseInt(intensity) });
    chrome.storage.local.set({intensity: intensity});
  };
  
  // Load the saved intensity value
  chrome.storage.local.get(['intensity'], function(result) {
    if (result.intensity) {
      updateIntensity(result.intensity);
    }
  });
  
  slider.addEventListener('input', async (e) => {
    await updateIntensity(parseInt(e.target.value));
  });
  
  resetButton.addEventListener('click', async () => {
    await updateIntensity(0);
  });
});