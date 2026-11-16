const { h } = require("mutant");
const nest = require("depnest");
const SsbChessDataAccess = require("ssb-chess-data-access");
const SsbChessMithril = require("ssb-chess-mithril");
const { onceTrue, computed } = require("mutant");
const defer = require('pull-defer');
const pull = require('pull-stream');

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
                open: `/chess`,
                anchor: {
                  gameId: notification.gameId
                }
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

        const view = computed(page, (p) => p, {
          onUnlisten: () => {
            removed = true;

            chessComponent.then(x => x.destroy());
          },
        });

        view.setAnchor = function(data) {
          if (data && data.gameId) {
            const gameId = data.gameId;
            chessComponent.then(c => c.goToGame(gameId))
          }
        }

        return view;
      },
    },
  });
};
