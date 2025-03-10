const scriptTag = `<script>
  (function() {
    const audioElements = document.querySelectorAll("audio");
    
    audioElements.forEach(function(audio, index) {
      audio.removeAttribute("controls");
      
      if (!audio.id) {
        audio.id = "audio-" + index;
      }
      
      const controlsContainer = document.createElement("div");
      controlsContainer.className = "audio-controls";
      controlsContainer.id = "controls-" + audio.id;
      
      const timeDisplay = document.createElement("span");
      timeDisplay.className = "audio-time";
      timeDisplay.textContent = "0:00";
      
      const playButton = document.createElement("a");
      playButton.href = "#";
      playButton.className = "audio-btn";
      playButton.textContent = "PLAY";
      playButton.addEventListener("click", function(e) {
        e.preventDefault();
        audio.play();
      });
      
      const pauseButton = document.createElement("a");
      pauseButton.href = "#";
      pauseButton.className = "audio-btn";
      pauseButton.textContent = "PAUSE";
      pauseButton.addEventListener("click", function(e) {
        e.preventDefault();
        audio.pause();
      });
      
      const stopButton = document.createElement("a");
      stopButton.href = "#";
      stopButton.className = "audio-btn";
      stopButton.textContent = "STOP";
      stopButton.addEventListener("click", function(e) {
        e.preventDefault();
        audio.pause();
        audio.currentTime = 0;
      });
      
      audio.addEventListener("timeupdate", function() {
        const minutes = Math.floor(audio.currentTime / 60);
        const seconds = Math.floor(audio.currentTime % 60).toString().padStart(2, "0");
        timeDisplay.textContent = minutes + ":" + seconds;
      });
      
      controlsContainer.appendChild(playButton);
      controlsContainer.appendChild(pauseButton);
      controlsContainer.appendChild(stopButton);
      controlsContainer.appendChild(timeDisplay);
      
      audio.parentNode.insertBefore(controlsContainer, audio.nextSibling);
      
      if (!document.getElementById("audio-controls-style")) {
        const style = document.createElement("style");
        style.id = "audio-controls-style";
        style.textContent = "
          .audio-controls {
            display: flex;
            align-items: center;
            margin: 10px 0;
            background-color: #1a1a1a;
            padding: 5px;
            border-radius: 3px;
          }
          .audio-btn {
            margin-right: 10px;
            color: #33ccff;
            text-decoration: none;
            padding: 0 10px;
          }
          .audio-btn:hover {
            text-decoration: underline;
          }
          .audio-time {
            margin-left: 10px;
            color: #cccccc;
          }
          ";
        document.head.appendChild(style);
      }
    });
  })();
</script>`;

// Export the script tag as the default export
export default scriptTag;
