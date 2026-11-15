const { h } = require("mutant");
const nest = require("depnest");
const SsbChessDataAccess = require("ssb-chess-data-access");
const SsbChessMithril = require("ssb-chess-mithril");
const { onceTrue, computed } = require("mutant");
const pull = require("pull-stream");
const defer = require('pull-defer')

exports.needs = nest({
  "sbot.obs.connection": "first",
  "intl.sync.i18n": "first",
});

exports.gives = nest({
  "page.html": ["render", "notifications"],
});

function createChess(ssb) {
  const dataAccess = new SsbChessDataAccess.SbotClassic(ssb);
  return SsbChessMithril(dataAccess);
}

exports.create = function (api) {
  return nest({
    "page.html": {
      notifications: function() {
        const deferred = defer.source()

        onceTrue(api.sbot.obs.connection, (ssb) => {
          const chessPromise = createChess(ssb);

          chessPromise.then(chess => {
            const notificationStream = pull(
              chess.notifications.getNotificationStream(),
              pull.map(notification => ({
                icon: null,
                title: "Chess",
                message: notification.message,
                // TODO: make it possible to go directly to the game by adding query param / suffix
                // may need to rethink what ID of element is that game mounts to as it seems to be a mess with multiple in the DOM
                // / browser history if they share the same ID
                open: `/chess`

                // Also todo: notifications don't seem to get displayed when chess is in patchwork history even if it
                // isn't the current focus, ugh. Need to look into views.js / how to hide DOM for view when it's not the current view
                // etc
              }))
            )

            deferred.resolve(notificationStream);
          })
        })

        return deferred;
      },
      render: function channel(path) {
        if (!path.startsWith("/chess")) return;

        let removed = false;

        const page = h("div.wrapper", { className: "Scroller" }, [
          h(
            "section.content",
            h("div", {
              id: "ssb-chess-mithril-plugin",
              style: { "margin-top": "20px" },
            }),
          ),
        ]);

        const chessComponent = new Promise((resolve, reject) => {
          onceTrue(api.sbot.obs.connection, (ssb) => {
            const chess = createChess(ssb);

            const loadChess = () => {
              const attachToElement = document.getElementById(
                "ssb-chess-mithril-plugin",
              );

              if (!attachToElement && !removed) {
                console.log("no element, loop");
                setTimeout(() => {
                  loadChess();
                }, 500);
                return;
              } else if (!removed) {
                resolve(chess.then((c) => {
                  return c.mount(attachToElement);
                }));
              }
            };

            loadChess();
          });
        })

        return computed(page, (p) => p, {
          onUnlisten: () => {
            removed = true;

            chessComponent.then(x => x.destroy());
          },
        });
      },
    },
  });
};
