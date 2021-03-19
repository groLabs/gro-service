# gro-service

Gro bot service APIs and stats APIs

## Prepare local enviroment

1. install `nodejs`, refer to [nodejs](https://nodejs.org/en/)
2. install `yarn`, refer to [yarn](https://classic.yarnpkg.com/en/)

## Run on kovan

1. run `yarn install` in workspace root folder
2. run `npm run dev` in workspance root to start service
3. run `curl -X POST http://localhost:3000/bot/subscribe-new-block` to start listener
4. run `curl -X POST http://localhost:3000/bot/unsubscribe` to stop listener
5. run `curl http://localhost:3000/bot/get-pending-blocks` to get pending blocks
