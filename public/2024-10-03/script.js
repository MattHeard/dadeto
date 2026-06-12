let correctGuesses = 0;
let incorrectGuesses = 0;
let totalGuesses = 0;

const spades = [...'🂡🂢🂣🂤🂥🂦🂧🂨🂩🂪🂫🂭🂮'];
const hearts = [...'🂱🂲🂳🂴🂵🂶🂷🂸🂹🂺🂻🂽🂾'];
const diamonds = [...'🃁🃂🃃🃄🃅🃆🃇🃈🃉🃊🃋🃍🃎'];
const clubs = [...'🃑🃒🃓🃔🃕🃖🃗🃘🃙🃚🃛🃝🃞'];
const allCards = [...spades, ...hearts, ...diamonds, ...clubs];

const currentCardElement = document.getElementById('current-card');
const scoreElements = ['correct', 'incorrect', 'total'].map(id =>
  document.getElementById(id)
);
const [correctElement, incorrectElement, totalElement] = scoreElements;
const higherBtn = document.getElementById('higher-btn');
const lowerBtn = document.getElementById('lower-btn');

let currentCard = allCards[Math.floor(Math.random() * allCards.length)];
const getRandomCard = () => allCards[Math.floor(Math.random() * allCards.length)];
const findCardIndex = card =>
  [spades, hearts, diamonds, clubs].findIndex(suit => suit.includes(card));
const updateScoreboard = () => {
  correctElement.textContent = correctGuesses;
  incorrectElement.textContent = incorrectGuesses;
  totalElement.textContent = totalGuesses;
};

function checkGuess(isHigher) {
  const newCard = getRandomCard();
  const currentIndex = findCardIndex(currentCard);
  const newIndex = findCardIndex(newCard);
  if ((newIndex > currentIndex && isHigher) || (newIndex < currentIndex && !isHigher)) {
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
currentCardElement.textContent = currentCard;
updateScoreboard();
