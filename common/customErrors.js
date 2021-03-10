'use strict';

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

module.exports = {
	SettingError,
	DiscordError
};