import * as WS from 'ws';
import { NodeWebSocket } from "../../internal/ws-adapter-node.mjs";
import { ResponsesWSBase, type ResponsesWSBaseOptions } from "./ws-base.mjs";
import { OpenAI } from "../../client.mjs";
export type { WebSocketStreamOptions } from "../../internal/ws.mjs";
export type { ResponsesWSReconnectOptions } from "./ws-base.mjs";
export interface ResponsesWSClientOptions extends WS.ClientOptions, ResponsesWSBaseOptions {
    /** Basic authentication forwarded by the Node `ws` transport. */
    auth?: string;
}
export declare class ResponsesWS extends ResponsesWSBase<NodeWebSocket> {
    private _wsOptions;
    private _credentials;
    constructor(client: OpenAI, options?: ResponsesWSClientOptions | null | undefined);
    protected _authHeaders(apiKey?: string | null): Record<string, string>;
    /**
     * Whether credentials passed to the Node transport use the SDK key.
     * The SDK recognizes its key, including copies and additions in credential headers.
     * Override and return true if your socket hook signs or otherwise irreversibly transforms it.
     * Explicit caller options and header removals still take precedence on reconnect.
     */
    protected _usesSDKAPIKey(authHeaders: Record<string, string>): boolean;
    protected _createSocket(url: URL, authHeaders: Record<string, string>): NodeWebSocket;
    protected _prepareReconnectSocket(): Promise<(url: URL) => NodeWebSocket>;
}
//# sourceMappingURL=ws.d.mts.map