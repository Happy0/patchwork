const nest = require("depnest");
const { h, when, resolve, send, computed } = require("mutant");
const addContextMenu = require(
  "../../../../message/html/decorate/context-menu",
);

exports.gives = nest("message.html", {
  canRender: true,
  render: true,
});

exports.needs = nest({
  "about.obs.color": "first",
  "app.navigate": "first",
  "blob.sync.url": "first",
  "message.html.layout": "first",
  "message.html.markdown": "first",
  "sbot.obs.connection": "first",
  "profile.html.person": "first",
});

exports.create = function (api) {
  return nest("message.html", {
    render: bookRenderer,
    canRender,
  });

  function bookRenderer(msg, opts) {
    if (!canRender(msg)) return;

    const movie = msg.value.content;

    const imageUrl = computed(
      movie.poster,
      (id) => id && api.blob.sync.url(id),
    );

    const content = h("MovieDetails", [
      h("h1", movie.title),
      h("img", { src: imageUrl }),
      h("h3", movie.year),
      h("hr"),
      h("blockquote", movie.plot),
      h("hr"),
      h("ul", [
        h("li", `Genre: ${movie.genre}`),
        h("li", `Director: ${movie.director.join(", ")}`),
        h("li", `Writer: ${movie.writer.join(", ")}`),
        h("li", `Actors: ${movie.actors.join(", ")}`),
        h("li", `Awards: ${movie.awards}`),
      ]),
    ]);

    const element = api.message.html.layout(
      msg,
      Object.assign({}, {
        content,
        layout: "default",
      }, opts),
    );

    return addContextMenu(element, { msg });
  }

  function canRender(msg) {
    if (msg.value.content.type === "movieclub/new") {
      return true;
    } else if (
      msg.value.content.type === "movieclub/update" && msg.value.content.title
    ) {
      return true;
    } else {
      return false;
    }
  }
};
