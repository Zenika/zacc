/**
 * @template {string} VarName
 * @param {VarName[]} varNames
 * @param {NodeJS.ProcessEnv} env
 * @returns {{ [V in VarName]: string }}
 */
export function strings(varNames, env = process.env) {
  // @ts-ignore
  return varNames.reduce((result, varName) => {
    return Object.assign(result, { [varName]: env[varName] ?? "" });
  }, {});
}

/**
 * @template {string} VarName
 * @param {VarName[]} varNames
 * @param {NodeJS.ProcessEnv} env
 * @returns {{ [V in VarName]: string[] }}
 */
export function listsOfStrings(varNames, env = process.env) {
  // @ts-ignore
  return varNames.reduce((result, varName) => {
    return Object.assign(result, {
      [varName]: (env[varName] ?? "").split(",").filter(Boolean),
    });
  }, {});
}

/**
 * @template {string} VarName
 * @param {VarName[]} varNames
 * @param {NodeJS.ProcessEnv} env
 * @returns {{ [V in VarName]: boolean }}
 */
export function booleans(varNames, env = process.env) {
  // @ts-ignore
  return varNames.reduce((result, varName) => {
    return Object.assign(result, {
      [varName]: env[varName] === "true",
    });
  }, {});
}

/**
 * @template {string} VarName
 * @param {VarName[]} varNames
 * @param {NodeJS.ProcessEnv} env
 * @returns {{ [V in VarName]?: URL }}
 */
export function urls(varNames, env = process.env) {
  // @ts-ignore
  return varNames.reduce((result, varName) => {
    const value = env[varName];
    try {
      return Object.assign(result, {
        [varName]: value ? new URL(value) : undefined,
      });
    } catch (err) {
      throw new Error(`${varName} is set to '${value}', which is not a URL`);
    }
  }, {});
}
