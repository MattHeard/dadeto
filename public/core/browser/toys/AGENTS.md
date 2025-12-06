# AGENTS Instructions for src/core/browser/toys

## Scope

These instructions apply to files in `src/core/browser/toys` and its subdirectories.

## General Recommendations for Future Agents
- Review the root guidelines, past retrospectives, and existing toy implementations before making changes so you stay consistent with established patterns.
- When adjusting multiple toys or shared helpers, plan the edits as incremental steps, validate each phase, and update related docs or metadata immediately.
- Run linting and relevant tests throughout development, capturing command output for your eventual PR summary.
- Anticipate edge cases—validate inputs, handle unexpected env data, and resolve lint feedback instead of suppressing it.
- Keep any additions to these toy guidelines cohesive with the repository tone, and record noteworthy discoveries in a retrospective once work wraps up.
- Communicate intent and verification clearly in commit messages and PR descriptions, including any artifacts that illustrate behavior changes.

## Guidelines

- Use these directories for experimental or playground code.
- Follow repository-wide conventions from the root `AGENTS.md` and `CLAUDE.md`.
- Document the purpose of any new toy in a README or comments.
- Implement toys using the shared interface: accept text input and a function collection, and return text output.

# JavaScript “Toy” Interface on mattheard.net

Each **toy** on mattheard.net is implemented as an ES module exporting a **single processing function**. The site’s loader dynamically imports this module and uses the exported function to wire up the toy’s interactive UI. Below is a breakdown of the required interface and how toys integrate into the site:

## **Toy Module Interface**

* **Module & Export:** Each toy resides in its own JavaScript module (e.g. /YYYY-MM-DD/slugName.js). The module **must export** a function with a specific name – this name is referenced in the site’s content metadata and loader. For example, a “Hello World” toy might export function hello(...) and be registered with that name.

* **Function Signature:** The exported function should accept **two parameters**:

* an **input string** (the user’s input from the toy’s text field), and

* an **environment map** of helper functions. It should return a **result** (typically a string). For example:

```
// Example toy function  
export function hello(input, env) {  
  return "Hello world.";  
}
```

Most toys treat the input as plain text (the site always passes a string from the input field). The toy can ignore the input or parse it as needed (e.g. JSON, number).

* **Return Value:** **Usually a string**. The toy function’s return is treated as the “output” to display. Simpler toys return plain text or numeric strings (e.g. the identity toy just returns the input string[[1]](../../../public/index.html)[[2]](../../../public/index.html)). More complex toys may return JSON-serialized data as a string. **Important:** The toy function does **not** manipulate the DOM directly – it hands back a result for the framework to render. The site will automatically JSON-stringify any objects if needed and handle presenting the result.

* **Environment (env) Parameter:** The second argument is a **Map of utility functions** provided by the site at runtime[[3]](../../../public/2025-07-05/setPermanentData.js)[[4]](../../../public/2025-07-05/setPermanentData.js). The toy should use these for side effects or common tasks. Key entries include:

* **setLocalTemporaryData(desiredObj)** – Merges a given object into the site’s in-memory temporary state (globalState.temporary) and returns the updated state. Used for “ephemeral” storage (resets on page reload). For example, a toy might call env.get('setLocalTemporaryData')({foo: "bar"}) to store data[[5]](../../../public/2025-07-05/setPermanentData.js)[[6]](../../../browser/main.js).

* **setLocalPermanentData(obj)** – Persists data to localStorage and returns the merged result[[5]](../../../public/2025-07-05/setPermanentData.js)[[7]](../../../browser/main.js). Toys use this to save state that persists across sessions (the site passes in localStorage under the hood). For instance, the **“Set Permanent Data”** toy parses a JSON string from the user and calls this function to store it; it returns the updated JSON as output[[3]](../../../public/2025-07-05/setPermanentData.js)[[4]](../../../public/2025-07-05/setPermanentData.js).

* **getLocalPermanentData()** – Reads the current permanent state from storage, so a toy can inspect what’s been saved without mutating it.

* **getRandomNumber()** – Returns a random number (the site’s utility, often just wrapping Math.random). For example, a **“Random Number”** toy can call env.get('getRandomNumber')() and return that value as a string.

* **getUuid()** – Generates a UUID string (unique identifier). A **“UUID”** toy uses this to output a new UUID each time.

* **getCurrentTime()** – Provides the current timestamp. A toy could use this for time-based output.

* **encodeBase64(str)** – Encodes a string to Base64[[8]](../../../browser/main.js). The **“Base64 Encoder”** toy, for instance, uses env.get('encodeBase64') on the input and returns the Base64 result.

* **getData()** – Fetches the site’s blog data (not commonly used by toys, but available).

* *(The environment may also include logging helpers like logInfo or error handlers, but toys typically don’t need to call those directly. They can throw errors or return error messages and the framework will handle it.)*

**Example:** The **“Set Temporary Data”** toy uses the env to persist data. It might do:

```
export function setTemporary(input, env) {  
  const obj = JSON.parse(input);  
  const update = env.get('setLocalTemporaryData')(obj);  
  return JSON.stringify(update || {});  
}
```

This reads JSON from the input, stores it in temporary state, and returns the entire updated state as a JSON string[[4]](../../../public/2025-07-05/setPermanentData.js).

## **Registration and Loader Integration**

* **Content Metadata:** In the site’s content, a toy is flagged with a unique ID and the module path/function name. For example, a post front-matter might include:

```
toy: {  
  "modulePath": "/2025-07-05/setPermanentData.js",  
  "functionName": "setPermanentData"  
}
```

* The static site generator inserts a loader script referencing this toy:

```
<script type="module">  
  window.addComponent('SETP1', '/2025-07-05/setPermanentData.js', 'setPermanentData');  
</script>
```

* Here 'SETP1' is the toy’s ID in the HTML, and the loader knows which module and export to use[[9]](../../../public/index.html).

* **window.addComponent(...):** This global helper (injected site-wide) registers the toy with the loader. It records the toy’s ID, module path, and export name in a global list (window.interactiveComponents)[[10]](../../../public/index.html)[[11]](../../../public/index.html). The toy itself does not call this – it’s done by the site generator.

* **Lazy Injection via Intersection Observer:** A site-wide initialization script scans all registered toys and sets up an IntersectionObserver for each[[12]](../../../browser/toys.js)[[13]](../../../browser/toys.js). Toys are **lazy-loaded** – the module is imported when its containing article scrolls into view. This optimizes performance by not blocking initial page load with all toy scripts.

* **Module Import and Initialization:** When a toy enters the viewport, the loader does:

* **Dynamic Import:** Loads the module at the given modulePath.

* **Extract Function:** Retrieves the exported function by name. (The loader calls module[functionName] to get the toy’s function[[14]](../../../browser/toys.js)[[15]](../../../browser/toys.js).)

* **Initialize UI:** The loader then calls an internal initializer with the toy’s HTML container and the function. This sets up the toy’s input/output fields and event handlers.

* **Lifecycle in the UI:** Once loaded, the toy’s interactive elements are enabled:

* The **text input** and **Submit button** are initially disabled and show a placeholder message (“This toy requires JavaScript to run.”). During initialization, the loader replaces that with “Initialising...” and then enables the input and button[[16]](../../../browser/toys.js)[[17]](../../../browser/toys.js).

* When the user enters input and clicks **Submit** (or presses Enter), the loader calls the toy’s function with the current input string and a fresh env Map (via createEnv() each time)[[18]](../../../browser/toys.js)[[19]](../../../browser/toys.js). The toy’s return value is captured.

* The loader then displays the result in the output area. By default, it treats the result as text and injects it into the page (replacing the “Initialising...” message)[[20]](../../../browser/toys.js). The Submit handler wraps this process with error handling (any exception is caught and shown as an error message in the output)[[21]](../../../browser/toys.js)[[22]](../../../browser/toys.js).

* **State Management:** If the toy modified site state via setLocalTemporaryData or setLocalPermanentData, that state is now updated for future toy calls. For example, a **“Get Data”** toy could then retrieve what was stored by a previous **“Set Data”** call. (The “get” toy might simply call the setter with an empty object to fetch current state, since setLocal… returns the merged state.) The environment ensures these calls are consistent – e.g. setLocalPermanentData merges the object into existing localStorage data and returns the new object[[23]](../../core/browser/data.js). In tests, these toy functions all conform to returning updated state or computed results as strings.

## **Input & Output Modes**

* **Text In, Text/Structured Out:** Every toy by default has a text input field (with optional alternative input modes) and an output area. The site-wide UI supports different **input types** (the dropdown labeled “in”) and different **output renderers** (dropdown labeled “out”) for each toy:

* **Input methods:** By default “text” is used. Other options include “number”, “kv” (key-value editor), “dendrite-story/page” (custom JSON editors for specific toys)[[24]](../../../public/index.html)[[25]](../../../public/index.html). The toy doesn’t directly control this; the framework’s input handlers will convert those UI inputs into a string for the toy. For example, choosing “kv” (key/value) brings up a dynamic key-value table UI – when submitted, the framework compiles it into a JSON string before calling the toy function.

* **Output formats:** The output dropdown lets users switch how to display the toy’s result. The core **return** from the toy is still a string (often JSON or text), but the site can present it in multiple ways:

  * **“text”:** Show result as plain text (in a paragraph).

  * **“pre”:** Show raw result in a preformatted block (monospaced, good for code or JSON)[[26]](../../../public/index.html)[[27]](../../../public/index.html).

  * **Custom presenters:** Some toys define richer visualizations. For example:

  * **“tic-tac-toe”:** If the toy returns a representation of a Tic Tac Toe board or move, selecting this will render an actual 3×3 board UI using a presenter function (instead of just text)[[28]](../../../browser/toys.js).

  * **“battleship-solitaire-fleet” and “...-clues-presenter”:** These output modes invoke custom rendering. The **Battleship Fleet Generator** toy returns a JSON layout of ships, and if the user selects “battleship-solitaire-fleet”, the site calls a presenter that draws a grid with ships placed[[28]](../../../browser/toys.js). Similarly, the **Battleship Clues** toy returns JSON clues; the “clues-presenter” mode will format those clues in a grid/table UI[[29]](../../../public/index.html)[[30]](../../../public/index.html). (If left in “text” or “pre” mode, the JSON would just be displayed as text.)

  * Under the hood, the framework maps output “keys” to presenter functions (see presentersMap in the code)[[31]](../../../browser/toys.js)[[32]](../../../browser/toys.js). After the toy returns its string, the site either parses it as JSON or uses it directly. If the selected presenter expects structured data, the framework will parse the JSON string into an object. For example, a battleship toy’s output (JSON string) is parsed, and the **BattleshipCluesBoard** presenter is given that object to generate DOM elements (rows of numbers, etc.). If parsing fails or no special presenter is selected, the site simply inserts the string as-is[[33]](../../../browser/toys.js)[[34]](../../../browser/toys.js).

* **Toy Types – Text vs DOM:** In summary, **every toy is fundamentally text-in/text-out**, but the site can mount interactive or graphical components **to display the output**. The toys themselves do not provide UI components; instead, they provide data which the site’s common presenters use to render DOM. This clean separation means a toy can be very simple (pure function) while the site loader handles all DOM mounting. For instance:

  * **“Hello World” (ID HELL1):** Takes any input (unused) and returns "Hello world.". The UI just shows that text in the output area.

  * **“Identity” (ID IDEN1):** Returns whatever string the user input[[1]](../../../public/index.html)[[2]](../../../public/index.html).

  * **“Base64 Encoder” (BASE1):** Reads the input string, uses env.get('encodeBase64') to encode it, and returns the Base64 string. The output can be viewed as text or in a `<pre>` block for readability.

  * **“UUID Generator” (UUID1):** Calls env.get('getUuid')() to get a new UUID and returns it[[35]](../../../public/index.html). The output is just a string UUID.

  * **“Set Permanent Data” (SETP1):** Expects a JSON string (e.g. {"key":"value"}) and uses setLocalPermanentData. It returns the merged JSON of all stored data[[5]](../../../public/2025-07-05/setPermanentData.js)[[4]](../../../public/2025-07-05/setPermanentData.js). (The site’s UI marks this toy with tags *toy, storage, json* and offers only text/pre output since it’s just data storage[[36]](../../../public/index.html)[[37]](../../../public/index.html).)

  * **“Get Permanent Data”:** (Not shown above, but would retrieve the stored JSON). It could call env.get('setLocalPermanentData')({}) to fetch current permanent state and return it. Similarly a “Get Temporary” toy would use setLocalTemporaryData({}) to return current temporary state.

  * **“Battleship Solitaire Fleet” (BATT2):** Accepts parameters (via a key-value UI, as its input dropdown default is set to **kv** for board size, etc.[[38]](../../../public/index.html)). It returns a JSON describing a random fleet (ship coordinates). In *text* mode, you’d see the JSON; in *battleship-solitaire-fleet* mode, the site draws a grid with ship icons using that data[[39]](../../../public/index.html)[[40]](../../../public/index.html).

  * **“Battleship Solitaire Clues” (BATT3):** Takes a fleet layout (JSON text) and computes row/column clue numbers. It returns a JSON of clues arrays[[41]](../../../public/index.html)[[30]](../../../public/index.html). In *clues-presenter* mode, those arrays are rendered as a puzzle clue chart; in *text/pre* mode, you’d just see JSON.

## **Summary of the Contract**

* **Toy functions are like pure functions**: Given an input string and a provided env, they produce an output value without directly touching the page. They should be **deterministic** and free of side-effects except via env utilities (for state storage or randomness). This makes them easy to test and reuse.

* **Registration is declarative:** You “register” a toy by adding its metadata to a post. The site’s generator and global loader take care of injecting it. There’s no need for the toy module to self-register; just ensure the export name and path match the site config.

* **Lifecycle & expectations:** The toy will be loaded when needed, initialized with disabled controls (to indicate loading), then activated. The toy function may be called multiple times (each time the user submits new input). It should therefore handle repeated calls gracefully (e.g. using env to maintain state if needed). The framework will handle switching input modes (e.g. enabling a key/value form) and output modes without the toy needing to know about those UI details. The toy is expected to **return promptly**; if it’s long-running or asynchronous, currently the interface doesn’t support Promises – the design assumes a synchronous return. (All existing toys complete near-instantly; if needed, a toy could still perform async work internally and then return a result, but the UI will not await it explicitly.)

* **Common patterns:** Many toys follow patterns:

  * Parse user input (if it’s JSON or number).

  * Use one of the env helpers if needed (random, storage, etc.).

  * Compute a result (e.g. transform the data, generate content).

  * Return a string (often JSON-stringified object or a simple value).

Toys like **HelloWorld**, **Identity**, **Italics** (which might wrap text in `<i>` tags as output), etc., are straightforward text transforms. Others like **Cyberpunk Adventure** or **Tic-Tac-Toe** produce structured output that the site can present graphically (e.g. an ASCII art or a mini-game board).

In all cases, as long as the toy module exposes the expected function and returns the expected type, the site-wide loader will inject it and manage the UI. By conforming to this interface – *module with an exported function: (string, envMap) → string* – any “toy” can plug into mattheard.net’s system and immediately gain a standard interactive UI with input controls and multiple output presentation options.

**Sources:**

* Static site generator code showing toy script injection and interface[[42]](../../build/generator.js)[[43]](../../build/generator.js).

* The global loader setup (addComponent and lazy initialization)[[44]](../../../public/index.html)[[9]](../../../public/index.html).

* Environment utilities provided to toys (from createEnv in **main.js**)[[45]](../../../browser/main.js)[[46]](../../../browser/main.js).

* Example toy implementations and their behavior in the site HTML:

  * *Identity toy (IDEN1) returns input verbatim*[[1]](../../../public/index.html)[[2]](../../../public/index.html)

  * *Hello World toy (HELL1) output*

  * *Set Permanent Data toy using env and returning JSON*[[3]](../../../public/2025-07-05/setPermanentData.js)[[4]](../../../public/2025-07-05/setPermanentData.js)

  * *Battleship Clues toy output options and registration*[[29]](../../../public/index.html)[[30]](../../../public/index.html)

  * *Battleship Fleet toy with kv input and custom outputs*[[39]](../../../public/index.html)[[40]](../../../public/index.html).

* Internal code handling toy execution and output rendering (submission flow)[[18]](../../../browser/toys.js)[[19]](../../../browser/toys.js)[[31]](../../../browser/toys.js).

---

[[1]](../../../public/index.html) [[2]](../../../public/index.html) [[9]](../../../public/index.html) [[10]](../../../public/index.html) [[11]](../../../public/index.html) [[24]](../../../public/index.html) [[25]](../../../public/index.html) [[26]](../../../public/index.html) [[27]](../../../public/index.html) [[29]](../../../public/index.html) [[30]](../../../public/index.html) [[35]](../../../public/index.html) [[36]](../../../public/index.html) [[37]](../../../public/index.html) [[38]](../../../public/index.html) [[39]](../../../public/index.html) [[40]](../../../public/index.html) [[41]](../../../public/index.html) [[44]](../../../public/index.html)

[public/index.html](../../../public/index.html)

[[3]](../../../public/2025-07-05/setPermanentData.js) [[4]](../../../public/2025-07-05/setPermanentData.js) [[5]](../../../public/2025-07-05/setPermanentData.js)

[public/2025-07-05/setPermanentData.js](../../../public/2025-07-05/setPermanentData.js)

[[6]](../../../browser/main.js) [[7]](../../../browser/main.js) [[8]](../../../browser/main.js) [[45]](../../../browser/main.js) [[46]](../../../browser/main.js)

[src/browser/main.js](../../../browser/main.js)

[[12]](../../../browser/toys.js) [[13]](../../../browser/toys.js) [[14]](../../../browser/toys.js) [[15]](../../../browser/toys.js) [[16]](../../../browser/toys.js) [[17]](../../../browser/toys.js) [[18]](../../../browser/toys.js) [[19]](../../../browser/toys.js) [[20]](../../../browser/toys.js) [[21]](../../../browser/toys.js) [[22]](../../../browser/toys.js) [[28]](../../../browser/toys.js) [[31]](../../../browser/toys.js) [[32]](../../../browser/toys.js) [[33]](../../../browser/toys.js) [[34]](../../../browser/toys.js)

[src/browser/toys.js](../../../browser/toys.js)

[[23]](../../core/browser/data.js)

[src/core/browser/data.js](../../core/browser/data.js)

[[42]](../../build/generator.js) [[43]](../../build/generator.js)

[src/build/generator.js](../../build/generator.js)
