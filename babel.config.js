// Jest runs babel-preset-expo output as CommonJS without Node's ESM VM flag, so
// a native `import()` (used by stores to lazy-load syncService) would crash the
// worker. In tests only, rewrite it to a lazy require.
function dynamicImportToRequire({ types: t }) {
  return {
    visitor: {
      CallExpression(path) {
        if (path.node.callee.type !== 'Import') return;
        path.replaceWith(
          t.callExpression(
            t.memberExpression(
              t.callExpression(
                t.memberExpression(t.identifier('Promise'), t.identifier('resolve')),
                []
              ),
              t.identifier('then')
            ),
            [
              t.arrowFunctionExpression(
                [],
                t.callExpression(t.identifier('require'), path.node.arguments)
              ),
            ]
          )
        );
      },
    },
  };
}

module.exports = function (api) {
  const isTest = api.cache.using(() => process.env.NODE_ENV === 'test');
  return {
    presets: ['babel-preset-expo'],
    plugins: isTest ? [dynamicImportToRequire] : [],
  };
};
