const {
  Array: MutantArray,
  onceTrue,
  computed,
  Proxy,
  h,
  when,
  map,
  Value,
  watch,
  resolve,
} = require("mutant");
const nest = require("depnest");
const pull = require("pull-stream");

exports.needs = nest({
  "app.navigate": "first",
  "app.refresh": "first",
  "intl.sync.i18n": "first",
  "movies.sheet.edit": "first",
  "sbot.pull.stream": "first",
  "sbot.obs.connection": "first",
  "blob.sync.url": "first",
  "about.obs.color": "first",
  "message.html.markdown": "first",
});

exports.gives = nest("page.html.render");

exports.create = function (api) {
  return nest("page.html.render", function channel(path) {
    if (path !== "/movies") return;
    const i18n = api.intl.sync.i18n;
    const loading = Value(true);
    const searchSpinner = Value(false);
    const movies = MutantArray();
    const listOfMovies = MutantArray();

    /*
== Auxiliary functions ===========================================================================================================
    */

    onceTrue(api.sbot.obs.connection, (sbot) => {
      // const book = Book(sbot);

      // pull(
      //   book.pull.books({ reverse: true }, true, false),
      //   pull.drain((item) => {
      //     movies.push(item);
      //     listOfMovies.push(BookCard({
      //       book: item,
      //       onClick: () => api.app.navigate(item.key),
      //       color: api.about.obs.color,
      //       blobUrl: api.blob.sync.url,
      //     }));
      //     loading.set(false);
      //   }),
      // );

      // Get Movies!
    });

    function addNewMovie() {
      api.app.navigate("/movie-search");
    }

    function refresh() {
      api.app.refresh("/movies");
    }

    function MovieCard({ movie, blobUrl, onClick, color }) {
      const thumbnail = when(
        movie.common.image,
        h("MovieCover", {
          style: {
            "background-image": `url("${
              blobUrl(resolve(movie.common.image?.link ?? movie.common.image))
            }")`,
            "background-position": "center",
            "background-size": "contain",
            "background-repeat": "no-repeat",
          },
        }),
        h("BookCover -empty", {
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

      const b = h("MovieCard", { "ev-click": onClick }, [
        // h('div.context', [
        //   api.about.html.avatar(author, 'tiny'),
        //   h('div.name', api.about.obs.name(author)),
        //   api.message.html.timeago(blog)
        // ]),
        thumbnail,
        h("div.content", [
          h("div.text.Markdown", [
            h("h1", movie.common.title),
            h("div.authors", authors),
            when(
              movie.common.series,
              h(
                "div.series",
                `${
                  movie.common.seriesNo ? "#" + movie.common.seriesNo : "A book"
                } in '${movie.common.series}' series.`,
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
        ]),
      ]);

      return b;
    }

    /*
== mutant content ===========================================================================================================
    */

    const prepend = [
      h("PageHeading", [
        h("h1", [h("strong", i18n("Movies"))]),
        h("div.meta", [
          h("button -add", {
            "ev-click": addNewMovie,
          }, i18n("Add New Movie")),
          h("button -add", {
            "ev-click": refresh,
            "style": {
              "margin-left": "10px",
            },
          }, i18n("Refresh List")),
        ]),
      ]),
    ];

    return h("Scroller", { style: { overflow: "auto" } }, [
      h("div.wrapper", [
        h("section.prepend", prepend),
        h(
          "section.content",
          h("BookGrid", [map(listOfMovies, (i) => i)]),
        ),
        when(
          loading,
          searchSpinner ? h("Loading -large -search") : h("Loading -large"),
        ),
      ]),
    ]);
  });
};
