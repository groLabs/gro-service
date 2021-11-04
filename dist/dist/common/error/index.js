"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const SettingError_1 = __importDefault(require("./SettingError"));
const DiscordError_1 = __importDefault(require("./DiscordError"));
const ContractCallError_1 = __importDefault(require("./ContractCallError"));
const ContractSendError_1 = __importDefault(require("./ContractSendError"));
const BlockChainCallError_1 = __importDefault(require("../../dist/common/error/BlockChainCallError"));
const ParameterError_1 = __importDefault(require("./ParameterError"));
const PendingTransactionError_1 = __importDefault(require("./PendingTransactionError"));
exports.default = {
    SettingError: SettingError_1.default,
    DiscordError: DiscordError_1.default,
    ContractCallError: ContractCallError_1.default,
    ContractSendError: ContractSendError_1.default,
    BlockChainCallError: BlockChainCallError_1.default,
    ParameterError: ParameterError_1.default,
    PendingTransactionError: PendingTransactionError_1.default,
};
