import { parseAgentResultPromise } from "./parse-result.mjs";
import { ResultCollection } from "./result-collection.mjs";
/** Add beta result collection without replacing custom stream instances.
 * @internal
 */
export function withAgentTurnResult(stream, format) {
    let collection;
    stream.__betaTransformIterator((source) => {
        collection = new ResultCollection(source, undefined, undefined, stream.controller.signal);
        return () => collection.iterate();
    });
    let parsed;
    const result = Object.assign(stream, {
        finalResult: () => (parsed ?? (parsed = parseAgentResultPromise(collection.finalResult(), format))),
        withResultCollection: () => {
            collection.enable();
            return result;
        },
    });
    return result;
}
//# sourceMappingURL=agent-session-create-stream.mjs.map