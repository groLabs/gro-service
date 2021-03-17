'use strict'

const logger = require('../common/logger')

class HandleBlockService {
  #blockQueues = []

  constructor(callbackFun) {
    this.handleFun = callbackFun
    this.currenctHandlePromise = undefined
    logger.info('HandleBlockService initilize done.')
  }

  handleNewBlock(blockNumber) {
    this.#blockQueues.push(blockNumber)
    this.#startHandleBlock()
  }

  #startHandleBlock() {
    if (this.currenctHandlePromise) return
    const blockNumber = this.#blockQueues.shift()
    if (!blockNumber) return

    // handle triggers
    this.currenctHandlePromise = this.handleFun(blockNumber)

    this.currenctHandlePromise.then(() => {
      this.currenctHandlePromise = undefined
      if (this.#blockQueues.length) {
        this.#startHandleBlock()
      }
    })
  }

  getBlockQueues() {
    return Array.from(this.#blockQueues)
  }
}

module.exports = HandleBlockService
