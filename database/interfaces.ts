export interface IApiCall {
    hostname: string;
    port: number;
    path: string;
    method: string
}

export interface IApiReturn {
    data: any;
    status: number;
}

