import yaml from 'js-yaml';
import { Diagnostic } from '@codemirror/lint';

import { checkHttpsServers } from '@/functions/checkHttpsServers';
import { checkParamElementPresence } from '@/functions/checkParamElementPresence';
import { checkElementSensitiveData } from '@/functions/checkElementSensitiveData';
import { checkAllowedMethods } from '@/functions/checkAllowedMethods';
import { checkOASSpec } from '@/functions/checkOASSpec';
import { checkOASVersion } from '@/functions/checkOASVersion';
import { checkCRUD } from '@/functions/checkCRUD';
import { checkSuccessResponse } from '@/functions/checkSuccessResponse';
import { checkGetIdempotency } from '@/functions/checkGetIdempotency';
import { checkGetReturnObject } from '@/functions/checkGetReturnObject';
import { checkParamElementAbsence } from '@/functions/checkParamElementAbsence';
import { checkRequestEncapsulation } from '@/functions/checkRequestEncapsulation';
import { checkResponseEncapsulation } from '@/functions/checkResponseEncapsulation';
import { checkCompatibility } from '@/functions/checkCompatibility';

export const functionsMap: {
  [key: string]: (spec: any, content: string, rule: any) => Diagnostic[] | Promise<Diagnostic[]>;
} = {
  checkHttpsServers,
  checkParamElementPresence,
  checkElementSensitiveData,
  checkAllowedMethods,
  checkOASSpec,
  checkOASVersion,
  checkCRUD,
  checkSuccessResponse,
  checkGetIdempotency,
  checkGetReturnObject,
  checkParamElementAbsence,
  checkRequestEncapsulation,
  checkResponseEncapsulation,
  checkCompatibility,
};

/**
 * Run the OpenAPI linter for a set of selected rules.
 * This is environment-agnostic (can be called from browser or server).
 */
export async function runLinter(
  content: string,
  selectedRules: any
): Promise<{ diagnostics: Diagnostic[]; specTitle?: string }> {
  let diagnostics: Diagnostic[] = [];
  let specTitle: string | undefined;

  try {
    const spec = yaml.load(content, { json: true });
    specTitle = (spec as any)?.info?.title;

    if (!Array.isArray(selectedRules) || selectedRules.length === 0) {
      return { diagnostics, specTitle };
    }

    const runnable = selectedRules.filter(
      (rule: any) =>
        !!rule?.call?.function &&
        typeof functionsMap[rule.call.function] === 'function'
    );

    const results = await Promise.all(
      runnable.map(async (rule: any) => {
        const funcName = rule.call.function as string;
        const ruleFunc = functionsMap[funcName];
        try {
          const out = await ruleFunc(spec, content, rule);
          return Array.isArray(out) ? out : [];
        } catch (err: any) {
          return [
            {
              from: 0,
              to: content.length,
              severity: 'error',
              message: `Rule "${funcName}" execution failed: ${
                err?.message || String(err)
              }`,
              source: funcName,
            } as Diagnostic,
          ];
        }
      })
    );

    diagnostics = results.flat();
  } catch (error: any) {
    diagnostics.push({
      from: 0,
      to: content.length,
      severity: 'error',
      message: 'Specification parsing error: ' + error.message,
      source: 'parser',
    });
  }

  return { diagnostics, specTitle };
}
