Faced an unexpected truncation of the ESLint output in the terminal; the CLI clipped the stream at 10 KiB, so the most complex function warning was hidden. I confirmed the full results were persisted under `reports/lint/lint.txt` and wrote a quick Node script to parse that file and surface the maximum complexity along with its path.

Actionable takeaway: when ESLint writes to a report, rely on the saved artifact instead of the console stream. Reuse or adapt the Node snippet below to locate the worst offender quickly:

```js
node -e "const fs=require('fs');let p='reports/lint/lint.txt';let lines=fs.readFileSync(p,'utf8').split('\n');let last='';let max=-1;let loc='';for(const line of lines){if(line.startsWith('/')){last=line.trim();continue;}let m=line.match(/has a complexity of (\\d+)/);if(m){let v=Number(m[1]);if(v>max){max=v;loc=last+' -> '+line.trim();}}}console.log({max,loc});"
```

Open follow-up: consider adding a lightweight helper script (or npm task) that reports the top complexity offenders straight from the lint artifact so future runs highlight the hotspots without manual parsing.
