export const HEADER_RULE_IDS = Object.freeze({
  weixin: Object.freeze([1001]),
  zhihu: Object.freeze([2001, 2002]),
  juejin: Object.freeze([3001, 3002]),
  woshipm: Object.freeze([4001]),
});

let sessionRulesQueue = Promise.resolve();

function validateRules(rules) {
  if (!Array.isArray(rules) || rules.length === 0 || Reflect.ownKeys(rules).length !== rules.length + 1) {
    throw new TypeError('会话规则不能为空');
  }
  const ids = rules.map((rule) => rule?.id);
  if (ids.some((id) => !Number.isInteger(id) || id <= 0)) throw new TypeError('会话规则 ID 必须是正整数');
  if (new Set(ids).size !== ids.length) throw new TypeError('会话规则 ID 不能重复');
  return ids;
}

export async function withSessionHeaderRules(declarativeNetRequest, rules, work) {
  const ruleIds = validateRules(rules);
  if (typeof work !== 'function') throw new TypeError('受保护工作必须是函数');
  if (typeof declarativeNetRequest?.updateSessionRules !== 'function') throw new TypeError('DNR 不可用');

  const run = async () => {
    let result;
    let failed = false;
    let primaryError;
    try {
      await declarativeNetRequest.updateSessionRules({ removeRuleIds: ruleIds, addRules: rules });
      result = await work();
    } catch (error) {
      failed = true;
      primaryError = error;
    } finally {
      try {
        await declarativeNetRequest.updateSessionRules({ removeRuleIds: ruleIds });
      } catch (cleanupError) {
        if (!failed) {
          failed = true;
          primaryError = cleanupError;
        } else if (primaryError && (typeof primaryError === 'object' || typeof primaryError === 'function')) {
          try {
            primaryError.cleanupError = cleanupError;
          } catch {
            // Keep the original failure when the runtime error is not extensible.
          }
        }
      }
    }
    if (failed) throw primaryError;
    return result;
  };

  // ponytail: one global queue serializes all protected work; throughput is one task at a time. Upgrade to per-rule-ID/ref-count locks when parallel platform tasks are required.
  const next = sessionRulesQueue.then(run, run);
  sessionRulesQueue = next.catch(() => {});
  return next;
}
