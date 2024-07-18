document.addEventListener('DOMContentLoaded', function() {
  const toggleButton = document.getElementById('toggleFilter');
  
  toggleButton.addEventListener('click', function() {
    chrome.runtime.sendMessage({action: "toggleFilter"});
  });
});