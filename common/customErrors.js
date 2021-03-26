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

class ParameterError extends Error {
    constructor(message) {
        super(message)
        this.name = 'ParameterError'
    }
}

module.exports = {
    SettingError,
    DiscordError,
    ContractCallError,
    ParameterError,
}
