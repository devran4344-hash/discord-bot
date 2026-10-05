import type { Response, ResponseStreamEvent } from "../../resources/responses/responses.js";
import type { ResponseAccumulatorContext, ResponseOutputSnapshot } from "./canonical-output-text.js";
interface ResponseKeepAliveEvent {
    type: 'keepalive';
    sequence_number: number;
}
type ResponseAccumulatorEvent = ResponseStreamEvent | ResponseKeepAliveEvent;
type ResponseLifecycleEvent = Extract<ResponseAccumulatorEvent, {
    type: 'response.created' | 'response.queued' | 'response.in_progress' | 'response.completed' | 'response.failed' | 'response.incomplete';
}>;
export declare function cloneValidatedResponse<T extends ResponseOutputSnapshot>(context: ResponseAccumulatorContext, response: T): T;
export declare function createResponseContext(): ResponseAccumulatorContext;
type ResponseOutputEvent = Exclude<ResponseAccumulatorEvent, ResponseLifecycleEvent>;
/** Matches shared events that can change output. Validation still occurs before mutation. */
export declare function isResponseOutputEvent(event: {
    type: string;
}): event is ResponseOutputEvent;
/** Applies the same strict output validation and mutations without requiring response metadata. */
export declare function accumulateWebSocketOutput(event: ResponseOutputEvent, snapshot: ResponseOutputSnapshot, context: ResponseAccumulatorContext): void;
export declare function accumulateResponseWithContext(event: ResponseAccumulatorEvent, snapshot: Response | undefined, context: ResponseAccumulatorContext, rejectInvalidShellTargets?: boolean, onSanitizedEvent?: (event: ResponseStreamEvent) => void): Response;
export {};
//# sourceMappingURL=response-accumulator.d.ts.map