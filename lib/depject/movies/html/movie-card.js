const nest = require("depnest");
const { h, when, resolve, send } = require("mutant");

exports.gives = nest("movies.html", {
  card: true,
});

exports.needs = nest({
  "about.obs.color": "first",
  "blob.sync.url": "first",
  "message.html.markdown": "first",
});

exports.create = function (api) {
  return nest("movies.html", {
    card: movieCard,
  });

  function movieCard({ movie, blobUrl, onClick, color }) {
    // console.log("book card", book)
    const thumbnail = when(
      movie.common.image,
      h("Thumbnail", {
        style: {
          "background-image": `url("${
            blobUrl(resolve(movie.common.image?.link || movie.common.image))
          }")`,
          "background-position": "top",
          "background-size": "contain",
          "background-repeat": "no-repeat",
        },
      }),
      h("Thumbnail -empty", {
        style: { "background-color": color(movie.common.title) },
      }, [
        h("i.fa.fa-file-text-o"),
      ]),
    );

    const abbreviatedDescription =
      movie.common.description.split(/\s+/).slice(0, 100).join(" ") + "...";

    let authors = "";

    if (typeof movie.common?.authors === "string") {
      authors = movie.common.authors;
    } else if (Array.isArray(movie.common?.authors)) {
      authors = movie.common.authors.join(", ");
    } else {
      authors = "Unknown author";
      console.log("unknown author", movie);
    }

    const readerCount = movie.readers.length;

    let reviewCount = 0;

    for (const reviewAuthor in movie.reviews) {
      const o = movie.reviews[reviewAuthor];

      if (o.rating !== "") {
        reviewCount += 1;
      } else if (o.comments.length > 0) {
        reviewCount += 1;
      }
    }

    const b = h("BookCard", { "ev-click": onClick }, [
      // h('div.context', [
      //   api.about.html.avatar(author, 'tiny'),
      //   h('div.name', api.about.obs.name(author)),
      //   api.message.html.timeago(blog)
      // ]),
      h("div.content", [
        h("div.text.Markdown", [
          h("h1", movie.common.title),
          h("div.authors", authors),
          when(
            movie.common.series,
            h(
              "div.series",
              `#${movie.common.seriesNo} in '${movie.common.series}' series.`,
            ),
          ),
          h("div.summary", [
            api.message.html.markdown(abbreviatedDescription),
          ]),
          h("div.readers", [
            h("span", `${readerCount} readers`),
            h("span", `${reviewCount} reviews`),
          ]),
          h("div.read", "Read More"),
        ]),
        thumbnail,
      ]),
    ]);

    return b;
  }
};
