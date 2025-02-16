const scriptTag = `
  <script>
    const audio = document.getElementById("terminal-audio");
    const timeDisplay = document.getElementById("audio-time");

    function playAudio() {
      audio.play();
    }

    function pauseAudio() {
      audio.pause();
    }

    function stopAudio() {
      audio.pause();
      audio.currentTime = 0;
    }

    audio.addEventListener("timeupdate", function () {
      const minutes = Math.floor(audio.currentTime / 60);
      const seconds = Math.floor(audio.currentTime % 60);
      timeDisplay.textContent = \`\$\{minutes\}:\$\{seconds.toString().padStart(2, "0")\}\`;
    });
  </script>
`;

export default scriptTag;
