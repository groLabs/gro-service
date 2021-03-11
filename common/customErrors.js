'use strict'

class SettingError extends Error {
  constructor(message) {
    super(message)
    this.name = 'SettingError'
  }
}

class DiscordError extends Error {
  constructor(message) {
    super(message)
    this.name = 'DiscordError'
  }
}

class ContractCallError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ContractCallError'
  }
}

module.exports = {
  SettingError,
  DiscordError,
  ContractCallError,
}
