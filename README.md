# 4=10 EVM puzzles

A collection of EVM puzzles modified to play the 4=10 game. Each puzzle consists on sending a successful transaction to a contract. The bytecode of the contract is provided, and you need to fill the missing opcodes that won't revert the execution.

## How to play

Clone this repository and install its dependencies (`npm install` or `yarn`). Then run:

```
npx hardhat play
```

And the game will start.

Your task is to manipulate the 4 numbers on the stack to yield 10 using the 4 basic mathematical operations.

The only allowed opcodes are 01 (ADD), 02 (MUL), 03 (SUB) and 04 (DIV). Enter them one after the other unseparated.

You can use [`evm.codes`](https://www.evm.codes/)'s reference and playground to work through this.
