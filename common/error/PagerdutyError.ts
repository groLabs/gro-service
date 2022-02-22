export default class ParameterError extends Error {
    constructor(message: string | undefined) {
        super(message);
        this.name = 'PagerdutyError';
    }
}
