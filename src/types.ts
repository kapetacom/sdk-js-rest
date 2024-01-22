export type RequestArgumentTransport = 'path' | 'header' | 'body' | 'query' | 'PATH' | 'HEADER' | 'BODY' | 'QUERY';
export type RequestMethod =
    | 'GET'
    | 'POST'
    | 'DELETE'
    | 'PATCH'
    | 'PUT'
    | 'OPTIONS'
    | 'HEAD'
    | 'TRACE'
    | 'CONNECT'
    | 'LINK'
    | 'UNLINK'
    | 'COPY'
    | 'PURGE'
    | 'LOCK'
    | 'UNLOCK'
    | 'PROPFIND'
    | 'VIEW';

export type Options = { url: string; init: RequestInit };

export type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

export interface RequestArgument {
    name: string;
    value: any;
    transport: RequestArgumentTransport;
    typeName?: string;
}

export class RestError extends Error {
    public readonly response: Response;
    public readonly statusCode: number;

    constructor(error: string, response: Response) {
        super(error);
        this.response = response;
        this.statusCode = response.status;
    }
}
