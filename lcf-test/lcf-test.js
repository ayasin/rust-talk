const fs = require('fs');
const path = require('path');

const ref = require('ref');
const ffi = require('ffi');

const ITERATIONS = 100;

const int64 = ref.types.int64;
const voidType = ref.types.void;

const rust = ffi.Library(path.join(__dirname, 'rust-lcf/target/release/liblcf'), {
  lcf: [int64, [ int64, int64 ]],
  mt_lcf: [voidType, [ int64, int64, 'pointer' ]],
});

function timeExecution(num1, num2, fnName, fn) {
  process.stdout.write(`\n${ITERATIONS} Iterations of ${fnName}\n`);
  const start = process.hrtime();
  let result;
  for (let i=0; i < ITERATIONS; i++) {
    result = fn(num1, num2);
  }
  const timeTaken = process.hrtime(start);
  const timeAsNumber = +`${timeTaken[0]}.${timeTaken[1]}`;
  // process.stdout.write(`\t${result} is the common factor of ${num1} and ${num2}\n`);
  process.stdout.write(`\tTotal Time ${timeAsNumber} seconds\n`);
  process.stdout.write(`\tAverage Single Iteration: ${timeAsNumber/ITERATIONS} seconds\n\n`);
}

function optimizableJSLCF(num1, num2) {
  const stop = num1 > num2 ? num2 + 1 : num1 + 1;
  for (let check = 2; check < stop; check++) {
    if (!(num1 % check) && !(num2 % check)) {
      return check;
    }
  }
  return 0;
}

function nonOptimizableJSLCF(num1, num2) {
  try {
    const stop = num1 > num2 ? num2 + 1 : num1 + 1;
    for (let check = 2; check < stop; check++) {
      if (!(num1 % check) && !(num2 % check)) {
        return check;
      }
    }
    return 0;
  } catch (e) {}
}


function timeCallbackExecution(num1, num2, fnName, fn, lastRun = { startTime: 0, runs: 0 }) {
  if (!lastRun.startTime) lastRun.startTime = process.hrtime();
  const callback = ffi.Callback(voidType, [int64], function(factor) {
    lastRun.runs++;
    if (lastRun.runs < ITERATIONS) {
      timeCallbackExecution(num1, num2, fnName, fn, lastRun);
    } else {
      const timeTaken = process.hrtime(lastRun.startTime);
      const timeAsNumber = +`${timeTaken[0]}.${timeTaken[1]}`;
      process.stdout.write(`\n${ITERATIONS} Iterations of ${fnName}\n`);
      process.stdout.write(`\tTotal Time ${timeAsNumber} seconds\n`);
      process.stdout.write(`\tAverage Single Iteration: ${timeAsNumber/ITERATIONS} seconds\n\n`);
    }
  });
  fn(num1, num2, callback);
}


function main() {
  const args = process.argv.slice(2);

  if (args.length !== 2) {
    process.stdout.write('args: <number 1> <number 2>');
    return;
  }

  const num1 = +args[0];
  const num2 = +args[1];

  const timeRunOf = timeExecution.bind(this, num1, num2);

  timeRunOf('Non-Optimized JS', nonOptimizableJSLCF);
  timeRunOf('Optimized JS', optimizableJSLCF);
  timeRunOf('Rust Single Threaded', rust.lcf);
  timeCallbackExecution(num1, num2, 'Rust Multi Threaded', rust.mt_lcf);
}

main();
