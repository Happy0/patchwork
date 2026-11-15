const nest = require("depnest");
const extend = require("xtend");
const next = require("pull-next-query");
const pull = require("pull-stream");

exports.gives = nest("movies.pull.movies");

exports.needs = nest({
  "intl.sync.i18n": "first",
});

exports.create = function (api) {
  const i18n = api.intl.sync.i18n;
  return nest("movies.pull.movies", function (server, opts) {
    const defaultOpts = {
      query: [{
        $filter: {
          value: {
            timestamp: { $gt: 0 },
            content: {
              type: "movieclub/new",
            },
          },
        },
      }],
    };
    const _opts = Object.assign({}, defaultOpts, opts);

    return next(server.query.read, _opts);
  });
};
