const fs = require("fs-extra");
const { resolve } = require("path");
const inquirer = require("inquirer");
const chalk = require("chalk");

const { getOpcode } = require("./opcodes");

module.exports.play = async function play() {
  var solved = false;
  var puzzleCounter = 1;
  var randomNumber = getRandomNumber(0, 25046);

  console.log("\nWelcome to the 4=10 EVM Codes puzzle game!\n");
  console.log("Your task is to manipulate the 4 numbers on the stack to yield 10 using the 4 basic mathematical operations.\n");
  console.log("The only allowed opcodes are 01 (ADD), 02 (MUL), 03 (SUB) and 04 (DIV).\n");

  while (true) {
    if (solved) {
      puzzleCounter++;
      randomNumber = getRandomNumber(0, 25046);
    }

    const puzzle = getNextPuzzle(randomNumber);

    const solution = await playPuzzle(puzzle);

    if (solution) {
      if (await askPlayNext()) {
        solved = true;
      }
      else {
        console.log("Thanks for playing!");
        process.exit(0);
      }
    } else {
      if (!(await askTryAgain())) {
        console.log("Thanks for playing!");
        process.exit(0);
      }
      else {
        solved = false;
      }
    }
  };

  async function playPuzzle(puzzle) {
    printTitle(puzzle.number);
    console.log();
    printCode(puzzle.code);
    console.log();

    const solution = await readSolution();

    const [success, evmCodesUrl] = await runPuzzle(puzzle.code, solution);

    console.log();
    if (success) {
      console.log(chalk.green("Puzzle solved!"));
    } else {
      console.error(chalk.red("Wrong solution :("));
    }
    console.log();
    console.log("Run it in evm.codes:", evmCodesUrl);
    console.log();

    if (success) {
      return solution;
    }
  }

  async function askPlayNext() {
    const answers = await inquirer.prompt([
      {
        type: "confirm",
        name: "playNext",
        message: "Do you want to play the next puzzle?"
      }
    ]);

    console.log();

    return answers.playNext;
  }

  async function askTryAgain() {
    const answers = await inquirer.prompt([
      {
        type: "confirm",
        name: "tryAgain",
        message: "Do you want to try again?"
      }
    ]);

    console.log();

    return answers.tryAgain;
  }

  function printCode(code) {
    code = code.toUpperCase();
    let i = 0;

    const positions = [];
    const opcodesHex = [];
    const opcodes = [];

    let opcodeHexColumnWidth = 0;

    while (i < code.length) {
      let opcodeHex = code.slice(i, i + 2);
      let [opcode, pushSize] = getOpcode(opcodeHex);

      const position = (i / 2)
        .toString(16)
        .toUpperCase()
        .padStart(2, "0");

      positions.push({ value: position, color: "gray" });

      let opcodeHexItem;
      let opcodeItem;
      if (pushSize) {
        const pushArg = code.slice(i + 2, i + 2 + 2 * pushSize);
        opcodeHexItem = { value: opcodeHex + pushArg, color: null };
        opcodeItem = { value: `${opcode}${pushSize} ${pushArg}`, color: null };
        i += 2 + 2 * pushSize;
      } else {
        let color = null;
        if (opcode === "STOP") {
          color = "green";
        } else if (opcode === "REVERT") {
          color = "red";
        } else if (opcode === "JUMPDEST") {
          color = "cyan";
        }
        else if (opcode === "INSERT") {
          color = "blue";
        }
        opcodeHexItem = { value: opcodeHex, color };
        opcodeItem = { value: opcode, color };
        i += 2;
      }

      opcodeHexColumnWidth = Math.max(
        opcodeHexColumnWidth,
        opcodeHexItem.value.length
      );

      opcodes.push(opcodeItem);
      opcodesHex.push(opcodeHexItem);
    }

    const colorize = ({ value, color }, padEnd = 0) => {
      const paddedValue = value.padEnd(padEnd, " ");
      return color ? chalk[color](paddedValue) : paddedValue;
    };

    for (let i = 0; i < positions.length; i++) {
      console.log(
        colorize(positions[i]),
        "    ",
        colorize(opcodesHex[i], opcodeHexColumnWidth + 5),
        colorize(opcodes[i])
      );
    }
  }

  async function readSolution() {
    let data = "";
    let solution;

    while (data.length !== 6 || !isValidSolution(data)) {
      solution = await inquirer.prompt([
        {
          type: "input",
          name: "data",
          message: "Enter the opcodes unseparated:"
        }
      ]);
      data = solution.data;
    }

    return data;
  }

  function isValidSolution(data) {
    const parts = data.match(/.{1,2}/g) || [];
    return parts.length === 3 && parts.every(part => ["01", "02", "03", "04"].includes(part));
  }

  async function runPuzzle(puzzleCode, data) {
    const [s] = await ethers.getSigners();

    const address = "0xffffffffffffffffffffffffffffffffffffffff";
    const opcodes = data.match(/.{1,2}/g);
    const finalPuzzleCode = puzzleCode.replace(/XX/g, () => opcodes.shift());

    await hre.network.provider.send("hardhat_setCode", [
      address,
      `0x${finalPuzzleCode}`
    ]);

    const evmCodesUrl = `https://www.evm.codes/playground?callValue=0&unit=Wei&callData=0x00&codeType=Bytecode&code=%27${finalPuzzleCode}%27_`;

    try {
      await s.sendTransaction({
        to: address,
        data: "0x00",
        gasLimit: 1_000_000,
        value: 0
      });
      return [true, evmCodesUrl];
    } catch (e) {
      return [false, evmCodesUrl];
    }
  }

  function printTitle(i) {
    const text = `Puzzle ${i}`;
    const width = text.length + 4;
    console.log("#".repeat(width));
    console.log(`# ${text} #`);
    console.log("#".repeat(width));
  }

  function getNextPuzzle(randomNumber) {
    const { root } = hre.config.paths;
    const puzzlesDir = resolve(root, "puzzles");

    const puzzle = fs.readJsonSync(resolve(puzzlesDir, `puzzles.json`));
    return {
      code: puzzle.puzzles[randomNumber],
      number: puzzleCounter
    };
  }

  function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
