export default class SettingError extends Error {
    constructor(message: string | undefined) {
        super(message);
        this.name = 'SettingError';
    }
}
