export const HEADER_RULE_IDS = Object.freeze({
  weixin: Object.freeze([1001]),
  zhihu: Object.freeze([2001, 2002]),
  juejin: Object.freeze([3001, 3002]),
  woshipm: Object.freeze([4001]),
});

export async function withSessionHeaderRules(declarativeNetRequest, rules, work) {
  const ruleIds = rules.map((rule) => rule.id);
  let result;
  let primaryError;

  try {
    await declarativeNetRequest.updateSessionRules({ removeRuleIds: ruleIds, addRules: rules });
    result = await work();
  } catch (error) {
    primaryError = error;
  } finally {
    try {
      await declarativeNetRequest.updateSessionRules({ removeRuleIds: ruleIds });
    } catch (cleanupError) {
      if (!primaryError) primaryError = cleanupError;
      else if (primaryError && (typeof primaryError === 'object' || typeof primaryError === 'function')) {
        try {
          primaryError.cleanupError = cleanupError;
        } catch {
          // Keep the original failure when the runtime error is not extensible.
        }
      }
    }
  }

  if (primaryError) throw primaryError;
  return result;
}
