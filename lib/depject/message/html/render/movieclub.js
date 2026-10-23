const nest = require("depnest");
const pull = require("pull-stream");

const {
  Array: MutantArray,
  h,
  when,
  resolve,
  Value,
  send,
  computed,
  onceTrue,
  map,
} = require("mutant");
const addContextMenu = require(
  "../../../../message/html/decorate/context-menu.js",
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
  "movies.sheet.edit": "first",
  "movies.sheet.review": "first",
  "movies.pull.reviews": "first",
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

    const reviews = MutantArray([]);
    const reviewCount = computed([reviews], (rs) => {
      return rs.length;
    });

    onceTrue(api.sbot.obs.connection, (sbot) => {
      pull(
        api.movies.pull.reviews(sbot, movie, { reverse: true }),
        pull.drain((item) => {
          reviews.push(item);
        }),
      );
    });

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
      h("h1", "Reviews"),
      h("div.readers", [
        h("span", [reviewCount, ` reviews`]),
      ]),
      h("div.actions", [
        // h("button.editor", {
        //   "ev-click": send(api.movies.sheet.edit, msg.key, movie),
        // }, "Edit Details"),
        h("button.add-review", {
          "ev-click": send(api.movies.sheet.review, {
            id: msg.key,
            imdbID: movie.imdbID,
          }),
        }, "Add Review"),
      ]),
      h(
        "section.reviews",
        map(reviews, (msg) => {
          console.log("review", msg);
          const o = msg.value.content;
          const reviewAuthor = msg.value.author;
          let reviewBlurb =
            `Rated ${o.rating} ${o.ratingType} out of ${o.ratingMax}.`;

          if (o.review?.length > 0) {
            reviewBlurb += `\n\n${o.review}`;
          }

          if (o.shelves?.length > 0) {
            if (Array.isArray(o.shelves)) {
              if (o.shelves.length == 1 && o.shelves[0] !== "") {
                reviewBlurb += `\n\nShelved in: ${o.shelves.join(", ")}.`;
              }
            } else if (!Array.isArray(o.shelves)) {
              reviewBlurb += `\n\nShelved in: ${o.shelves}.`;
            }
          }

          reviewBlurb += `\n\n---`;
          return h("div.review", [
            api.profile.html.person(reviewAuthor),
            api.message.html.markdown(reviewBlurb),
          ]);
        }),
      ),
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
