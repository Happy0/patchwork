var Chess = require('ssb-chess/index');
var nest = require('depnest');
var onceTrue = require('mutant/once-true');

exports.gives = nest('page.html.render');

exports.needs = nest({
  'sbot.obs.connection': 'first',
  'backlinks.obs.for': 'first'
});

exports.create = function(api) {
  return nest('page.html.render', function mentions(path) {
    if (path !== '/chess') return

    var domElement = document.createElement('div');

    onceTrue(api.sbot.obs.connection(), (sbot) => {
      var injectedApi = {
        backlinks: api.backlinks.obs.for
      }

      Chess(domElement, sbot, injectedApi);
    });

    return domElement;
  })
}
