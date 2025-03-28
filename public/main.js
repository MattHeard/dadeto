// Audio controls functionality
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
    playButton.textContent = "PLAY";
    playButton.addEventListener("click", function(e) {
      e.preventDefault();
      audio.play();
    });
    
    const pauseButton = document.createElement("a");
    pauseButton.href = "#";
    pauseButton.textContent = "PAUSE";
    pauseButton.addEventListener("click", function(e) {
      e.preventDefault();
      audio.pause();
    });
    
    const stopButton = document.createElement("a");
    stopButton.href = "#";
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
    controlsContainer.appendChild(document.createTextNode(" "));
    controlsContainer.appendChild(pauseButton);
    controlsContainer.appendChild(document.createTextNode(" "));
    controlsContainer.appendChild(stopButton);
    controlsContainer.appendChild(document.createTextNode(" "));
    controlsContainer.appendChild(timeDisplay);
    
    audio.parentNode.insertBefore(controlsContainer, audio.nextSibling);
  });
})();

// Interactive components functionality
/**
 * Initialize an interactive component with a processing function
 * @param {string} id - The ID of the article element
 * @param {Function} processingFunction - The function to process input values
 */
function initializeInteractiveComponent(id, processingFunction) {
  // Get the article element
  const article = document.getElementById(id);
  
  // Get the elements within the article
  const inputElement = article.querySelector('input');
  const submitButton = article.querySelector('button');
  const outputElement = article.querySelector('p.output');
  
  // Disable controls during initialization
  inputElement.disabled = true;
  submitButton.disabled = true;
  
  // Update message to show JS is running
  outputElement.textContent = 'Initialising...';
  
  /**
   * Enable controls and update status message
   */
  function enableControls() {
    inputElement.disabled = false;
    submitButton.disabled = false;
    outputElement.textContent = 'Ready for input';
    outputElement.parentElement.classList.remove('warning');
  }
  
  /**
   * Handle form submission events
   * @param {Event} event - The submission event
   */
  function handleSubmit(event) {
    if (event) {
      event.preventDefault();
    }
    const inputValue = inputElement.value;
    
    try {
      // Create an env Map with utility functions that might be needed by processing functions
      const env = new Map([
        ["getRandomNumber", () => Math.random()]
      ]);
      
      // Call the processing function with the input value
      // If the function accepts two parameters, it will use the env Map
      // If it only accepts one parameter, the second argument will be ignored
      const result = processingFunction(inputValue, env);
      
      // Update the output
      outputElement.textContent = result;
    } catch (error) {
      console.error('Error processing input:', error);
      outputElement.textContent = 'Error: ' + error.message;
      outputElement.parentElement.classList.add('warning');
    }
  }
  
  // Add event listener to the submit button
  submitButton.addEventListener('click', handleSubmit);
  
  // Add event listener for Enter key in the input field
  inputElement.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      handleSubmit(event);
    }
  });
  
  // Enable controls when initialization is complete
  enableControls();
}

/**
 * Initialize a component when it enters the viewport
 * @param {string} id - The ID of the article element to observe
 * @param {string} modulePath - Path to the module containing the processing function
 * @param {string} functionName - Name of the function to import from the module
 */
function initializeWhenVisible(id, modulePath, functionName) {
  const article = document.getElementById(id);
  
  // Create an observer instance
  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      // If the article is visible
      if (entry.isIntersecting) {
        // Dynamically import the module only when the article is visible
        import(modulePath).then((module) => {
          const processingFunction = module[functionName];
          
          // Initialize the component with the imported function
          initializeInteractiveComponent(id, processingFunction);
        }).catch(error => {
          console.error('Error loading module ' + modulePath + ':', error);
        });
        
        // Stop observing once initialized
        observer.disconnect();
      }
    });
  }, {
    // Options for the observer
    root: null, // viewport
    threshold: 0.1 // 10% visibility is enough to trigger
  });
  
  // Start observing the article
  observer.observe(article);
}

// Initialize all registered components when they become visible
if (window.interactiveComponents && window.interactiveComponents.length > 0) {
  console.log('Initializing', window.interactiveComponents.length, 'interactive components');
  window.interactiveComponents.forEach(component => {
    initializeWhenVisible(component.id, component.modulePath, component.functionName);
  });
} else {
  console.warn('No interactive components found to initialize');
}

// Tag filtering functionality
function hideArticlesByClass(className) {
  var articles = document.getElementsByTagName('article');
  for (var i = 0; i < articles.length; i++) {
    if (articles[i].classList.contains(className)) {
      articles[i].style.display = 'none';
    }
  }
}

function toggleHideLink(link, className) {
  // Check if a span with the hide link already exists immediately after the link.
  if (link.nextElementSibling && link.nextElementSibling.classList.contains('hide-span')) {
    // Remove the span if it exists.
    link.nextElementSibling.remove();
  } else {
    // Create a new span element.
    var span = document.createElement('span');
    span.classList.add('hide-span');
    // Append the opening text node.
    span.appendChild(document.createTextNode(" ("));

    // Create the hide anchor element.
    var hideLink = document.createElement('a');
    hideLink.textContent = "hide";
    // Add click listener to trigger hideArticlesByClass.
    hideLink.addEventListener('click', function(event) {
      event.preventDefault();
      hideArticlesByClass(className);
    });
    span.appendChild(hideLink);
    // Append the closing text node.
    span.appendChild(document.createTextNode(")"));

    // Insert the span immediately after the link.
    link.parentNode.insertBefore(span, link.nextSibling);
  }
}

(function() {
  Array.from(document.getElementsByTagName('a')).forEach(function(link) {
    Array.from(link.classList).forEach(function(className) {
      if (className.indexOf('tag-') === 0) {
        link.addEventListener('click', function(event) {
          event.preventDefault();
          toggleHideLink(link, className);
        });
        return; // exit after first tag- match
      }
    });
  });
})();