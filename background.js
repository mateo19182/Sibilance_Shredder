let eq = 0;
let cTabObj = {};
let power = true;
let mono = false;
let maxChannelCount = 6;
let gain = 1;

let windowState;
let fullScreen;


//Initializes biquads with filter type and frequencies
const initBandBiquads = () => {
    cTabObj.band.type = "peaking";
    cTabObj.band.frequency.setValueAtTime(
    7000,
    cTabObj.audioCtx.currentTime);

    cTabObj.gainNode.gain.setValueAtTime(1, cTabObj.audioCtx.currentTime);

};


const getTabStream = () => {
    //Close audiostream if it already exists
    closeAudio();
    //Gets audiostream from tab
    chrome.tabCapture.capture({ audio: true, video: false }, (c) => {
      if (chrome.runtime.lastError) {
      }
      if (c) {
        createAudio(c);
        initBandBiquads();
        cTabObj.bands.gain.setValueAtTime(
            eq,
            cTabObj.audioCtx.currentTime
        );
        
        cTabObj.gainNode.gain.setValueAtTime(gain, cTabObj.audioCtx.currentTime);
        connect();
        monoConnect();
      }
    });
  };


//Creates audio context and biquads
const createAudio = (a) => {
    cTabObj.stream = a;
    cTabObj.audioCtx = new AudioContext();
    cTabObj.streamOutput = cTabObj.audioCtx.createMediaStreamSource(
      cTabObj.stream
    );
    cTabObj.gainNode = cTabObj.audioCtx.createGain();
    cTabObj.bands = [];

    cTabObj.bands.push(cTabObj.audioCtx.createBiquadFilter());

  
    maxChannelCount = cTabObj.audioCtx.destination.maxChannelCount;
  };

//Connects biquads to output stream
const connect = () => {
  cTabObj.streamOutput.connect(cTabObj.bands[0]);
  cTabObj.bands[0].connect(cTabObj.gainNode);
  cTabObj.gainNode.connect(cTabObj.audioCtx.destination);
};

const monoConnect = () => {
  cTabObj.audioCtx.destination.channelCount = mono ? 1 : maxChannelCount;
};

const closeAudio = () => {
  if (cTabObj.stream) {
    cTabObj.stream.getAudioTracks()[0].stop();
    cTabObj.audioCtx.close();
    cTabObj = {};
  }
};




chrome.runtime.onMessage.addListener(function (element) {
    if (element == "popupOpened") {
      power ? getTabStream() : closeAudio();
      chrome.runtime.sendMessage({ type: "bandValues", value: eq });
      chrome.runtime.sendMessage({ type: "monoValue", value: mono });
      chrome.runtime.sendMessage({ type: "gainValue", value: gain });
      chrome.runtime.sendMessage({ type: "powerValue", value: power });
    }
    if (element.type) {
        //!!!
      let bandId = parseInt(element.type.substr(4), 10) - 1;
      if (element.type.substr(0, 4) == "band") {
        eq = parseInt(element.value);
      }
      if (element.type == "power") {
        power = element.value;
        power ? getTabStream() : closeAudio();
      }
      if (cTabObj.stream) {
        switch (element.type.substr(0, 4)) {
          case "band":
            cTabObj.bands[bandId].gain.setValueAtTime(
              element.value,
              cTabObj.audioCtx.currentTime
            );
            break;
          case "gain":
            gain = element.value;
            if (isFinite(gain)) {
              cTabObj.gainNode.gain.setValueAtTime(
                (gain * gain) / 3,
                cTabObj.audioCtx.currentTime
              );
            }
            break;
          case "mono":
            mono = element.value;
            monoConnect();
            break;
        }
      }
    }
  });
  