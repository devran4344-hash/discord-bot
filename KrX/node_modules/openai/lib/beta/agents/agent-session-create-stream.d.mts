import type { AgentOutputFormat, AgentResult } from "./output-format-types.mjs";
import type { Stream } from "../../../core/streaming.mjs";
import type { AgentSessionEvent } from "../../../resources/beta/agents/agents.mjs";
/** Beta: the original creation stream with optional collection of its initial root turn. */
export type AgentSessionCreateStream<T = never> = Stream<AgentSessionEvent> & {
    /** Drain through the selected turn's completion and idle event, then return its final messages. */
    finalResult: () => Promise<AgentResult<T>>;
    /** Opt into retaining completed final messages before iterating progress events. */
    withResultCollection: () => AgentSessionCreateStream<T>;
};
/** Add beta result collection without replacing custom stream instances.
 * @internal
 */
export declare function withAgentTurnResult<T = never>(stream: Stream<AgentSessionEvent>, format?: AgentOutputFormat<T>): AgentSessionCreateStream<T>;
//# sourceMappingURL=agent-session-create-stream.d.mts.map