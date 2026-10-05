"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withAgentTurnResult = withAgentTurnResult;
const parse_result_1 = require("./parse-result.js");
const result_collection_1 = require("./result-collection.js");
/** Add beta result collection without replacing custom stream instances.
 * @internal
 */
function withAgentTurnResult(stream, format) {
    let collection;
    stream.__betaTransformIterator((source) => {
        collection = new result_collection_1.ResultCollection(source, undefined, undefined, stream.controller.signal);
        return () => collection.iterate();
    });
    let parsed;
    const result = Object.assign(stream, {
        finalResult: () => (parsed ?? (parsed = (0, parse_result_1.parseAgentResultPromise)(collection.finalResult(), format))),
        withResultCollection: () => {
            collection.enable();
            return result;
        },
    });
    return result;
}
//# sourceMappingURL=agent-session-create-stream.js.map