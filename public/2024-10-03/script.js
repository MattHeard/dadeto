let correctGuesses = 0;
let incorrectGuesses = 0;
let totalGuesses = 0;

const spades = [
  '🂡',
  '🂢',
  '🂣',
  '🂤',
  '🂥',
  '🂦',
  '🂧',
  '🂨',
  '🂩',
  '🂪',
  '🂫',
  '🂭',
  '🂮',
];
const hearts = [
  '🂱',
  '🂲',
  '🂳',
  '🂴',
  '🂵',
  '🂶',
  '🂷',
  '🂸',
  '🂹',
  '🂺',
  '🂻',
  '🂽',
  '🂾',
];
const diamonds = [
  '🃁',
  '🃂',
  '🃃',
  '🃄',
  '🃅',
  '🃆',
  '🃇',
  '🃈',
  '🃉',
  '🃊',
  '🃋',
  '🃍',
  '🃎',
];
const clubs = ['🃑', '🃒', '🃓', '🃔', '🃕', '🃖', '🃗', '🃘', '🃙', '🃚', '🃛', '🃝', '🃞'];

const allCards = [...spades, ...hearts, ...diamonds, ...clubs];
let currentCard = allCards[Math.floor(Math.random() * allCards.length)];

const correctElement = document.getElementById('correct');
const incorrectElement = document.getElementById('incorrect');
const totalElement = document.getElementById('total');
const currentCardElement = document.getElementById('current-card');

const higherBtn = document.getElementById('higher-btn');
const lowerBtn = document.getElementById('lower-btn');

function getRandomCard() {
  return allCards[Math.floor(Math.random() * allCards.length)];
}

function updateScoreboard() {
  correctElement.textContent = correctGuesses;
  incorrectElement.textContent = incorrectGuesses;
  totalElement.textContent = totalGuesses;
}

// Function to find the index of a card in its respective suit array
function findCardIndex(card) {
  let index = spades.indexOf(card);
  if (index !== -1) return index;
  index = hearts.indexOf(card);
  if (index !== -1) return index;
  index = diamonds.indexOf(card);
  if (index !== -1) return index;
  index = clubs.indexOf(card);
  if (index !== -1) return index;
  return -1; // Default, in case something goes wrong
}

function checkGuess(isHigher) {
  const newCard = getRandomCard();

  // Find the index in the suit arrays
  const currentIndex = findCardIndex(currentCard);
  const newIndex = findCardIndex(newCard);

  // Check the guess according to the rules
  if (newIndex > currentIndex && isHigher) {
    correctGuesses++;
  } else if (newIndex < currentIndex && !isHigher) {
    correctGuesses++;
  } else {
    incorrectGuesses++;
  }

  totalGuesses++;
  currentCard = newCard;
  currentCardElement.textContent = currentCard;
  updateScoreboard();
}

higherBtn.addEventListener('click', () => checkGuess(true));
lowerBtn.addEventListener('click', () => checkGuess(false));

// Initialize the display
currentCardElement.textContent = currentCard;
updateScoreboard();
